export const activities = [
  {
    id: "math",
    title: "Foguete das contas",
    short: "Contas",
    emoji: "🚀",
    color: "orange",
    subtitle: "Juntar, tirar e ir além",
    skill: "Operações e relações numéricas",
    offline:
      "Com blocos ou tampinhas, inventem duas maneiras de formar a mesma quantidade.",
  },
  {
    id: "market",
    title: "Mercadinho",
    short: "Mercadinho",
    emoji: "🍎",
    color: "green",
    subtitle: "Uma cesta de descobertas",
    skill: "Quantidades em situações do cotidiano",
    offline:
      "Montem um mercadinho com brinquedos. Escolham quantidades e descubram quanto falta.",
  },
  {
    id: "boxes",
    title: "Caixas misteriosas",
    short: "Caixas",
    emoji: "🎁",
    color: "purple",
    subtitle: "O que está escondido?",
    skill: "Relações entre partes e todo",
    offline:
      "Esconda algumas tampinhas sob um copo. Contem o total antes e descubram quantas ficaram escondidas.",
  },
  {
    id: "patterns",
    title: "Trenzinho dos padrões",
    short: "Padrões",
    emoji: "🚂",
    color: "blue",
    subtitle: "Descubra o que vem depois",
    skill: "Regularidades e sequências",
    offline:
      "Criem uma sequência de palmas e batidas de pés. Depois troquem quem inventa a regra.",
  },
  {
    id: "shapes",
    title: "Oficina de formas",
    short: "Formas",
    emoji: "🧩",
    color: "pink",
    subtitle: "Peças que viram ideias",
    skill: "Composição e raciocínio espacial",
    offline:
      "Usem blocos para copiar uma construção. Depois inventem outra com as mesmas peças.",
  },
  {
    id: "robot",
    title: "Caminho do robô",
    short: "Robô",
    emoji: "🤖",
    color: "teal",
    subtitle: "Pense no caminho",
    skill: "Planejamento de sequências",
    offline:
      "Coloquem um brinquedo no chão e inventem comandos para chegar até ele sem esbarrar nos obstáculos.",
  },
  {
    id: "lab",
    title: "Laboratório curioso",
    short: "Laboratório",
    emoji: "🔎",
    color: "yellow",
    subtitle: "Encontre uma nova ideia",
    skill: "Classificação e flexibilidade",
    offline:
      "Separem brinquedos de um jeito. Depois encontrem outra regra. João pode criar um desafio para você.",
  },
] as const;
export type ActivityId = (typeof activities)[number]["id"];
export const activityById = (id: ActivityId) =>
  activities.find((a) => a.id === id)!;
export const isActivity = (id: unknown): id is ActivityId =>
  activities.some((a) => a.id === id);
export const levelNames = [
  "Explorar",
  "Descobrir",
  "Conectar",
  "Investigar",
  "Criar caminhos",
  "Ir além",
];
export type Shape = {
  shape: "circle" | "square" | "triangle";
  color: "red" | "blue" | "yellow";
  size?: "small" | "large";
};
export type Option = {
  value: string;
  label: string;
  symbol?: string;
  shape?: Shape;
  grid?: number[];
};
export type Question = {
  id: string;
  activity: ActivityId;
  level: number;
  variant: string;
  prompt: string;
  narration: string;
  options: Option[];
  kind: "arithmetic" | "pattern" | "grid" | "robot" | "classify";
  equation?: string;
  groups?: { count: number; label: string; icon: string }[];
  sequence?: string[];
  grid?: number[];
  gridSize?: number;
  robot?: { size: number; start: number; target: number; obstacles: number[] };
  objects?: Shape[];
  hint: string;
  explanation: string;
  answer: string;
};
export type PublicQuestion = Omit<Question, "answer" | "hint" | "explanation">;
export function publicQuestion(q: Question): PublicQuestion {
  const {
    answer: _answer,
    hint: _hint,
    explanation: _explanation,
    ...safe
  } = q;
  void _answer;
  void _hint;
  void _explanation;
  return safe;
}
