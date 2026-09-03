import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NewUserAdminNotificationEmailHTML, WelcomeUserEmailHTML } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email: rawEmail, password, shippingAddress, billingAddress, phone } = body;

    if (!name || !rawEmail || !password || !shippingAddress || !billingAddress || !phone) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (typeof name !== 'string' || typeof rawEmail !== 'string' || typeof password !== 'string' || typeof shippingAddress !== 'string' || typeof billingAddress !== 'string' || typeof phone !== 'string') {
      return NextResponse.json({ error: "Invalid input types" }, { status: 400 });
    }

    // Normalize email to prevent account duplication/confusion vulnerabilities
    const email = rawEmail.toLowerCase();

    // Input length validation to prevent DoS attacks
    if (name.length > 100 || email.length > 100 || password.length > 100) {
      return NextResponse.json({ error: "Name, email, and password must not exceed 100 characters" }, { status: 400 });
    }
    if (shippingAddress.length > 500 || billingAddress.length > 500) {
      return NextResponse.json({ error: "Addresses must not exceed 500 characters" }, { status: 400 });
    }
    if (phone.length > 50) {
      return NextResponse.json({ error: "Phone number must not exceed 50 characters" }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Password strength validation (consistent with change-password route)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isGuest: true },
    });

    // An unclaimed row is one this address opened by asking for a quote without
    // signing up (see POST /api/requests/guest). Registering the same address
    // claims it in place rather than colliding with it, so the quotes already
    // sent under it are on the new account's desk from the first sign-in. A
    // claimed account is still a collision, and still says so.
    if (existingUser && !existingUser.isGuest) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            password: hashedPassword,
            shippingAddress,
            billingAddress,
            phone,
            isGuest: false,
          },
        })
      : await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            shippingAddress,
            billingAddress,
            phone,
          },
        });

    // The phone number they registered with, as a reusable entry on the
    // composer. A claimed account may already have this exact number from the
    // quote it came in on, so it is only added when it is new.
    const existingPhone = await prisma.phoneNumber.findFirst({
      where: { userId: user.id, number: phone },
      select: { id: true },
    });
    if (!existingPhone) {
      await prisma.phoneNumber.create({
        data: {
          number: phone,
          userId: user.id,
        },
      });
    }

    // Send Email Notification. sendEmail reads Resend's reply and logs any
    // rejection; a failure here never blocks the registration.
    try {
      // Sanitize to prevent Email Header (CRLF) Injection
      const safeUserName = user.name ? user.name.replace(/[\r\n]/g, '') : "User";

      const details = {
        name: user.name,
        email: user.email,
        phone: phone,
        shippingAddress: user.shippingAddress || "N/A",
        billingAddress: user.billingAddress || "N/A",
      };

      // 1. Send notification to Admin
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `New User Registered: ${safeUserName}`,
          html: NewUserAdminNotificationEmailHTML(details),
          label: "new-user admin notification",
        });
      } else {
        console.warn("[email] ADMIN_EMAIL is not set; skipping new-user admin notification");
      }

      // 2. Send welcome email to the user
      await sendEmail({
        to: user.email,
        subject: 'Welcome to TakomoCo!',
        html: WelcomeUserEmailHTML(details),
        label: "new-user welcome",
      });
    } catch (emailError) {
      console.error("Failed to send registration email notifications:", emailError);
    }

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
