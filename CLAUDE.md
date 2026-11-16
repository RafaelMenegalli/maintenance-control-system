# Controle de Manutenções

Sistema web (PWA) para registrar e comprovar manutenções de ar-condicionado, caixas d'água, portas corta-fogo e luzes de emergência, feitas por um técnico para empresas clientes. Duas áreas: `/tecnico` (admin, com partes offline) e `/portal` (empresa, somente leitura e online).

**Fonte da verdade do produto: [`docs/ESCOPO.md`](docs/ESCOPO.md)** (funcionalidades, modelo de dados, arquitetura, stack, UX). Leia antes de qualquer decisão. O projeto é construído em 5 etapas; não implemente funcionalidades de etapas futuras.

> O Next.js desta versão (16.x) tem mudanças importantes (ex.: `proxy.ts` no lugar de `middleware.ts`). A documentação certa está em `node_modules/next/dist/docs/` — consulte-a em vez de confiar na memória (ver também `AGENTS.md`).

## Comandos

Gerenciador de pacotes: **pnpm** (Node 22+; na Hostinger use Node 22 LTS).

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento (http://localhost:3000) |
| `pnpm build` / `pnpm start` | Build e servidor de produção (processo Node comum) |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm db:generate` | Gera migration a partir de `db/schema.ts` (drizzle-kit) |
| `pnpm db:migrate` | Aplica as migrations no Neon |
| `pnpm db:seed` | Tipos de equipamento + usuário admin (`SEED_ADMIN_*`). Idempotente |
| `pnpm db:seed:demo` | 1 cliente, 3 locais, 12 equipamentos e serviços variados (sem fotos). Idempotente |
| `pnpm db:usuario --nome … --email … --senha … --papel admin\|cliente` | Cria um acesso pela linha de comando (a tela "Acessos" é de etapa futura) |

Os scripts `db:*` leem o `.env` (`node --env-file=.env`). Variáveis: veja `.env.example`; são validadas por Zod em `lib/env.ts`.

## Convenções

- **UI 100% em português do Brasil**, simples, sem jargão ("Salvar serviço", "Sem internet — seu registro está salvo no celular"). Erros dizem o que fazer ("Preencha a data do serviço").
- **Só componentes shadcn/ui** (`components/ui`, estilo `radix-nova`, todos instalados). Não adicionar outra biblioteca de UI nem bibliotecas fora da stack do escopo sem perguntar. Ícones: lucide-react.
- **UX (escopo, seção 9) — obrigatória**, o usuário principal tem mais de 40 anos:
  - fonte base 17 px no celular / 16 px no computador (escala em `rem`; `text-xs` = 14 px, nada menor);
  - botões, inputs e selects com **mínimo de 48 px** no celular — já ajustado nas variantes dos componentes em `components/ui` (não ajuste tela por tela);
  - alto contraste, foco visível, tema claro apenas;
  - **ícones sempre com texto**; uma ação principal por tela; botão Voltar sempre visível;
  - rótulos sempre visíveis acima dos campos; valores padrão inteligentes; ação destrutiva sempre com `AlertDialog` explicando a consequência;
  - toda ação com retorno (toast Sonner), carregamento com Skeleton/Spinner, estados vazios com explicação + botão de próxima ação;
  - **status sempre com cor E texto**: use `components/status-badge.tsx` (tokens `em_dia`, `vence_em_breve`, `vencido`, `sem_registro` em `globals.css`);
  - datas dd/mm/aaaa e números com vírgula: use **sempre** `lib/format.ts`.
- **Regra de ouro do offline:** as telas do técnico que funcionam offline (lista/detalhe de equipamentos, registro de serviço, histórico, leitor de QR) são **Client Components** e acessam dados **somente** por `lib/tecnico/data` (hooks `useEquipamentos`, `useEquipamento`, `useServicos`, `useTipos`, `useLocais`, `usePainel`). Nunca `fetch`, `db`, Server Component ou Server Action nessas telas. A implementação atual chama `/api/tecnico/*`; na etapa 5 troca-se `lib/tecnico/data/atual.ts` por Dexie, sem mexer nas telas. Telas de cadastro e o `/portal` podem usar Server Components.
- **Permissões (obrigatório):** sempre pelo helper `lib/auth/permissoes.ts` — `getSessaoOuRedirect()`, `exigirAdmin()`, `comAdminApi()` (route handlers) e `escopoCliente()`. **Nenhuma query do portal (ou de usuário `cliente`) pode ignorar `escopoCliente()`**: toda consulta filtra por `escopo.clienteId`. O `proxy.ts` é só checagem otimista de cookie; a proteção real é no servidor.
- **IDs são UUID** (gerados no cliente para registros que nascem offline). Datas de calendário (`data`, `proxima_data`) são `yyyy-mm-dd` (string), sem fuso.
- **Nomes de domínio em português, conforme o schema** (`clientes`, `locais`, `tipos_equipamento`, `equipamentos`, `servicos`, `fotos`, `usuarios`; campos `periodicidade_dias`, `proxima_data`…). Exceção: as colunas do Better Auth usam propriedades em inglês (`name`, `email`, `createdAt`…) com nome físico em português — ver comentário em `db/schema.ts`.
- JSONB tipado e validado com Zod em `lib/schemas/` (`campo.ts`, `checklist.ts`). O checklist de um serviço guarda **snapshot do rótulo**.
- Fotos (etapa 4): disco do servidor em `UPLOAD_DIR`, sempre via interface única `lib/storage/`; nunca públicas.
- **Hospedagem: Hostinger Node.js Web Apps**, processo Node (não serverless). Nada específico da Vercel (Edge, `@vercel/*`, Blob, Cron). A Hostinger aplica `output: "standalone"` sozinha: por isso o `next.config.ts` **não** define `output` e deve continuar exportando um **objeto** (não função). Build `build`, diretório de saída `.next`, Node 22.

## Estado atual

**Etapa 1 (fundação) — concluída.**

- Projeto Next.js 16 (App Router, TS strict, Tailwind 4, ESLint, alias `@/`), pnpm, shadcn/ui (Radix, todos os componentes), Inter, `lang="pt-BR"`, tema claro. `lib/env.ts` valida o `.env`.
- Design system acessível: escala de fonte, alturas de 48 px, foco visível, tokens de status, `StatusBadge`, `lib/format.ts` e `lib/status.ts` (`calcularStatus`).
- Banco: Drizzle + Neon (`@neondatabase/serverless`, Pool com WebSocket), `db/schema.ts` da seção 5, migration inicial aplicada, seeds base e demo idempotentes.
- Auth: Better Auth e-mail/senha, **sem cadastro público**, campos `papel`/`cliente_id`/`ativo`, usuário inativo não entra (nem com sessão aberta). `/login` grande com "Mostrar senha". Admin → `/tecnico`, cliente → `/portal`; cliente é barrado em `/tecnico`; admin pode abrir `/portal`.
- Layouts: `/tecnico` com Sidebar (computador) e barra inferior de 4 itens + gaveta "Mais" (celular), cabeçalho com Voltar e indicador de conexão (placeholder do indicador de sincronização); `/portal` com cabeçalho e abas. Todas as rotas existem como placeholder com estado vazio.
- Camada de dados do técnico (`lib/tecnico/data`): interface `RepositorioTecnico`, implementação via `fetch` em `/api/tecnico/*` (equipamentos, equipamento por id, serviços, tipos, locais) e hooks.

**Ainda não existe (próximas etapas):** telas reais (cadastros, lista/detalhe de equipamentos, painel, registro de serviço, portal com dados), fotos e `lib/storage`, QR Code, relatório PDF, gestão de acessos (tela), PWA/offline/Dexie/sincronização, `/api/sync/*`, `/api/fotos/*`.
