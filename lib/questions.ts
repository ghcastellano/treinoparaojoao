import {
  type ActivityId,
  type Question,
  type Option,
  type Shape,
} from "./catalog";
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function generateQuestion(
  activity: ActivityId,
  level: number,
  seed: number,
  id: string,
): Question {
  const random = seeded(seed);
  const int = (a: number, b: number) => a + Math.floor(random() * (b - a + 1));
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const numeric = (answer: number): Option[] => {
    const pool = new Set([answer]);
    for (let d = 1; pool.size < 4; d++) {
      pool.add(answer + d);
      if (answer - d >= 0 && pool.size < 4) pool.add(answer - d);
    }
    return shuffle([...pool]).map((v) => ({
      value: String(v),
      label: String(v),
    }));
  };
  const q: Question = {
    id,
    activity,
    level,
    variant: "",
    prompt: "",
    narration: "",
    options: [],
    kind: "arithmetic",
    hint: "",
    explanation: "",
    answer: "",
  };
  if (activity === "math" || activity === "market" || activity === "boxes") {
    const max = [5, 10, 20, 50, 100, 200][level - 1];
    let a = int(level > 2 ? Math.floor(max / 3) : 1, max),
      b = int(1, Math.max(2, Math.floor(max / 2)));
    let op = random() < 0.5 ? "+" : "−";
    let answer = 0;
    if (activity === "boxes") {
      answer = b;
      q.equation = `${a} + ? = ${a + b}`;
      q.prompt = `Há ${a + b} estrelas. Você vê ${a}. Quantas estão na caixa?`;
      q.hint = `Comece em ${a} e conte até ${a + b}. Quantas faltam?`;
      q.explanation = `${a} mais ${b} formam ${a + b}. A caixa tem ${b}.`;
      q.variant = `missing:${a}:${b}`;
      q.groups = [
        { count: a, label: "Aqui fora", icon: "⭐" },
        { count: a + b, label: "Ao todo", icon: "⭐" },
      ];
    } else {
      if (level === 6 && activity === "math") op = random() < 0.5 ? "×" : "÷";
      if (op === "−" && b > a) [a, b] = [b, a];
      if (op === "×") {
        a = int(2, 5);
        b = int(2, 6);
        answer = a * b;
      } else if (op === "÷") {
        b = int(2, 5);
        answer = int(2, 6);
        a = b * answer;
      } else answer = op === "+" ? a + b : a - b;
      q.equation = `${a} ${op} ${b} = ?`;
      q.variant = `${op}:${a}:${b}`;
      q.prompt =
        op === "+"
          ? "Vamos juntar?"
          : op === "−"
            ? "Quanto fica?"
            : op === "×"
              ? "Quantos em grupos iguais?"
              : "Vamos dividir igualmente?";
      q.narration =
        op === "+"
          ? `Quanto é ${a} mais ${b}?`
          : op === "−"
            ? `Quanto é ${a} menos ${b}?`
            : op === "×"
              ? `${a} grupos com ${b} em cada. Quantos ao todo?`
              : `${a} estrelas divididas igualmente entre ${b} amigos. Quantas para cada um?`;
      if (activity === "market") {
        q.prompt =
          op === "+"
            ? `A cesta tinha ${a} maçãs. Chegaram ${b}. Quantas agora?`
            : `A cesta tinha ${a} maçãs. Saíram ${b}. Quantas ficaram?`;
        q.narration = q.prompt;
      }
      q.hint =
        op === "+"
          ? `Separe ${a} e ${b}. Junte os dois grupos e conte. Você também pode completar uma dezena.`
          : op === "−"
            ? `Comece com ${a} e retire ${b}. Conte o que sobrou.`
            : op === "×"
              ? `Faça ${a} grupos com ${b} estrelas. Some os grupos.`
              : `Distribua as ${a} estrelas, uma por vez, para ${b} amigos.`;
      q.explanation = `${a} ${op === "+" ? "mais" : op === "−" ? "menos" : op === "×" ? "vezes" : "dividido por"} ${b} é ${answer}.`;
      q.groups = [
        {
          count: a,
          label:
            op === "×"
              ? "Grupos"
              : op === "÷"
                ? "Para repartir"
                : "Primeiro grupo",
          icon: activity === "market" ? "🍎" : "⭐",
        },
        {
          count: b,
          label:
            op === "−"
              ? "Retirar"
              : op === "×"
                ? "Em cada grupo"
                : op === "÷"
                  ? "Amigos"
                  : "Segundo grupo",
          icon: activity === "market" ? "🍎" : "⭐",
        },
      ];
    }
    q.answer = String(answer);
    q.options = numeric(answer);
  } else if (activity === "patterns") {
    q.kind = "pattern";
    let seq: string[], answer: string;
    if (level <= 3) {
      const symbols = shuffle(["●", "▲", "■", "★"]);
      const unit =
        level === 1
          ? [symbols[0], symbols[1]]
          : level === 2
            ? [symbols[0], symbols[0], symbols[1]]
            : [symbols[0], symbols[1], symbols[2]];
      const length = level === 1 ? 5 : level === 2 ? 7 : 8;
      seq = Array.from({ length }, (_, i) => unit[i % unit.length]);
      answer = unit[length % unit.length];
      q.options = shuffle(symbols).map((x) => ({
        value: x,
        label: (
          {
            "●": "Círculo",
            "▲": "Triângulo",
            "■": "Quadrado",
            "★": "Estrela",
          } as Record<string, string>
        )[x],
        symbol: x,
      }));
      q.hint = `Observe o pedacinho que se repete: ${unit.join(" ")}.`;
      q.explanation = `A regra repete ${unit.join(" ")}. Depois vem ${answer}.`;
      q.variant = `repeat:${unit.join("")}`;
    } else {
      const start = int(1, 8);
      const step = int(2, level === 4 ? 5 : 9);
      const values =
        level === 6
          ? [start, start + 2, start + 5, start + 9, start + 14]
          : Array.from({ length: 5 }, (_, i) => start + i * step);
      seq = values.map(String);
      answer = String(level === 6 ? start + 20 : start + 5 * step);
      q.options = numeric(Number(answer));
      q.hint =
        level === 6
          ? "Veja quanto aumenta a cada vez: 2, 3, 4, 5…"
          : "Compare dois vizinhos. Quanto foi acrescentado?";
      q.explanation =
        level === 6
          ? `Os saltos são 2, 3, 4, 5 e 6. Agora vem ${answer}.`
          : `Cada número aumenta ${step}. Agora vem ${answer}.`;
      q.variant = `numeric:${start}:${step}:${level}`;
    }
    q.sequence = seq;
    q.answer = answer;
    q.prompt = "Qual vagão vem depois?";
  } else if (activity === "shapes") {
    q.kind = "grid";
    const size = level <= 2 ? 2 : 3;
    q.gridSize = size;
    const base = Array.from({ length: size * size }, () =>
      random() < 0.5 ? 1 : 0,
    );
    base[0] = 1;
    base[base.length - 1] = 0;
    const reflect = (g: number[]) =>
      g.map((_, i) => g[Math.floor(i / size) * size + (size - 1 - (i % size))]);
    const rotate = (g: number[]) =>
      g.map((_, i) => g[(size - 1 - (i % size)) * size + Math.floor(i / size)]);
    const target =
      level <= 2 ? base : level <= 4 ? reflect(base) : rotate(base);
    const grids = [target];
    let guard = 0;
    while (grids.length < 4 && guard++ < 100) {
      const next = [...target];
      const at = int(0, next.length - 1);
      next[at] = 1 - next[at];
      if (!grids.some((g) => g.join("") === next.join(""))) grids.push(next);
    }
    q.grid = base;
    q.answer = target.join("");
    q.options = shuffle(grids).map((grid, i) => ({
      value: grid.join(""),
      label: `Construção ${i + 1}`,
      grid,
    }));
    q.prompt =
      level <= 2
        ? "Qual construção é igual?"
        : level <= 4
          ? "Como fica no espelho?"
          : "Gire para a direita. Como fica?";
    q.hint =
      level <= 2
        ? "Compare as peças, uma linha de cada vez."
        : level <= 4
          ? "No espelho, o lado esquerdo vira o direito."
          : "Imagine um quarto de volta para a direita. A linha de cima vira a coluna da direita.";
    q.explanation =
      level <= 2
        ? "As peças ocupam os mesmos lugares."
        : level <= 4
          ? "As linhas continuam na mesma altura e os lados se trocam."
          : "Giramos um quarto de volta para a direita.";
    q.variant = `grid:${level}:${base.join("")}`;
  } else if (activity === "robot") {
    q.kind = "robot";
    const size = level <= 2 ? 3 : 4;
    const start = int(0, size * size - 1);
    const candidates = Array.from({ length: size * size }, (_, i) => i).filter(
      (i) => {
        const d =
          Math.abs((i % size) - (start % size)) +
          Math.abs(Math.floor(i / size) - Math.floor(start / size));
        return d >= 1 && d <= (level <= 2 ? 2 : level <= 4 ? 4 : 6);
      },
    );
    const target = candidates[int(0, candidates.length - 1)];
    const obstacles: number[] = [];
    if (level >= 5) {
      const available = Array.from({ length: size * size }, (_, i) => i).filter(
        (i) => i !== start && i !== target,
      );
      obstacles.push(available[int(0, available.length - 1)]);
    }
    const moves = [
      ["↑", -size],
      ["↓", size],
      ["←", -1],
      ["→", 1],
    ] as const;
    const step = (pos: number, symbol: string) => {
      const move = moves.find((m) => m[0] === symbol)!;
      const next = pos + move[1];
      if (
        next < 0 ||
        next >= size * size ||
        obstacles.includes(next) ||
        (symbol === "←" && pos % size === 0) ||
        (symbol === "→" && pos % size === size - 1)
      )
        return -1;
      return next;
    };
    const queue: { pos: number; path: string }[] = [{ pos: start, path: "" }];
    const visited = new Set([start]);
    let shortest = "";
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.pos === target) {
        shortest = cur.path;
        break;
      }
      for (const [symbol] of moves) {
        const next = step(cur.pos, symbol);
        if (next >= 0 && !visited.has(next)) {
          visited.add(next);
          queue.push({ pos: next, path: cur.path + symbol });
        }
      }
    }
    const reaches = (path: string) => {
      let pos = start;
      for (const symbol of path) {
        pos = step(pos, symbol);
        if (pos < 0) return false;
      }
      return pos === target;
    };
    const paths = new Set([shortest]);
    while (paths.size < 4) {
      const candidate = Array.from(
        { length: Math.max(1, shortest.length + int(-1, 1)) },
        () => moves[int(0, 3)][0],
      ).join("");
      if (!reaches(candidate)) paths.add(candidate);
    }
    q.robot = { size, start, target, obstacles };
    q.answer = shortest;
    q.options = shuffle([...paths]).map((v, i) => ({
      value: v,
      label: `Caminho ${i + 1}`,
      symbol: v,
    }));
    q.prompt = "Qual caminho leva à estrela?";
    q.hint =
      "Comece no robô. Siga uma seta por vez com o dedo. Evite as pedras.";
    q.explanation =
      "Cada seta move uma casa. Este caminho chega à estrela sem passar por uma pedra.";
    q.variant = `robot:${start}:${target}:${obstacles.join(",")}`;
  } else {
    q.kind = "classify";
    const shapes: Shape["shape"][] = ["circle", "square", "triangle"];
    const colors: Shape["color"][] = ["red", "blue", "yellow"];
    const sh = shapes[int(0, 2)],
      co = colors[int(0, 2)];
    const rule = level <= 2 ? "color" : level <= 4 ? "shape" : "both";
    q.objects = Array.from({ length: 3 }, (_, i) => ({
      shape: rule === "color" ? shapes[i] : sh,
      color: rule === "shape" ? colors[i] : co,
      size: "large",
    }));
    const correct: Shape = {
      shape: rule === "color" ? shapes[int(0, 2)] : sh,
      color: co,
      size: "large",
    };
    const variants: Shape[] = [
      correct,
      ...colors
        .filter((c) => c !== co)
        .map((c) => ({ shape: sh, color: c, size: "large" as const })),
      { shape: shapes.find((s) => s !== sh)!, color: co, size: "large" },
    ];
    if (rule === "color")
      variants[3] = {
        shape: shapes.find((s) => s !== sh)!,
        color: colors.find((c) => c !== co)!,
        size: "large",
      };
    if (rule === "shape") {
      variants[1].shape = shapes.find((s) => s !== sh)!;
      variants[2].shape = shapes.find((s) => s !== sh)!;
    }
    const names = {
      circle: "círculo",
      square: "quadrado",
      triangle: "triângulo",
      red: "vermelho",
      blue: "azul",
      yellow: "amarelo",
    };
    q.answer = "match";
    q.options = shuffle(
      variants.map((shape, i) => ({
        value: i === 0 ? "match" : `other-${i}`,
        label: `${names[shape.shape]} ${names[shape.color]}`,
        shape,
      })),
    );
    q.prompt =
      rule === "color"
        ? "Encontre outra peça da mesma cor."
        : rule === "shape"
          ? "Encontre outra peça da mesma forma."
          : "Encontre a mesma forma e a mesma cor.";
    q.hint =
      rule === "color"
        ? "Olhe só para a cor. A forma pode mudar."
        : rule === "shape"
          ? "Olhe só para a forma. A cor pode mudar."
          : "Confira duas coisas: forma e cor.";
    q.explanation =
      "Você encontrou uma peça que segue a regra. Agora invente outra regra com um adulto!";
    q.variant = `classify:${rule}:${sh}:${co}`;
  }
  q.narration = q.narration || q.prompt;
  return q;
}
