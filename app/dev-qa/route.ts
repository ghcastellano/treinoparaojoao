import { NextResponse } from "next/server";
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL)
    return new NextResponse("Not found", { status: 404 });
  const requested = Number(new URL(req.url).searchParams.get("width"));
  const width = [360, 390, 768, 1024, 1280].includes(requested)
    ? requested
    : 390;
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Responsive QA · ${width}px</title></head><body style="margin:0;background:#dce4ee;font-family:system-ui"><nav style="padding:12px;display:flex;justify-content:center;gap:20px">${[360, 390, 768, 1024, 1280].map((n) => `<a href="/dev-qa?width=${n}">${n}px</a>`).join("")}</nav><iframe title="Prévia responsiva ${width}px" src="/" style="display:block;width:${width}px;height:1100px;margin:auto;border:0;background:white"></iframe></body></html>`,
    { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } },
  );
}
