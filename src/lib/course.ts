export type Lesson = {
  id: string;
  module: string;
  title: string;
  description: string;
  duration: number;
  position: number;
  published: boolean;
  playback_id?: string;
  asset_id?: string;
  status?: string;
  material_url?: string;
};
export type Module = {
  id: string;
  title: string;
  name: string;
  subtitle: string;
  image: string;
  color: string;
  position?: number;
};
export const modules: Module[] = [
  {
    id: "inicio",
    title: "Seu próximo destino começa aqui",
    name: "Comece por aqui",
    subtitle: "Conheça a sua jornada",
    image: "/images/inicio.jpg",
    color: "#6058a8",
  },
  {
    id: "emocional",
    title: "No controle da sua melhor versão",
    name: "Inteligência emocional",
    subtitle: "Equilíbrio dentro e fora do carro",
    image: "/images/emocional.jpg",
    color: "#5d7564",
  },
  {
    id: "financas",
    title: "Faça cada quilômetro valer mais",
    name: "Finanças na prática",
    subtitle: "Organize hoje. Vá mais longe amanhã.",
    image: "/images/financas.jpg",
    color: "#8a7155",
  },
  {
    id: "vistoria",
    title: "Cuidado que acompanha você",
    name: "Vistorias e cuidados",
    subtitle: "Seu carro pronto para a próxima corrida",
    image: "/images/vistoria.jpg",
    color: "#526e80",
  },
];
export const demoLessons: Lesson[] = modules.flatMap((m, i) =>
  [0, 1, 2].map((n) => ({
    id: `demo-${i}-${n}`,
    module: m.id,
    title: [
      [
        "Bem-vindo à sua jornada",
        "Conheça a E-Drive GO",
        "Prepare-se para começar",
      ],
      [
        "Você no controle das emoções",
        "Lidando com situações difíceis",
        "Uma rotina com mais equilíbrio",
      ],
      [
        "Entenda seus ganhos e custos",
        "Organize seu orçamento",
        "Planeje sua reserva",
      ],
      [
        "Antes de sair para rodar",
        "Sua rotina de vistoria",
        "Cuidados que fazem a diferença",
      ],
    ][i][n],
    description:
      "Espaço reservado para o treinamento da E-Drive GO. O conteúdo oficial será disponibilizado pela equipe.",
    duration: 0,
    position: i * 3 + n,
    published: true,
    status: "demo",
  })),
);
export function mergeIntervals(intervals: number[][]): number[][] {
  const sorted = intervals
    .filter(
      ([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b > a,
    )
    .sort((a, b) => a[0] - b[0]);
  const result: number[][] = [];
  for (const [a, b] of sorted) {
    const last = result.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(b, last[1]);
    else result.push([a, b]);
  }
  return result;
}
export function watchedSeconds(intervals: number[][]) {
  return mergeIntervals(intervals).reduce((sum, [a, b]) => sum + b - a, 0);
}
