import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/[action]/route";
import { transaction } from "../lib/store";
import { sign } from "../lib/auth";
import { rm } from "node:fs/promises";
process.env.SESSION_SECRET = "integration-test-secret-more-than-32-characters";
process.env.FAMILY_PASSWORD = "integration-test-password";
process.env.ENABLE_LOCAL_STORE = "true";
process.env.HOUSEHOLD_ID = `qa-${process.pid}`;
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const base = "http://localhost:3000";
const child = () => `joao_child=${sign("child")}`;
const parent = () => `${child()}; joao_parent=${sign("parent")}`;
async function call(
  action: string,
  body?: unknown,
  cookie?: string,
  origin = base,
) {
  const req = new NextRequest(`${base}/api/${action}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await (body === undefined ? GET : POST)(req, {
    params: Promise.resolve({ action }),
  });
  return { status: res.status, data: await res.json(), res };
}
test("API lifecycle: auth -> start -> hint -> answer -> reload -> parent -> export -> pause", async () => {
  try {
    assert.equal((await call("state")).status, 401);
    assert.equal((await call("login", { password: "wrong" })).status, 401);
    const login = await call("login", {
      password: process.env.FAMILY_PASSWORD,
    });
    assert.equal(login.status, 200);
    assert.ok(login.res.headers.get("set-cookie")?.includes("HttpOnly"));
    assert.equal(
      (
        await call(
          "start",
          { activity: "math" },
          child(),
          "https://evil.example",
        )
      ).status,
      403,
    );
    assert.equal((await call("parent", undefined, child())).status, 403);
    const start = await call("start", { activity: "math" }, child());
    assert.equal(start.status, 200);
    const session = start.data;
    const round = session.rounds[0];
    assert.ok(!("answer" in round.question));
    const again = await call("start", { activity: "robot" }, child());
    assert.equal(again.data.id, session.id);
    const payload = { sessionId: session.id, questionId: round.question.id };
    await call("hint", payload, child());
    const correct = await transaction(
      (s) => s.sessions[0].rounds[0].question.answer,
    );
    const result = await call(
      "answer",
      { ...payload, value: correct, requestId: "q1" },
      child(),
    );
    assert.equal(result.status, 200);
    assert.equal(result.data.rounds[0].resolved, true);
    const reload = await call("state", undefined, child());
    assert.equal(reload.data.active.id, session.id);
    assert.equal(reload.data.active.rounds[0].resolved, true);
    await call(
      "answer",
      { ...payload, value: correct, requestId: "q1" },
      child(),
    );
    const report = await call("parent", undefined, parent());
    assert.equal(report.data.attempts.length, 1);
    assert.equal(report.data.attempts[0].independent, false);
    assert.equal(
      (await call("settings", { minutes: 8, sound: false }, child())).status,
      403,
    );
    assert.equal(
      (await call("settings", { minutes: -1, sound: false }, parent())).status,
      400,
    );
    assert.equal(
      (await call("settings", { minutes: 5, sound: false }, parent())).status,
      200,
    );
    assert.equal(
      (await call("note", { text: "Observed in QA only" }, parent())).status,
      200,
    );
    const exported = await call("export", undefined, parent());
    assert.equal(exported.data.notes.length, 1);
    assert.ok(!("loginFailures" in exported.data));
    await call("pause", { sessionId: session.id }, child());
    assert.equal((await call("state", undefined, child())).data.active, null);
    assert.equal((await call("logout", {}, child())).status, 200);
  } finally {
    await rm(`.local-data/${process.env.HOUSEHOLD_ID}.json`, { force: true });
  }
});
