"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Volume2,
  VolumeX,
  Lightbulb,
  Pause,
  Play,
  LockKeyhole,
  ChevronRight,
  Check,
  Heart,
  Download,
  Home,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Hand,
  Sun,
} from "lucide-react";
import {
  activities,
  activityById,
  levelNames,
  type ActivityId,
  type Shape,
  type PublicQuestion,
} from "@/lib/catalog";
import type { safeSession, childView, State, Attempt } from "@/lib/engine";
type Session = ReturnType<typeof safeSession>;
type Child = ReturnType<typeof childView> & { local?: boolean };
type Parent = {
  settings: State["settings"];
  skills: State["skills"];
  sessions: Session[];
  attempts: Attempt[];
  notes: State["notes"];
};
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
async function api<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${action}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  }).catch(() => { throw new ApiError("A conexão demorou ou foi interrompida. Tente novamente; o que já foi salvo está guardado.", 0); });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error || "Não foi possível continuar.",
      response.status,
      data.code,
    );
  return data;
}
async function childState(): Promise<Child> {
  try {
    return await api<Child>("state");
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    await api("login", {});
    return api<Child>("state");
  }
}
function speech(text: string, enabled = true) {
  if (
    !enabled ||
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  )
    return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.85;
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.startsWith("pt-BR"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
function Grid({ cells, size = 3 }: { cells: number[]; size?: number }) {
  return (
    <span
      className="piece-grid"
      style={{ gridTemplateColumns: `repeat(${size},1fr)` }}
      aria-hidden="true"
    >
      {cells.map((v, i) => (
        <span className={v ? "filled" : ""} key={i} />
      ))}
    </span>
  );
}
function ShapePiece({ piece }: { piece: Shape }) {
  return (
    <span
      aria-hidden="true"
      className={`shape ${piece.shape} ${piece.color}`}
    />
  );
}
function QuestionArt({ q, hinted }: { q: PublicQuestion; hinted: boolean }) {
  if (q.kind === "arithmetic")
    return (
      <div className="math-art">
        <div className="equation" aria-label={q.narration}>
          {q.equation?.split(" ").map((x, i) => (
            <span
              key={i}
              className={
                x === "?" ? "mystery" : /[+−×÷=]/.test(x) ? "operator" : ""
              }
            >
              {x}
            </span>
          ))}
        </div>
        {q.groups && (q.level <= 2 || hinted) && (
          <div className="groups">
            {q.groups.map((g, i) => (
              <div className="object-group" key={i}>
                <span className="object-label">{g.label}</span>
                <div className="objects" aria-label={`${g.count} ${g.label}`}>
                  {g.count <= 20 ? (
                    Array.from({ length: g.count }, (_, j) => (
                      <span aria-hidden="true" key={j}>
                        {g.icon}
                      </span>
                    ))
                  ) : (
                    <span className="bundle">
                      {g.icon} × {g.count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  if (q.kind === "pattern")
    return (
      <div
        className="train"
        aria-label={`Sequência: ${q.sequence?.join(", ")}`}
      >
        {q.sequence?.map((v, i) => (
          <span className="wagon" key={i}>
            {v}
          </span>
        ))}
        <span className="wagon missing">?</span>
      </div>
    );
  if (q.kind === "grid")
    return (
      <div className="shape-example">
        <Grid cells={q.grid!} size={q.gridSize} />
        {q.level > 2 && (
          <span className="transform-label">
            {q.level <= 4 ? "↔ Espelho" : "↻ Um quarto de volta"}
          </span>
        )}
      </div>
    );
  if (q.kind === "robot" && q.robot)
    return (
      <div
        className="robot-grid"
        style={{ gridTemplateColumns: `repeat(${q.robot.size},1fr)` }}
        aria-label="Tabuleiro do robô"
      >
        {Array.from({ length: q.robot.size * q.robot.size }, (_, i) => (
          <span
            key={i}
            className={q.robot!.obstacles.includes(i) ? "obstacle" : ""}
          >
            {i === q.robot!.start ? (
              "🤖"
            ) : i === q.robot!.target ? (
              "⭐"
            ) : q.robot!.obstacles.includes(i) ? (
              "🪨"
            ) : (
              <span className="grid-dot" />
            )}
          </span>
        ))}
      </div>
    );
  return (
    <div className="shape-family">
      {q.objects?.map((piece, i) => (
        <div className="shape-tile" key={i}>
          <ShapePiece piece={piece} />
        </div>
      ))}
    </div>
  );
}
export default function Adventure() {
  const [data, setData] = useState<Child | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<
    | "loading"
    | "retry"
    | "home"
    | "play"
    | "done"
    | "parent"
    | "setup"
  >("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [parent, setParent] = useState<Parent | null>(null);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");
  const lock = useRef(false);
  const focusRef = useRef<HTMLHeadingElement>(null);
  async function load() {
    try {
      const d = await childState();
      setData(d);
      setSound(d.settings.sound);
      setSession(d.active);
      setView(d.active ? "play" : "home");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.code === "CONFIG_REQUIRED")) {
        setView(e.status === 401 ? "retry" : "setup");
      } else {
        setError((e as Error).message);
        setView("retry");
      }
    }
  }
  useEffect(() => {
    let cancelled = false;
    childState()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setSound(d.settings.sound);
        setSession(d.active);
        setView(d.active ? "play" : "home");
      })
      .catch((e) => {
        if (cancelled) return;
        setView(e instanceof ApiError && e.code === "CONFIG_REQUIRED" ? "setup" : "retry");
        if (!(e instanceof ApiError) || (e.status !== 401 && e.code !== "CONFIG_REQUIRED")) setError(e.message);
      });
    return () => {
      cancelled = true;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    if (!session || view !== "play") return;
    const update = () => setElapsed(Date.now() - Date.parse(session.startedAt));
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [session, view]);
  useEffect(() => {
    focusRef.current?.focus();
  }, [view, session?.rounds.length]);
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 401) setView("retry");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function begin(activity: ActivityId) {
    speech("Vamos brincar!", sound);
    await run(async () => {
      const s = await api<Session>("start", { activity });
      setSession(s);
      setView("play");
      setPaused(false);
    });
  }
  async function action(
    name: "answer" | "hint" | "help" | "next",
    value?: string,
  ) {
    if (!session) return;
    const round = session.rounds.at(-1)!;
    await run(async () => {
      const s = await api<Session>(name, {
        sessionId: session.id,
        questionId: round.question.id,
        ...(value !== undefined
          ? { value, requestId: `${round.question.id}:${round.tries}:${value}` }
          : {}),
      });
      setSession(s);
      if (s.endedAt) {
        setView("done");
        speech(
          "Foi bom explorar com você. Agora, vamos brincar fora da tela?",
          sound,
        );
      } else if (name === "answer") {
        const r = s.rounds.at(-1)!;
        speech(
          r.resolved
            ? r.explanation || ""
            : "Vamos olhar com calma. Você pode tentar outra vez.",
          sound,
        );
      } else if (name === "hint") speech(s.rounds.at(-1)!.hint || "", sound);
    });
  }
  async function finish() {
    if (!session) return;
    await run(async () => {
      await api("pause", { sessionId: session.id });
      setPaused(false);
      setView("done");
      speech("Até a próxima aventura!", sound);
    });
  }
  async function showParent() {
    await run(async () => {
      try {
        const p = await api<Parent>("parent");
        setParent(p);
        setView("parent");
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 403) throw e;
        await api("login", { parent: true });
        setParent(await api<Parent>("parent"));
        setView("parent");
      }
    });
  }
  async function childHome() {
    await run(async () => {
      await api("lock-parent", {});
      setParent(null);
      await load();
    });
  }
  function download() {
    if (!parent) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            application: "Mundo do João",
            exportedAt: new Date().toISOString(),
            notice:
              "Registro educativo. Não é avaliação psicológica ou diagnóstico.",
            ...parent,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `joao-descobertas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const round = session?.rounds.at(-1);
  const activity = session ? activityById(session.activity) : null;
  const narration = round?.question.narration;
  const questionId = round?.question.id;
  useEffect(() => {
    if (view === "play" && narration) speech(narration, sound);
  }, [questionId, narration, sound, view]);
  const timeUp = elapsed >= (data?.settings.minutes || 8) * 60_000;
  const activeView = view === "play" || view === "done";
  return (
    <div className={`app ${activeView ? "in-game" : ""}`}>
      <a className="skip" href="#main">
        Pular para o conteúdo
      </a>
      <header className="header" inert={paused}>
        <button
          className="brand"
          onClick={() => void (view === "parent" ? childHome() : run(load))}
          aria-label="Mundo do João, início"
          disabled={busy || view === "loading"}
        >
          <span className="brand-mark">
            <Sparkles size={25} />
          </span>
          <span>
            Mundo do <strong>João</strong>
            <small>UMA DESCOBERTA DE CADA VEZ</small>
          </span>
        </button>
        <div className="header-actions">
          {data && (
            <button
              className="icon-button"
              aria-label={sound ? "Desligar voz" : "Ligar voz"}
              onClick={() => {
                setSound(!sound);
                if (sound && "speechSynthesis" in window)
                  window.speechSynthesis.cancel();
              }}
            >
              {sound ? <Volume2 /> : <VolumeX />}
            </button>
          )}
          {data && view !== "parent" && (
            <button
              className="parent-link"
              aria-label="Responsáveis"
              onClick={() => void showParent()}
              disabled={busy}
            >
              <LockKeyhole size={16} />
              <span>Responsáveis</span>
            </button>
          )}
          {view === "parent" && (
            <button className="parent-link" onClick={() => void childHome()}>
              <Home size={18} />
              Voltar a brincar
            </button>
          )}
        </div>
      </header>
      {data?.local && (
        <div className="dev-banner">
          Prévia de desenvolvimento · histórico local · Neon ainda não conectado
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}
      <main id="main" inert={paused}>
        {view === "loading" && (
          <div className="center">
            <div className="loader" />
            <p>Preparando as descobertas…</p>
          </div>
        )}
        {(view === "setup" || view === "retry") && (
          <div className="center">
            <section className="panel login-panel">
              <span className="big-icon">🌱</span>
              <h1>{view === "setup" ? "A aventura está sendo preparada" : "Vamos tentar novamente?"}</h1>
              <p>
                {view === "setup"
                  ? "O banco de dados precisa ser conectado antes de começar."
                  : "Não foi possível carregar as descobertas. Tente novamente."}
              </p>
              <button className="primary" onClick={() => void run(load)}>
                <RefreshCw size={18} />
                Verificar novamente
              </button>
            </section>
          </div>
        )}
        {view === "home" && (
          <div className="home-content">
            <section className="welcome">
              <div>
                <p className="eyebrow">
                  <Sun size={16} /> HOJE É DIA DE DESCOBRIR
                </p>
                <h1 ref={focusRef} tabIndex={-1}>
                  Oi, João!
                  <br />
                  <span>Onde vamos brincar?</span>
                </h1>
                <p>Escolha uma aventura. A curiosidade vai junto.</p>
                <button
                  className="listen-home"
                  onClick={() =>
                    speech(
                      "Oi, João! Onde vamos brincar? Toque no foguete para brincar com contas, na maçã para o mercadinho, ou escolha outra aventura.",
                      sound,
                    )
                  }
                >
                  <Volume2 size={20} />
                  Ouvir
                </button>
              </div>
              <div className="welcome-sticker" aria-hidden="true">
                <span className="orbit-label">VAMOS EXPLORAR!</span>
                <span className="hero-emoji">🚀</span>
                <span className="sticker-star one">✦</span>
                <span className="sticker-star two">✧</span>
                <span className="sticker-number">2 + 3</span>
              </div>
            </section>
            <div className="section-top">
              <h2>Suas aventuras</h2>
              <span>
                <Heart size={15} />
                Sem pressa
              </span>
            </div>
            <section className="activity-grid" aria-label="Brincadeiras">
              {activities.map((a, i) => (
                <button
                  key={a.id}
                  className={`activity-card ${a.color} ${i === 0 ? "featured" : ""}`}
                  onClick={() => void begin(a.id)}
                  disabled={busy}
                  aria-label={`Brincar: ${a.title}`}
                >
                  <span className="card-emoji" aria-hidden="true">
                    {a.emoji}
                  </span>
                  <span className="card-text">
                    {i === 0 && (
                      <span className="card-tag">
                        SOMAR, DIMINUIR E DESCOBRIR
                      </span>
                    )}
                    <strong>{a.title}</strong>
                    <span>{a.subtitle}</span>
                  </span>
                  <span className="card-arrow">
                    <ChevronRight />
                  </span>
                  {i === 0 && (
                    <span className="card-doodles" aria-hidden="true">
                      ＋ − ＝
                    </span>
                  )}
                </button>
              ))}
            </section>
            <div className="outside-note">
              <span aria-hidden="true">🌿</span>
              <p>
                Também existe um mundo de descobertas lá fora.
                <br />
                <strong>Uma aventura curtinha já é uma boa brincadeira.</strong>
              </p>
            </div>
          </div>
        )}
        {view === "play" && session && round && activity && (
          <div className="game-content">
            <div className="game-top">
              <button className="soft-button" onClick={() => setPaused(true)}>
                <Pause size={19} />
                <span>Pausa</span>
              </button>
              <span className="game-name">
                {activity.emoji} {activity.title}
              </span>
              <div
                className="round-dots"
                aria-label={`Descoberta ${session.rounds.length} de 5`}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    className={i < session.rounds.length ? "active" : ""}
                    key={i}
                  />
                ))}
              </div>
            </div>
            <section className={`game-panel ${activity.color}`}>
              <div className="game-instruction">
                <h1 ref={focusRef} tabIndex={-1}>
                  {round.question.prompt}
                </h1>
                <button
                  className="listen-button"
                  aria-label="Ouvir o desafio"
                  onClick={() => speech(round.question.narration, sound)}
                >
                  <Volume2 size={25} />
                </button>
              </div>
              <QuestionArt q={round.question} hinted={round.hints > 0} />
              {round.hints > 0 && !round.resolved && (
                <div className="hint" role="status">
                  <Lightbulb size={21} />
                  <span>{round.hint}</span>
                </div>
              )}
              <div
                className={`answer-options ${round.question.kind === "grid" ? "grid-options" : ""} ${round.question.kind === "robot" ? "path-options" : ""}`}
                aria-label="Escolha uma resposta"
              >
                {round.question.options.map((o) => (
                  <button
                    className={`answer ${round.resolved && o.value === round.solution ? "correct" : ""} ${!round.resolved && round.selected === o.value && round.correct === false ? "tried" : ""}`}
                    key={o.value}
                    onClick={() => void action("answer", o.value)}
                    disabled={busy || round.resolved}
                    aria-label={o.label}
                  >
                    {o.grid ? (
                      <Grid cells={o.grid} size={round.question.gridSize} />
                    ) : o.shape ? (
                      <ShapePiece piece={o.shape} />
                    ) : (
                      <span>{o.symbol || o.label}</span>
                    )}
                    {round.resolved && o.value === round.solution && (
                      <Check className="answer-check" size={20} />
                    )}
                  </button>
                ))}
              </div>
              <div className="feedback" aria-live="polite">
                {round.resolved ? (
                  <>
                    <p
                      className={round.correct ? "success-text" : "learn-text"}
                    >
                      {round.correct
                        ? "Você descobriu!"
                        : "Vamos descobrir juntos."}
                    </p>
                    <p>{round.explanation}</p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void action("next")}
                    >
                      {session.rounds.length >= 5 || timeUp
                        ? "Guardar a aventura"
                        : "Próxima descoberta"}
                      <ArrowRight size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <p>
                      {round.correct === false
                        ? "Vamos olhar de outro jeito? Tente outra vez ou peça uma pista."
                        : "Toque na sua escolha."}
                    </p>
                    <button
                      className="hint-button"
                      onClick={() => void action("hint")}
                      disabled={busy || round.hints > 0}
                    >
                      <Lightbulb size={20} />
                      {round.hints ? "Pista aberta" : "Quero uma pista"}
                    </button>
                  </>
                )}
              </div>
            </section>
            <div className="game-bottom">
              <button
                className="text-button"
                disabled={busy || round.adultHelp || round.resolved}
                onClick={() => void action("help")}
              >
                <Hand size={17} />
                {round.adultHelp
                  ? "Estamos pensando juntos"
                  : "Um adulto está ajudando"}
              </button>
              <span>
                <ShieldCheck size={15} />
                {busy ? "Guardando…" : "Cada descoberta fica guardada"}
              </span>
            </div>
            {timeUp && !round.resolved && (
              <div className="time-note">
                Quando quiser, podemos fazer uma pausa.{" "}
                <button onClick={() => setPaused(true)}>Pausar</button>
              </div>
            )}
          </div>
        )}
        {view === "done" && activity && (
          <div className="center">
            <section className="panel done-panel">
              <div className="done-illustration" aria-hidden="true">
                🌟
              </div>
              <p className="eyebrow">ATÉ A PRÓXIMA DESCOBERTA</p>
              <h1 ref={focusRef} tabIndex={-1}>
                Foi bom brincar com você!
              </h1>
              <p>Sua aventura ficou guardada.</p>
              <div className="offline-card">
                <span aria-hidden="true">🌿</span>
                <div>
                  <h2>Agora, uma ideia lá fora</h2>
                  <p>{activity.offline}</p>
                </div>
              </div>
              <button
                className="primary"
                onClick={() =>
                  void run(async () => {
                    setSession(null);
                    await load();
                  })
                }
              >
                Voltar ao meu mundo
                <Home size={20} />
              </button>
            </section>
          </div>
        )}
        {view === "parent" && parent && (
          <div className="parent-content">
            <div className="parent-title">
              <div>
                <p className="eyebrow">ÁREA DOS RESPONSÁVEIS</p>
                <h1>As descobertas do João</h1>
                <p>
                  Observe estratégias, interesses e aprendizagens ao longo do
                  tempo.
                </p>
              </div>
              <button className="soft-button" onClick={download}>
                <Download size={18} />
                Exportar histórico
              </button>
            </div>
            <div className="educational-notice">
              <ShieldCheck size={22} />
              <p>
                <strong>
                  Um registro de aprendizagem, não um diagnóstico.
                </strong>{" "}
                As atividades são originais e educativas. Os estágios são regras
                do aplicativo, sem validação psicométrica. Não representam QI,
                percentil ou comparação por idade.
              </p>
            </div>
            <div className="stats">
              <div>
                <span>Aventuras concluídas</span>
                <strong>
                  {parent.sessions.filter((s) => s.completed).length}
                </strong>
              </div>
              <div>
                <span>Desafios explorados</span>
                <strong>{parent.attempts.length}</strong>
              </div>
              <div>
                <span>Respostas independentes</span>
                <strong>
                  {parent.attempts.filter((a) => a.independent).length}
                </strong>
              </div>
            </div>
            <section className="parent-section">
              <h2>Cada habilidade tem seu caminho</h2>
              <p>
                Acerto sem pista e sem ajuda é registrado separadamente. A
                partir do terceiro estágio, o avanço pede evidências em dias
                diferentes. O tempo de resposta não determina o estágio.
              </p>
              <div className="skill-list">
                {activities.map((a) => {
                  const skill = parent.skills[a.id];
                  const attempts = parent.attempts.filter(
                    (x) => x.question.activity === a.id,
                  );
                  return (
                    <div className="skill-row" key={a.id}>
                      <span className="skill-emoji">{a.emoji}</span>
                      <div className="skill-info">
                        <strong>{a.title}</strong>
                        <span>{a.skill}</span>
                      </div>
                      <div className="skill-stage">
                        <strong>{levelNames[skill.level - 1]}</strong>
                        <span>
                          {attempts.filter((x) => x.independent).length}{" "}
                          independentes ·{" "}
                          {attempts.filter((x) => !x.independent).length} com
                          apoio ou tentativas
                        </span>
                        {skill.atCeiling && (
                          <span>
                            Conteúdo atual explorado: oferecer novos desafios.
                          </span>
                        )}
                      </div>
                      <div
                        className="level-track"
                        aria-label={`Estágio educativo ${skill.level} de 6`}
                      >
                        {[1, 2, 3, 4, 5, 6].map((v) => (
                          <i
                            key={v}
                            className={v <= skill.level ? "filled" : ""}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="parent-columns">
              <section className="parent-section">
                <h2>O ritmo da brincadeira</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    void run(async () => {
                      await api("settings", {
                        minutes: Number(form.get("minutes")),
                        sound: form.get("sound") === "on",
                      });
                      setParent(await api<Parent>("parent"));
                      setSaved("Preferências salvas.");
                    });
                  }}
                >
                  <label htmlFor="minutes">Convite para pausar após</label>
                  <select
                    id="minutes"
                    name="minutes"
                    defaultValue={parent.settings.minutes}
                  >
                    {[3, 5, 8, 10, 12, 15].map((n) => (
                      <option key={n} value={n}>
                        {n} minutos
                      </option>
                    ))}
                  </select>
                  <label className="checkbox">
                    <input
                      name="sound"
                      type="checkbox"
                      defaultChecked={parent.settings.sound}
                    />
                    Começar com voz habilitada
                  </label>
                  <p className="small">
                    A aventura também termina após cinco descobertas. João pode
                    parar a qualquer momento. A duração é uma escolha prática,
                    não uma prescrição.
                  </p>
                  <button className="primary" disabled={busy}>
                    Salvar preferências
                    <Check size={17} />
                  </button>
                </form>
              </section>
              <section className="parent-section">
                <h2>O que você percebeu?</h2>
                <p>
                  Exemplo: “Fez a conta de outro jeito” ou “Hoje estava
                  cansado”. Não é preciso registrar informações sensíveis.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api("note", { text: note });
                      setNote("");
                      setParent(await api<Parent>("parent"));
                      setSaved("Observação salva.");
                    });
                  }}
                >
                  <label htmlFor="note">Observação da família</label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1500}
                    required
                    rows={3}
                  />
                  <button
                    className="soft-button"
                    disabled={busy || !note.trim()}
                  >
                    Guardar observação
                  </button>
                </form>
              </section>
            </div>
            {saved && (
              <p className="saved" role="status">
                {saved}
              </p>
            )}
            <section className="parent-section">
              <h2>Últimas descobertas</h2>
              {parent.attempts.length === 0 ? (
                <p>
                  Quando João começar a brincar, as descobertas aparecerão aqui.
                  Nenhuma comparação com outras crianças será feita.
                </p>
              ) : (
                <div className="history-list">
                  {parent.attempts
                    .slice(-12)
                    .reverse()
                    .map((a) => (
                      <article key={a.id}>
                        <span className="history-icon">
                          {activityById(a.question.activity).emoji}
                        </span>
                        <div>
                          <strong>
                            {activityById(a.question.activity).title}
                          </strong>
                          <p>{a.question.equation || a.question.prompt}</p>
                          <small>
                            {new Date(a.at).toLocaleString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                            })}
                          </small>
                        </div>
                        <span
                          className={`attempt-badge ${a.independent ? "independent" : ""}`}
                        >
                          {a.independent
                            ? "Sem ajuda"
                            : a.correct
                              ? "Com apoio ou nova tentativa"
                              : "Explorou a explicação"}
                        </span>
                      </article>
                    ))}
                </div>
              )}
            </section>
            {parent.notes.length > 0 && (
              <section className="parent-section">
                <h2>Observações</h2>
                {parent.notes
                  .slice(-10)
                  .reverse()
                  .map((n) => (
                    <blockquote key={n.id}>
                      <p>{n.text}</p>
                      <small>
                        {new Date(n.at).toLocaleDateString("pt-BR")}
                      </small>
                    </blockquote>
                  ))}
              </section>
            )}
            <section className="parent-section research">
              <h2>Por que foi feito assim?</h2>
              <p>
                A proposta combina progressão matemática, brincadeira guiada e
                observação em situações variadas. O aplicativo não foi estudado
                clinicamente e não promete aumentar inteligência. Uma facilidade
                em matemática pode orientar o enriquecimento, mas não confirma
                superdotação.
              </p>
              <p>
                Brinquem juntos em alguns momentos e levem as ideias para
                blocos, histórias e situações do cotidiano. Se desejarem
                investigar altas habilidades, compartilhem o histórico com a
                escola e um profissional qualificado.
              </p>
              <a
                href="https://ies.ed.gov/ncee/wwc/practiceguide/18"
                target="_blank"
                rel="noreferrer"
              >
                IES · Ensino de matemática para crianças pequenas ↗
              </a>
              <a
                href="https://doi.org/10.1111/cdev.13730"
                target="_blank"
                rel="noreferrer"
              >
                Skene et al. · Brincadeira guiada, revisão de 2022 ↗
              </a>
              <a
                href="https://www.nagc.org/assessments-and-tests"
                target="_blank"
                rel="noreferrer"
              >
                NAGC · Avaliação e múltiplas fontes de informação ↗
              </a>
              <p className="small">
                Pensado inicialmente para 4 anos e 9 meses. A interface
                acompanha essa fase; os desafios acompanham as evidências de
                aprendizagem. Não use o aplicativo para treinar itens de testes
                psicológicos.
              </p>
            </section>
          </div>
        )}
      </main>
      {paused && (
        <div className="modal-backdrop">
          <section
            className="pause-dialog"
            role="dialog"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setPaused(false);
                return;
              }
              if (e.key === "Tab") {
                const buttons =
                  e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  );
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
            aria-labelledby="pause-title"
          >
            <span aria-hidden="true">🌤️</span>
            <h2 id="pause-title">Uma pausa faz bem.</h2>
            <p>Você escolhe. Podemos continuar ou guardar por hoje.</p>
            <button
              className="primary"
              onClick={() => setPaused(false)}
              autoFocus
            >
              <Play size={19} />
              Continuar brincando
            </button>
            <button
              className="soft-button"
              onClick={() => void finish()}
              disabled={busy}
            >
              Guardar por hoje
              <Check size={19} />
            </button>
          </section>
        </div>
      )}
      <footer className="footer" inert={paused}>
        <span>Feito para descobrir. Com tempo para ser criança.</span>
        <span>✦ Mundo do João</span>
      </footer>
    </div>
  );
}
