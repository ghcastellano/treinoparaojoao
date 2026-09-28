import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
export type Claims = { role: "child" | "parent"; exp: number; nonce: string };
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("Acesso não configurado.");
  return s;
};
export function sign(role: Claims["role"], now = Date.now()) {
  const claims: Claims = {
    role,
    exp: now + (role === "parent" ? 15 * 60_000 : 30 * 24 * 60 * 60_000),
    nonce: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret()).update(encoded).digest("base64url")}`;
}
export function verify(
  token: string | undefined,
  role: Claims["role"],
  now = Date.now(),
): boolean {
  if (!token || token.length > 1024) return false;
  try {
    const [payload, sig, ...rest] = token.split(".");
    if (!payload || !sig || rest.length) return false;
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const actual = Buffer.from(sig, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Claims;
    return data.role === role && Number.isFinite(data.exp) && data.exp > now;
  } catch {
    return false;
  }
}
export function authenticated(
  req: NextRequest,
  role: "child" | "parent" = "child",
) {
  return verify(
    req.cookies.get(role === "parent" ? "joao_parent" : "joao_child")?.value,
    role,
  );
}
export function validPassword(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 256 ||
    !process.env.FAMILY_PASSWORD
  )
    return false;
  const hash = (s: string) => createHmac("sha256", secret()).update(s).digest();
  return timingSafeEqual(hash(value), hash(process.env.FAMILY_PASSWORD));
}
export function rateKey(req: NextRequest) {
  const ip = process.env.VERCEL
    ? req.headers.get("x-vercel-forwarded-for") || "unknown"
    : "local";
  return createHmac("sha256", secret()).update(ip).digest("hex").slice(0, 24);
}
