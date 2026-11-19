# E-Drive GO · Jornada

Área de membros para clientes locatários, com catálogo em swimlanes horizontais, capas verticais 4:5, aulas sequenciais, administração de conteúdo e convites. Next.js + Supabase + Mux.

## Abrir localmente

```sh
npm install
npm run dev
```

Abra http://localhost:3000. Sem configuração Supabase, a aplicação abre uma demonstração explicitamente identificada. Os 12 títulos são ilustrativos, sem vídeos ou progresso fictício. A prévia de administração não salva nem envia convites.

## Ativar a plataforma real

1. Copie `.env.example` para `.env.local` e preencha as variáveis. Não exponha chaves de serviço em variáveis `NEXT_PUBLIC_*`.
2. Crie o projeto Supabase e execute `supabase/migrations/001_platform.sql` e `002_modules_storage.sql`, nessa ordem, no SQL Editor. As aulas reais começam vazias; quatro módulos iniciais são criados.
3. No Supabase Auth, desative cadastro público. Configure Site URL, URLs de redirecionamento (incluindo `http://localhost:3000/**` durante desenvolvimento e seu domínio em produção) e SMTP para convites/recuperação.
4. Crie o primeiro usuário pelo painel Auth do Supabase e promova apenas essa conta pelo SQL Editor: `update public.profiles set role = 'admin' where email = 'seu-email';`. O gatilho deve existir antes da criação desse usuário. Se ele já existia, insira seu perfil manualmente usando o mesmo ID do Auth.
5. Crie credenciais da API Mux e uma chave de assinatura de reprodução. Configure `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY` e `MUX_PRIVATE_KEY` (chave privada base64 fornecida pelo Mux).
6. Cadastre o webhook HTTPS `/api/mux/webhook` no Mux e configure `MUX_WEBHOOK_SECRET`. Eventos usados: `video.asset.ready` e `video.asset.errored`. Em desenvolvimento, use um túnel HTTPS para o webhook. Defina `NEXT_PUBLIC_SITE_URL` com a origem exata permitida no upload.
7. Entre como administrador, abra Meu perfil → Administração. Crie aulas em rascunho, envie vídeo, aguarde processamento, atualize a lista e publique. Edite módulos/capas, posição das aulas e PDFs no editor. Convide alunos na aba Alunos.
8. Na hospedagem, configure as mesmas variáveis com URLs de produção e rode `npm run build`. O app pode ser hospedado em Vercel ou servidor Node com `npm start`. Contas, contratação e implantação não foram realizadas.

## Regras e limites

- A ordem é posição do módulo, depois posição da aula e ID para desempate. Só aulas publicadas participam do desbloqueio. Conclusões anteriores permanecem após reordenação.
- O servidor conta intervalos distintos, serializa atualizações e valida duração, tamanho do intervalo e tempo decorrido. 90% libera a próxima aula. O registro ocorre a cada cerca de 8 segundos; os últimos segundos podem precisar ser revistos ao fechar abruptamente.
- URLs de vídeo são assinadas e expiram em 4 horas. Suspensão impede novas operações; um token de reprodução já emitido pode funcionar até expirar. Essa contagem não comprova atenção e não constitui DRM.
- PDFs ficam em bucket privado, com links válidos por 10 minutos e emitidos só para aulas liberadas. Reabra a tela para renovar. Capas são públicas; limites: 10 MB de imagem e 20 MB de PDF.
- Upload de vídeo é direto por PUT, sem retomada automática. Em falha, selecione o arquivo novamente. Despublique antes de substituir vídeo. Mantenha a aba aberta durante o envio. Vídeos antigos podem permanecer na conta Mux e precisam de revisão manual de armazenamento.
- Não há quiz, pagamento, certificados, exclusão de alunos nem geração de conteúdo educativo.

## Verificação

`npm test`: testes de intervalos e execução real das migrações/RPC em PostgreSQL WASM (PGlite), incluindo restrição de acesso. `npm run build`: compilação e TypeScript.

Também validar com contas reais: convite/recuperação via SMTP, isolamento entre dois alunos, suspensão, upload e webhook Mux, reprodução assinada e desbloqueio após assistir 90%. Esses fluxos externos exigem credenciais e não foram executados nesta entrega.

## Identidade e imagens

Logos fornecidos pelo usuário em `public/brand`. Fotos ilustrativas do Unsplash, armazenadas localmente em `public/images`: `photo-1449965408869-eaa3f722e40d`, `photo-1506126613408-eca07ce68773`, `photo-1450101499163-c8848c66ca85`, `photo-1486262715619-67b85e0b08d3`. Não representam clientes ou instalações da empresa. Tipografia Manrope e DM Sans, carregada via Google Fonts.
