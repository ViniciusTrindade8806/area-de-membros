# E-Drive GO · Direção visual implementada

Catálogo de aprendizado em português para motoristas locatários, com linguagem de streaming. Referências em `Referencias visuais/` (layout) e `Referencias cores/` (paleta e tipografia). Logos PNG fornecidos preservados, em negativo sobre fundo escuro; roxo de marca #510787 mantido.

## Paleta (tokens em `src/app/globals.css`)
Fundo #0c0616 com glows radiais violeta e granulado leve. Superfícies #190b2e / #241040, bordas lilás translúcidas. Primário elétrico #6f00ff → #8b4ae3 em gradiente com brilho; lilás #c2a4f4 para destaques, ícones e foco; rosa #e9b3fb só para "concluído"; texto #f0e8ff, secundário #a99cc4.

## Tipografia
Inter Tight (neo-grotesca, estilo Helvetica) na interface. Barlow Condensed itálico 600/700 (`.display`) só em títulos grandes: hero, capas, numerais das aulas, cabeçalhos de página — com gradiente branco → lilás. Fontes via `next/font/google` em `layout.tsx` (`@import` remoto é descartado pelo bundler).

## Padrões
- Header fixo e transparente sobre o hero na home, ganha vidro ao rolar; nav centralizada com ponto sob o item ativo.
- Hero em carrossel de módulos (`hero-carousel.tsx`): meta-linha, título condensado, dois botões pill, indicadores em barra. Troca a cada 7s, pausa em hover/foco/aba oculta, desligada com reduced-motion; swipe no toque.
- Card largo "continue de onde parou" com play em vidro e barra de progresso com marcador.
- Swimlanes (`swimlane.tsx`) com ícone, ponto de destaque, ações à direita (abas) e toolbar de chips. Capas de módulo 4:5; pôsteres de aula 2:3 com numeral vazado.
- Botões e chips em pill; superfícies de vidro com borda translúcida.

Estados: demonstração (pill flutuante), vazio, bloqueado, concluído, processamento, erro e carregamento. Não usar estatísticas inventadas, avaliações, alunos fictícios ou conteúdo demonstrativo como publicação oficial. Movimento respeita prefers-reduced-motion.
