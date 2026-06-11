import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");
    const registrationType = body.registrationType;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    if (registrationType !== "self" && registrationType !== "guardian") {
      return NextResponse.json(
        { error: "Invalid registration type." },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const role = registrationType === "guardian" ? "guardian" : "player";

    const account = await prisma.account.create({
      data: {
        email,
        password_hash: hashPassword(password),
        role,
      },
    });

    return NextResponse.json({
      accountId: account.id,
      registrationType,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
