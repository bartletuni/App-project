import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { NewUserAdminNotificationEmailHTML, WelcomeUserEmailHTML } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, shippingAddress, billingAddress, phone } = body;

    if (!name || !email || !password || !shippingAddress || !billingAddress || !phone) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
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
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        shippingAddress,
        billingAddress,
        phone,
      },
    });

    // Automatically create a default PhoneNumber record for the user based on the one they registered with
    await prisma.phoneNumber.create({
      data: {
        number: phone,
        userId: user.id,
      },
    });

    // Send Email Notification
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);

        // Sanitize to prevent Email Header (CRLF) Injection
        const safeUserName = user.name ? user.name.replace(/[\r\n]/g, '') : "User";

        // 1. Send notification to Admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          await resend.emails.send({
            from: 'TakomoCo <onboarding@resend.dev>',
            to: adminEmail,
            subject: `New User Registered: ${safeUserName}`,
            html: NewUserAdminNotificationEmailHTML({
              name: user.name,
              email: user.email,
              phone: phone,
              shippingAddress: user.shippingAddress || "N/A",
              billingAddress: user.billingAddress || "N/A",
            }),
          });
        }

        // 2. Send welcome email to the user
        await resend.emails.send({
          from: 'TakomoCo <onboarding@resend.dev>',
          to: user.email,
          subject: 'Welcome to TakomoCo!',
          html: WelcomeUserEmailHTML({
            name: user.name,
            email: user.email,
            phone: phone,
            shippingAddress: user.shippingAddress || "N/A",
            billingAddress: user.billingAddress || "N/A",
          }),
        });
      }
    } catch (emailError) {
      console.error("Failed to send registration email notifications:", emailError);
    }

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
