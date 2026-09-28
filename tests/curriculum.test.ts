import test from "node:test";
import assert from "node:assert/strict";
import { activities, publicQuestion } from "../lib/catalog";
import { generateQuestion } from "../lib/questions";
import {
  initialState,
  start,
  answer,
  next,
  updateSkill,
  type Attempt,
} from "../lib/engine";
const now = "2026-09-28T12:00:00.000Z";
for (const activity of activities)
  test(`${activity.id}: 6 levels × 200 seeds have unique options and one valid answer`, () => {
    for (let level = 1; level <= 6; level++)
      for (let seed = 1; seed <= 200; seed++) {
        const q = generateQuestion(activity.id, level, seed * 9741, `${seed}`);
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options.map((o) => o.value)).size, 4);
        assert.equal(q.options.filter((o) => o.value === q.answer).length, 1);
        assert.ok(q.prompt && q.hint && q.explanation);
        assert.ok(!("answer" in publicQuestion(q)));
        assert.ok(!("explanation" in publicQuestion(q)));
        assert.ok(!("hint" in publicQuestion(q)));
        if (q.kind === "arithmetic") {
          const [a, op, b, , c] = q.equation!.split(" ");
          const av = Number(a),
            bv = Number(b),
            ans = Number(q.answer);
          if (b === "?") assert.equal(av + ans, Number(c));
          else
            assert.equal(
              ans,
              op === "+"
                ? av + bv
                : op === "−"
                  ? av - bv
                  : op === "×"
                    ? av * bv
                    : av / bv,
            );
          assert.ok(ans >= 0 && Number.isInteger(ans));
        }
        if (q.kind === "robot") {
          const board = q.robot!;
          const reaches = (path: string) => {
            let p = board.start;
            for (const arrow of path) {
              const old = p;
              p +=
                arrow === "↑"
                  ? -board.size
                  : arrow === "↓"
                    ? board.size
                    : arrow === "←"
                      ? -1
                      : 1;
              if (
                p < 0 ||
                p >= board.size ** 2 ||
                board.obstacles.includes(p) ||
                (arrow === "←" && old % board.size === 0) ||
                (arrow === "→" && old % board.size === board.size - 1)
              )
                return false;
            }
            return p === board.target;
          };
          assert.equal(q.options.filter((o) => reaches(o.value)).length, 1);
          assert.ok(reaches(q.answer));
        }
        if (q.kind === "classify") {
          const sample = q.objects![0];
          const matches = q.options.filter((o) =>
            level <= 2
              ? o.shape!.color === sample.color
              : level <= 4
                ? o.shape!.shape === sample.shape
                : o.shape!.shape === sample.shape &&
                  o.shape!.color === sample.color,
          );
          assert.equal(matches.length, 1);
        }
      }
  });
test("every activity supplies at least three genuinely different variants at each level", () => {
  for (const activity of activities)
    for (let level = 1; level <= 6; level++) {
      const variants = new Set(
        Array.from(
          { length: 100 },
          (_, i) =>
            generateQuestion(activity.id, level, (i + 1) * 7637, String(i))
              .variant,
        ),
      );
      assert.ok(
        variants.size >= 3,
        `${activity.id} level ${level}: ${variants.size}`,
      );
    }
});
test("answer and next retries are idempotent, including incorrect answers", () => {
  const s = initialState();
  const session = start(s, "math", "session", 1234, now);
  const q = session.rounds[0].question;
  const wrong = q.options.find((o) => o.value !== q.answer)!.value;
  answer(s, "session", q.id, wrong, now, "retry-key");
  answer(s, "session", q.id, wrong, now, "retry-key");
  assert.equal(session.rounds[0].tries, 1);
  assert.equal(s.attempts.length, 0);
  answer(s, "session", q.id, q.answer, now, "second");
  answer(s, "session", q.id, q.answer, now, "second");
  assert.equal(s.attempts.length, 1);
  assert.equal(s.attempts[0].independent, false);
  next(s, "session", q.id, 9822, now);
  next(s, "session", q.id, 8822, now);
  assert.equal(session.rounds.length, 2);
});
test("a wrong answer never leaks solution before resolution, hints remove independence", () => {
  const s = initialState();
  const session = start(s, "math", "s", 1324, now);
  const round = session.rounds[0];
  round.hints = 1;
  answer(s, "s", round.question.id, round.question.answer, now, "r");
  assert.equal(s.attempts[0].independent, false);
});
test("higher stages require different days, not just repetition", () => {
  let skill = { ...initialState().skills.math, level: 3 };
  const base: Attempt = {
    id: "a",
    sessionId: "s",
    question: generateQuestion("math", 3, 1, "a"),
    answer: "1",
    correct: true,
    independent: true,
    hints: 0,
    tries: 1,
    at: now,
    elapsedMs: 1,
    adultHelp: false,
  };
  for (let i = 0; i < 8; i++)
    skill = updateSkill(skill, {
      ...base,
      question: { ...base.question, variant: String(i) },
    });
  assert.equal(skill.level, 3);
  skill = updateSkill(skill, { ...base, at: "2026-09-29T12:00:00.000Z" });
  assert.equal(skill.level, 4);
});
test("repeated identical exercises do not count as diverse evidence", () => {
  let skill = initialState().skills.math;
  const base: Attempt = {
    id: "a",
    sessionId: "s",
    question: generateQuestion("math", 1, 1, "a"),
    answer: "1",
    correct: true,
    independent: true,
    hints: 0,
    tries: 1,
    at: now,
    elapsedMs: 100,
    adultHelp: false,
  };
  for (let i = 0; i < 10; i++) skill = updateSkill(skill, base);
  assert.equal(skill.level, 1);
});
test("two supported or unsuccessful attempts reduce difficulty, no negative level", () => {
  let skill = { ...initialState().skills.math, level: 3 };
  const base: Attempt = {
    id: "a",
    sessionId: "s",
    question: generateQuestion("math", 3, 1, "a"),
    answer: "1",
    correct: false,
    independent: false,
    hints: 1,
    tries: 2,
    at: now,
    elapsedMs: 1,
    adultHelp: false,
  };
  skill = updateSkill(skill, base);
  skill = updateSkill(skill, base);
  assert.equal(skill.level, 2);
  assert.equal(skill.successes, 0);
});
test("a session ends after five rounds and cannot create extra answers", () => {
  const s = initialState();
  const session = start(s, "math", "s", 123, now);
  for (let i = 0; i < 5; i++) {
    const q = session.rounds.at(-1)!.question;
    answer(s, "s", q.id, q.answer, now, `${i}`);
    next(s, "s", q.id, 123 * i + 56, now);
  }
  assert.equal(session.completed, true);
  assert.equal(session.rounds.length, 5);
  assert.equal(s.attempts.length, 5);
});
test("time limit ends only after current task and never penalizes speed", () => {
  const s = initialState();
  const session = start(s, "math", "s", 123, now);
  const q = session.rounds[0].question;
  const later = "2026-09-28T12:20:00.000Z";
  answer(s, "s", q.id, q.answer, later, "r");
  assert.equal(s.attempts[0].independent, true);
  next(s, "s", q.id, 125, later);
  assert.equal(session.completed, true);
  assert.equal(session.rounds.length, 1);
});
