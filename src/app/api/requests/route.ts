import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import { addDays, format } from "date-fns";
import { sendEmail } from "@/lib/email";
import { NewRequestEmailHTML } from "@/lib/email-templates";
import { validateCustomSettings, summarizeSettings, CustomPrintSettings } from "@/lib/print-settings";
import { modelMimeType, referenceMimeType } from "@/lib/file-signatures";
import {
  MAX_DESCRIPTION_CHARS,
  MAX_DIMENSIONS_CHARS,
  MAX_MODEL_BYTES,
  MAX_PART_NAME_CHARS,
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_FILES,
  MIN_DESCRIPTION_CHARS,
  SUBMISSION_DESCRIPTION,
  isReferenceFileName,
  parseSubmissionType,
} from "@/lib/part-source";
import {
  DEFAULT_QUOTE_STATUS,
  DEFAULT_REQUEST_STATUS,
  KIND_QUOTE,
  KIND_REQUEST,
} from "@/lib/request-status";
import {
  FREE_SAMPLE_MATERIAL,
  FREE_SAMPLE_PRICE_LABEL,
  FREE_SAMPLE_QUANTITY,
  isFreeSampleRequested,
} from "@/lib/free-sample";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const submissionType = parseSubmissionType(formData.get("submissionType") as string | null);
    const isDescriptionRequest = submissionType === SUBMISSION_DESCRIPTION;
    const partNameRaw = formData.get("partName") as string | null;
    const partDescriptionRaw = formData.get("partDescription") as string | null;
    const dimensionsRaw = formData.get("dimensions") as string | null;
    // Reference photos/sketches/drawings — only meaningful without a model.
    const referenceFiles = isDescriptionRequest
      ? (formData.getAll("references").filter((v) => typeof v !== "string") as File[])
      : [];
    const quantityStr = formData.get("quantity") as string | null;
    const notes = formData.get("notes") as string | null;
    const material = formData.get("material") as string | null;
    const dateNeededStr = formData.get("dateNeeded") as string | null;
    let phoneNumberString = formData.get("phoneNumber") as string | null;
    const requestedUserId = formData.get("userId") as string | null;
    const printSettingsRaw = formData.get("printSettings") as string | null;
    const quoteRequestedRaw = formData.get("quoteRequested") as string | null;
    const isFreeSampleRaw = formData.get("isFreeSample") as string | null;

    if (
      (quantityStr !== null && typeof quantityStr !== "string") ||
      (notes !== null && typeof notes !== "string") ||
      (material !== null && typeof material !== "string") ||
      (dateNeededStr !== null && typeof dateNeededStr !== "string") ||
      (phoneNumberString !== null && typeof phoneNumberString !== "string") ||
      (requestedUserId !== null && typeof requestedUserId !== "string") ||
      (printSettingsRaw !== null && typeof printSettingsRaw !== "string") ||
      (quoteRequestedRaw !== null && typeof quoteRequestedRaw !== "string") ||
      (isFreeSampleRaw !== null && typeof isFreeSampleRaw !== "string") ||
      (partNameRaw !== null && typeof partNameRaw !== "string") ||
      (partDescriptionRaw !== null && typeof partDescriptionRaw !== "string") ||
      (dimensionsRaw !== null && typeof dimensionsRaw !== "string")
    ) {
      return NextResponse.json({ error: "Invalid input types" }, { status: 400 });
    }

    // The composer's "Make this my free sample" checkbox. Eligibility is
    // enforced further down, once we know which account this request belongs
    // to — this only reads what the client asked for.
    const isFreeSample = isFreeSampleRequested(isFreeSampleRaw);

    // The composer's "Quote" checkbox. Absent or anything falsy means a normal
    // build request. A described part has nothing to price until we have drawn
    // it, so those are always quoted first no matter what the client sent — the
    // composer ticks and locks the box to match. A free sample skips quoting
    // too, since there is nothing to price, but a described free sample still
    // needs modelling first, so that rule wins over the sample.
    const quoteRequested =
      isDescriptionRequest ||
      (!isFreeSample &&
        (quoteRequestedRaw === "true" || quoteRequestedRaw === "1" || quoteRequestedRaw === "on"));

    // Optional custom slicer settings; absent/empty means AUTO.
    let customSettings: CustomPrintSettings | null = null;
    if (printSettingsRaw) {
      if (printSettingsRaw.length > 5000) {
        return NextResponse.json({ error: "Print settings payload too large" }, { status: 400 });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(printSettingsRaw);
      } catch {
        return NextResponse.json({ error: "Invalid print settings" }, { status: 400 });
      }
      const result = validateCustomSettings(parsed);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      customSettings = result.settings;
    }

    const quantity = quantityStr ? parseInt(quantityStr, 10) : 1;

    // A free sample overrides quantity and material outright (below), so
    // whatever the client sent for either is moot — validating it here would
    // only reject a stale value the composer never meant to submit.
    if (!isFreeSample && (isNaN(quantity) || quantity < 1 || quantity > 10000)) {
      return NextResponse.json({ error: "Invalid quantity provided" }, { status: 400 });
    }

    if (notes && notes.length > 2000) {
       return NextResponse.json({ error: "Notes exceed maximum allowed length" }, { status: 400 });
    }

    if (!isFreeSample && material && material.length > 100) {
      return NextResponse.json({ error: "Material name exceeds maximum allowed length" }, { status: 400 });
    }

    // ---- What is being made -------------------------------------------------
    // Either an uploaded model (the original path) or, for a customer with no
    // 3D file, a written description plus optional reference photos. Both are
    // validated here; nothing is uploaded until every check has passed.

    // MODEL: the .stl/.zip and its validated bytes.
    let modelBuffer: Buffer | null = null;
    let modelMime: string | null = null;

    // DESCRIPTION: the written submission and its reference files.
    let partName: string | null = null;
    let partDescription: string | null = null;
    let dimensions: string | null = null;
    const referenceUploads: { fileName: string; mimeType: string; buffer: Buffer }[] = [];

    if (!isDescriptionRequest) {
      if (!file) {
        return NextResponse.json({ error: "STL or ZIP file is required" }, { status: 400 });
      }

      if (typeof file === "string" || !file.name) {
        return NextResponse.json({ error: "Invalid file uploaded" }, { status: 400 });
      }

      if (file.name.length > 255) {
        return NextResponse.json({ error: "File name exceeds maximum allowed length" }, { status: 400 });
      }

      if (!file.name.toLowerCase().endsWith(".stl") && !file.name.toLowerCase().endsWith(".zip")) {
        return NextResponse.json({ error: "Only .STL and .ZIP files are allowed" }, { status: 400 });
      }

      if (file.size > MAX_MODEL_BYTES) {
        return NextResponse.json({ error: "File size exceeds the 20MB limit" }, { status: 400 });
      }

      // The extension is only a claim; the leading bytes have to back it up.
      modelBuffer = Buffer.from(await file.arrayBuffer());
      modelMime = modelMimeType(file.name, modelBuffer);
      if (!modelMime) {
        return NextResponse.json({ error: "File content does not match its extension" }, { status: 400 });
      }
    } else {
      partName = (partNameRaw || "").trim();
      partDescription = (partDescriptionRaw || "").trim();
      dimensions = (dimensionsRaw || "").trim() || null;

      if (!partName) {
        return NextResponse.json({ error: "Part name is required" }, { status: 400 });
      }
      if (partName.length > MAX_PART_NAME_CHARS) {
        return NextResponse.json(
          { error: `Part name must be ${MAX_PART_NAME_CHARS} characters or fewer` },
          { status: 400 }
        );
      }
      if (partDescription.length < MIN_DESCRIPTION_CHARS) {
        return NextResponse.json(
          { error: `Part description must be at least ${MIN_DESCRIPTION_CHARS} characters` },
          { status: 400 }
        );
      }
      if (partDescription.length > MAX_DESCRIPTION_CHARS) {
        return NextResponse.json(
          { error: `Part description must be ${MAX_DESCRIPTION_CHARS} characters or fewer` },
          { status: 400 }
        );
      }
      if (dimensions && dimensions.length > MAX_DIMENSIONS_CHARS) {
        return NextResponse.json(
          { error: `Approximate size must be ${MAX_DIMENSIONS_CHARS} characters or fewer` },
          { status: 400 }
        );
      }

      if (referenceFiles.length > MAX_REFERENCE_FILES) {
        return NextResponse.json(
          { error: `Attach at most ${MAX_REFERENCE_FILES} reference files` },
          { status: 400 }
        );
      }

      for (const reference of referenceFiles) {
        if (!reference.name) {
          return NextResponse.json({ error: "Invalid reference file uploaded" }, { status: 400 });
        }
        if (reference.name.length > 255) {
          return NextResponse.json(
            { error: "Reference file name exceeds maximum allowed length" },
            { status: 400 }
          );
        }
        if (!isReferenceFileName(reference.name)) {
          return NextResponse.json(
            { error: "Reference files must be JPG, PNG, WEBP, GIF, HEIC, or PDF" },
            { status: 400 }
          );
        }
        if (reference.size > MAX_REFERENCE_BYTES) {
          return NextResponse.json(
            { error: "Reference file size exceeds the 10MB limit" },
            { status: 400 }
          );
        }
        const referenceBuffer = Buffer.from(await reference.arrayBuffer());
        const mimeType = referenceMimeType(reference.name, referenceBuffer);
        if (!mimeType) {
          return NextResponse.json(
            { error: "Reference file content does not match its extension" },
            { status: 400 }
          );
        }
        referenceUploads.push({ fileName: reference.name, mimeType, buffer: referenceBuffer });
      }
    }

    if (!dateNeededStr) {
      return NextResponse.json({ error: "Date needed is required" }, { status: 400 });
    }

    if (!phoneNumberString) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (phoneNumberString.length > 50) {
      return NextResponse.json({ error: "Phone number exceeds maximum length" }, { status: 400 });
    }

    const dateNeeded = new Date(dateNeededStr);
    if (isNaN(dateNeeded.getTime())) {
      return NextResponse.json({ error: "Invalid date provided" }, { status: 400 });
    }

    const minDate = addDays(new Date(), 3);

    // reset time part for comparison
    dateNeeded.setHours(0, 0, 0, 0);
    minDate.setHours(0, 0, 0, 0);

    if (dateNeeded < minDate) {
      return NextResponse.json({ error: "Lead time must be at least 3 days" }, { status: 400 });
    }

    // Handle Target User
    const isAdmin = (session.user as any).isAdmin;
    let targetUserId = (session.user as any).id;
    let targetUserEmail = session.user?.email || "N/A";
    let targetUserName = session.user?.name || "Customer";

    if (isAdmin && requestedUserId) {
      const requestedUser = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true, email: true, name: true }
      });
      if (requestedUser) {
        targetUserId = requestedUser.id;
        targetUserEmail = requestedUser.email;
        targetUserName = requestedUser.name || "Customer";
      }
    }

    // A first-time customer gets exactly one free PLA 2.0 sample. The client
    // hides the option once it has been used; this is what actually enforces
    // it. "Already claimed" is checked per account, not "has ever ordered" —
    // so someone who ordered before this program existed can still claim one.
    if (isFreeSample) {
      const priorSample = await prisma.partRequest.count({
        where: { userId: targetUserId, isFreeSample: true },
      });
      if (priorSample > 0) {
        return NextResponse.json(
          { error: "You've already claimed your free PLA 2.0 sample." },
          { status: 400 }
        );
      }
    }

    // What actually gets stored and billed. A free sample overrides whatever
    // the client sent for material and quantity.
    const finalMaterial = isFreeSample ? FREE_SAMPLE_MATERIAL : material;
    const finalQuantity = isFreeSample ? FREE_SAMPLE_QUANTITY : quantity;

    // Handle Phone Number
    let phoneNumberRecord = await prisma.phoneNumber.findFirst({
      where: { userId: targetUserId, number: phoneNumberString }
    });

    if (!phoneNumberRecord) {
      phoneNumberRecord = await prisma.phoneNumber.create({
        data: {
          userId: targetUserId,
          number: phoneNumberString
        }
      });
    }

    let fileId: string | null = null;
    const storedReferences: { fileId: string; fileName: string; mimeType: string; size: number }[] = [];

    try {
      if (modelBuffer && modelMime && file) {
        fileId = (await uploadToR2(file.name, modelMime, modelBuffer)) || null;
        if (!fileId) {
          return NextResponse.json({ error: "Error uploading to Cloudflare R2" }, { status: 500 });
        }
      }

      for (const reference of referenceUploads) {
        const referenceId = await uploadToR2(reference.fileName, reference.mimeType, reference.buffer);
        if (!referenceId) {
          return NextResponse.json({ error: "Error uploading to Cloudflare R2" }, { status: 500 });
        }
        storedReferences.push({
          fileId: referenceId,
          fileName: reference.fileName,
          mimeType: reference.mimeType,
          size: reference.buffer.length,
        });
      }
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Error uploading to Cloudflare R2. Ensure the Admin has setup credentials properly." }, { status: 500 });
    }

    // A quote goes onto the quote track and starts at "QUOTE REQUESTED"; a
    // plain build request keeps the original queue and starts at "PENDING".
    // The two vocabularies never mix — see src/lib/request-status.ts.
    const kind = quoteRequested ? KIND_QUOTE : KIND_REQUEST;
    const initialStatus = quoteRequested ? DEFAULT_QUOTE_STATUS : DEFAULT_REQUEST_STATUS;

    // Create Part Request
    const partRequest = await prisma.partRequest.create({
      data: {
        userId: targetUserId,
        phoneNumberId: phoneNumberRecord.id,
        submissionType,
        fileId,
        fileName: file && !isDescriptionRequest ? file.name : null,
        partName,
        partDescription,
        dimensions,
        quantity: finalQuantity,
        material: finalMaterial,
        notes,
        printSettings: customSettings ? JSON.stringify(customSettings) : null,
        quoteRequested,
        isFreeSample,
        quotedPrice: isFreeSample ? FREE_SAMPLE_PRICE_LABEL : undefined,
        kind,
        status: initialStatus,
        dateNeeded,
        ...(storedReferences.length > 0 ? { attachments: { create: storedReferences } } : {}),
      },
      include: { attachments: true },
    });

    // Send Email Notification. sendEmail reads Resend's reply and logs any
    // rejection; a failure here never blocks the request that was just created.
    try {
      const title = (file && !isDescriptionRequest ? file.name : partName) || "Untitled part";
      // Sanitize to prevent Email Header (CRLF) Injection
      const safeTitle = title.replace(/[\r\n]/g, '');
      const subjectPrefix = isFreeSample ? "[Free sample] " : "";
      await sendEmail({
        to: process.env.ADMIN_EMAIL || (session.user as any).email, // Send to admin or fall back to user
        subject: isDescriptionRequest
          ? `${subjectPrefix}New Request (no model): ${safeTitle}`
          : `${subjectPrefix}New Request: ${safeTitle}`,
        html: NewRequestEmailHTML({
          customerName: targetUserName,
          customerEmail: targetUserEmail,
          fileName: title,
          submissionType,
          partDescription: partDescription || undefined,
          dimensions: dimensions || undefined,
          referenceCount: storedReferences.length,
          quantity: finalQuantity,
          material: finalMaterial || "Not specified",
          dateNeeded: format(dateNeeded, "PPP"),
          notes: notes || undefined,
          printSettings: summarizeSettings(customSettings),
          quoteRequested,
          isFreeSample,
        }),
        label: "new-request admin notification",
      });
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // We don't return an error here because the request was successfully created in the DB
    }

    return NextResponse.json(partRequest, { status: 201 });
  } catch (error) {
    console.error("Failed to create request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).isAdmin;

    const startDateParam = req.nextUrl.searchParams.get("startDate");
    const endDateParam = req.nextUrl.searchParams.get("endDate");

    const limitParam = req.nextUrl.searchParams.get("limit");
    let limit = 50; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100);
      }
    }

    let dateFilter: any = {};
    if (startDateParam && endDateParam) {
      const gteDate = new Date(`${startDateParam}T00:00:00.000Z`);
      const lteDate = new Date(`${endDateParam}T23:59:59.999Z`);

      if (isNaN(gteDate.getTime()) || isNaN(lteDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format provided" }, { status: 400 });
      }

      dateFilter = {
        createdAt: {
          gte: gteDate,
          lte: lteDate,
        }
      };
    }

    let requests;

    if (isAdmin) {
      // Admin can see all requests
      requests = await prisma.partRequest.findMany({
        where: {
          ...dateFilter,
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          phoneNumber: true,
          attachments: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Ensure normal users can ONLY see their own requests
      requests = await prisma.partRequest.findMany({
        where: {
          userId,
          ...dateFilter,
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          phoneNumber: true,
          attachments: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json(requests);

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
