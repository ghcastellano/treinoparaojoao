import {
  activities,
  type ActivityId,
  type Question,
  publicQuestion,
} from "./catalog";
import { generateQuestion } from "./questions";
export type Attempt = {
  id: string;
  sessionId: string;
  question: Question;
  answer: string;
  correct: boolean;
  independent: boolean;
  hints: number;
  tries: number;
  at: string;
  elapsedMs: number;
  adultHelp: boolean;
};
export type Skill = {
  level: number;
  successes: number;
  misses: number;
  variants: string[];
  days: string[];
  atCeiling: boolean;
};
export type Round = {
  question: Question;
  tries: number;
  hints: number;
  adultHelp: boolean;
  resolved: boolean;
  correct: boolean | null;
  selected: string | null;
  startedAt: string;
  submissionIds: string[];
};
export type Session = {
  id: string;
  activity: ActivityId;
  startedAt: string;
  endedAt: string | null;
  rounds: Round[];
  completed: boolean;
};
export type State = {
  settings: { minutes: number; sound: boolean };
  skills: Record<ActivityId, Skill>;
  sessions: Session[];
  attempts: Attempt[];
  notes: { id: string; text: string; at: string }[];
  loginFailures: Record<string, { count: number; until: number }>;
};
export function initialState(): State {
  return {
    settings: { minutes: 8, sound: true },
    skills: activities.reduce(
      (result, a) => {
        result[a.id] = {
          level: 1,
          successes: 0,
          misses: 0,
          variants: [],
          days: [],
          atCeiling: false,
        };
        return result;
      },
      {} as State["skills"],
    ),
    sessions: [],
    attempts: [],
    notes: [],
    loginFailures: {},
  };
}
export function localDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}
export function updateSkill(skill: Skill, a: Attempt): Skill {
  const s = { ...skill, variants: [...skill.variants], days: [...skill.days] };
  if (a.question.level !== s.level) return s;
  if (a.independent) {
    s.successes++;
    s.misses = 0;
    if (!s.variants.includes(a.question.variant))
      s.variants.push(a.question.variant);
    const day = localDay(a.at);
    if (!s.days.includes(day)) s.days.push(day);
  } else {
    s.misses++;
    if (s.misses >= 2) {
      return {
        ...s,
        level: Math.max(1, s.level - 1),
        successes: 0,
        misses: 0,
        variants: [],
        days: [],
        atCeiling: false,
      };
    }
  }
  const threshold = s.level <= 2 ? 3 : 4;
  if (
    s.successes >= threshold &&
    s.variants.length >= Math.min(3, threshold) &&
    (s.level <= 2 || s.days.length >= 2)
  ) {
    if (s.level === 6) return { ...s, atCeiling: true };
    return {
      ...s,
      level: s.level + 1,
      successes: 0,
      misses: 0,
      variants: [],
      days: [],
      atCeiling: false,
    };
  }
  return s;
}
export function activeSession(state: State) {
  return state.sessions.findLast((s) => !s.endedAt);
}
export function start(
  state: State,
  activity: ActivityId,
  id: string,
  seed: number,
  now: string,
) {
  const active = activeSession(state);
  if (active) return active;
  const session: Session = {
    id,
    activity,
    startedAt: now,
    endedAt: null,
    completed: false,
    rounds: [
      makeRound(activity, state.skills[activity].level, seed, `${id}:0`, now),
    ],
  };
  state.sessions.push(session);
  return session;
}
function makeRound(
  activity: ActivityId,
  level: number,
  seed: number,
  id: string,
  now: string,
): Round {
  return {
    question: generateQuestion(activity, level, seed, id),
    tries: 0,
    hints: 0,
    adultHelp: false,
    resolved: false,
    correct: null,
    selected: null,
    startedAt: now,
    submissionIds: [],
  };
}
export function answer(
  state: State,
  sessionId: string,
  questionId: string,
  value: string,
  now: string,
  requestId: string,
) {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("A aventura não foi encontrada.");
  const round = session.rounds.find((r) => r.question.id === questionId);
  if (!round) throw new Error("Esse desafio não pertence à aventura.");
  if (round.resolved || round.submissionIds.includes(requestId)) return round; // repeated request is idempotent, even after advancing
  if (session.endedAt || session.rounds.at(-1) !== round)
    throw new Error("Essa aventura já terminou.");
  if (!round.question.options.some((o) => o.value === value))
    throw new Error("Escolha uma das opções.");
  round.submissionIds.push(requestId);
  round.tries++;
  round.selected = value;
  const correct = value === round.question.answer;
  if (!correct && round.tries < 2) {
    round.correct = false;
    return round;
  }
  round.resolved = true;
  round.correct = correct;
  const attempt: Attempt = {
    id: questionId,
    sessionId,
    question: round.question,
    answer: value,
    correct,
    independent:
      correct && round.tries === 1 && round.hints === 0 && !round.adultHelp,
    hints: round.hints,
    tries: round.tries,
    at: now,
    elapsedMs: Math.max(
      0,
      new Date(now).getTime() - new Date(round.startedAt).getTime(),
    ),
    adultHelp: round.adultHelp,
  };
  state.attempts.push(attempt);
  state.skills[session.activity] = updateSkill(
    state.skills[session.activity],
    attempt,
  );
  return round;
}
export function next(
  state: State,
  sessionId: string,
  questionId: string,
  seed: number,
  now: string,
) {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("A aventura não foi encontrada.");
  const current = session.rounds.at(-1)!;
  if (session.endedAt || current.question.id !== questionId) return session; // retry must not create extra rounds
  if (!current.resolved)
    throw new Error("Termine o desafio ou faça uma pausa.");
  const timeUp =
    new Date(now).getTime() - new Date(session.startedAt).getTime() >=
    state.settings.minutes * 60_000;
  if (session.rounds.length >= 5 || timeUp) {
    session.endedAt = now;
    session.completed = true;
    return session;
  }
  session.rounds.push(
    makeRound(
      session.activity,
      state.skills[session.activity].level,
      seed,
      `${sessionId}:${session.rounds.length}`,
      now,
    ),
  );
  return session;
}
export function safeSession(session: Session) {
  return {
    ...session,
    rounds: session.rounds.map((r) => ({
      ...r,
      question: publicQuestion(r.question),
      hint: r.hints ? r.question.hint : undefined,
      explanation: r.resolved ? r.question.explanation : undefined,
      solution: r.resolved ? r.question.answer : undefined,
    })),
  };
}
export function childView(state: State) {
  const session = activeSession(state);
  return {
    settings: state.settings,
    active: session ? safeSession(session) : null,
    completed: state.sessions.filter((s) => s.completed).length,
  };
}
