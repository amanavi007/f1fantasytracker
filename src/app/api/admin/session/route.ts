import { NextResponse } from "next/server";
import { z } from "zod";

const COOKIE_NAME = "f1_admin_session";
const bodySchema = z.object({ key: z.string().min(1) });

export async function POST(request: Request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    return NextResponse.json({ error: "ADMIN_API_KEY is not configured." }, { status: 500 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.data.key !== configuredKey) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, configuredKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
