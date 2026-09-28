import { NextResponse } from "next/server";
import { sign } from "@/lib/auth";
import { localMode } from "@/lib/store";
export async function GET(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.VERCEL ||
    !localMode()
  )
    return new NextResponse("Not found", { status: 404 });
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set("joao_child", sign("child"), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  res.cookies.set("joao_parent", sign("parent"), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  return res;
}
