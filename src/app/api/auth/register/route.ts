import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, shippingAddress, billingAddress, phone } = body;

    if (!email || !password || !shippingAddress || !billingAddress || !phone) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
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

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
