import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomInt } from "node:crypto";
import { authenticated, sign, validPassword, rateKey } from "@/lib/auth";
import { configured, transaction, localMode } from "@/lib/store";
import {
  start,
  answer,
  next,
  safeSession,
  childView,
  activeSession,
} from "@/lib/engine";
import { isActivity } from "@/lib/catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (action === "health")
    return response({
      ready: configured(),
      storage:
        localMode() && !process.env.DATABASE_URL ? "local-development" : "neon",
    });
  if (!configured())
    return response(
      { error: "A configuração privada ainda não foi concluída.", code: "CONFIG_REQUIRED" },
      503,
    );
  if (!authenticated(req))
    return response({ error: "Entre com o acesso da família." }, 401);
  try {
    if (action === "state")
      return response(
        await transaction((s) => ({
          ...childView(s),
          local: localMode() && !process.env.DATABASE_URL,
        })),
      );
    if (action === "parent" || action === "export") {
      if (!authenticated(req, "parent"))
        return response({ error: "Confirme o acesso de responsável." }, 403);
      return response(
        await transaction((s) => ({
          settings: s.settings,
          skills: s.skills,
          sessions: s.sessions.map(safeSession),
          attempts: s.attempts,
          notes: s.notes,
        })),
      );
    }
    return response({ error: "Não encontrado." }, 404);
  } catch (e) {
    console.error("read_failure", e instanceof Error ? e.name : "Error");
    return response(
      { error: "Não foi possível carregar. Tente novamente." },
      503,
    );
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const origin = req.headers.get("origin");
  let sameOrigin = false;
  try {
    const parsed = new URL(origin || "");
    sameOrigin =
      parsed.host === (req.headers.get("host") || req.nextUrl.host) &&
      parsed.protocol ===
        (process.env.VERCEL ? "https:" : req.nextUrl.protocol);
  } catch {}
  if (!sameOrigin) return response({ error: "Origem inválida." }, 403);
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    return response({ error: "Formato inválido." }, 415);
  if (!configured())
    return response(
      { error: "A configuração privada ainda não foi concluída.", code: "CONFIG_REQUIRED" },
      503,
    );
  let b: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 5000)
      return response({ error: "Pedido muito grande." }, 413);
    b = JSON.parse(text);
    if (!b || Array.isArray(b) || typeof b !== "object") throw new Error();
  } catch {
    return response({ error: "Pedido inválido." }, 400);
  }
  try {
    if (action === "login") {
      const key = rateKey(req),
        now = Date.now();
      const allowed = await transaction((s) => {
        for (const [k, v] of Object.entries(s.loginFailures)) {
          if (v.until < now) delete s.loginFailures[k];
        }
        const r = s.loginFailures[key] || {
          count: 0,
          until: now + 15 * 60_000,
        };
        if (r.count >= 10) return false;
        r.count++;
        s.loginFailures[key] = r;
        return true;
      });
      if (!allowed)
        return response(
          { error: "Muitas tentativas. Aguarde 15 minutos." },
          429,
        );
      if (!validPassword(b.password))
        return response(
          { error: "A senha não confere. Tente novamente." },
          401,
        );
      await transaction((s) => {
        delete s.loginFailures[key];
      });
      const res = response({ ok: true });
      const opts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
      };
      res.cookies.set("joao_child", sign("child"), {
        ...opts,
        maxAge: 30 * 24 * 3600,
      });
      res.cookies.set("joao_parent", sign("parent"), { ...opts, maxAge: 900 });
      return res;
    }
    if (!authenticated(req))
      return response({ error: "Entre com o acesso da família." }, 401);
    if (action === "logout") {
      const res = response({ ok: true });
      res.cookies.set("joao_child", "", { maxAge: 0, path: "/" });
      res.cookies.set("joao_parent", "", { maxAge: 0, path: "/" });
      return res;
    }
    if (action === "lock-parent") {
      const res = response({ ok: true });
      res.cookies.set("joao_parent", "", { maxAge: 0, path: "/" });
      return res;
    }
    if (action === "settings" || action === "note") {
      if (!authenticated(req, "parent"))
        return response({ error: "Confirme o acesso de responsável." }, 403);
      if (action === "settings") {
        if (
          !Number.isInteger(b.minutes) ||
          Number(b.minutes) < 3 ||
          Number(b.minutes) > 15 ||
          typeof b.sound !== "boolean"
        )
          return response({ error: "Escolha entre 3 e 15 minutos." }, 400);
        await transaction((s) => {
          s.settings = {
            minutes: Number(b.minutes),
            sound: b.sound as boolean,
          };
        });
        return response({ ok: true });
      }
      if (
        typeof b.text !== "string" ||
        b.text.trim().length < 1 ||
        b.text.length > 1500
      )
        return response(
          { error: "Escreva uma observação de até 1500 caracteres." },
          400,
        );
      const note = {
        id: randomUUID(),
        text: b.text.trim(),
        at: new Date().toISOString(),
      };
      await transaction((s) => {
        s.notes.push(note);
      });
      return response({ ok: true });
    }
    const now = new Date().toISOString(),
      seed = randomInt(1, 2147483647),
      id = randomUUID();
    if (action === "start") {
      if (!isActivity(b.activity))
        return response({ error: "Escolha uma brincadeira." }, 400);
      const activity = b.activity;
      return response(
        await transaction((s) =>
          safeSession(start(s, activity, id, seed, now)),
        ),
      );
    }
    if (typeof b.sessionId !== "string")
      return response({ error: "Aventura inválida." }, 400);
    const sessionId = b.sessionId;
    if (action === "pause") {
      return response(
        await transaction((s) => {
          const session = s.sessions.find((x) => x.id === sessionId);
          if (session && !session.endedAt) {
            session.endedAt = now;
          }
          return { ok: true };
        }),
      );
    }
    if (typeof b.questionId !== "string")
      return response({ error: "Desafio inválido." }, 400);
    const questionId = b.questionId;
    if (action === "answer") {
      if (
        typeof b.value !== "string" ||
        b.value.length > 100 ||
        typeof b.requestId !== "string" ||
        b.requestId.length > 250
      )
        return response({ error: "Resposta inválida." }, 400);
      const value = b.value;
      const requestId = b.requestId as string;
      return response(
        await transaction((s) => {
          answer(s, sessionId, questionId, value, now, requestId);
          return safeSession(s.sessions.find((x) => x.id === sessionId)!);
        }),
      );
    }
    if (action === "next")
      return response(
        await transaction((s) =>
          safeSession(next(s, sessionId, questionId, seed, now)),
        ),
      );
    if (action === "hint" || action === "help")
      return response(
        await transaction((s) => {
          const session = activeSession(s);
          if (!session || session.id !== sessionId)
            throw new Error("Aventura inválida.");
          const round = session.rounds.at(-1)!;
          if (round.question.id !== questionId)
            throw new Error("Desafio inválido.");
          if (!round.resolved) {
            if (action === "hint") round.hints = 1;
            else round.adultHelp = true;
          }
          return safeSession(session);
        }),
      );
    return response({ error: "Não encontrado." }, 404);
  } catch (e) {
    console.error("write_failure", e instanceof Error ? e.name : "Error");
    return response(
      {
        error:
          "Não foi possível salvar. Sua tela foi mantida; tente novamente.",
      },
      503,
    );
  }
}
