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
- **Regra de ouro do offline:** as telas do técnico que funcionam offline (lista/detalhe de equipamentos, registro de serviço, histórico, leitor de QR) são **Client Components** e acessam dados **somente** por `lib/tecnico/data` (leitura por hooks `useEquipamentos`, `useEquipamento`, `useServicos`, `useTipos`, `useTipo`, `useLocais`, `useClientes`, `usePainel`; escrita por `repositorio.*`). Nunca `fetch`, `db`, Server Component ou Server Action nessas telas. A implementação atual chama `/api/tecnico/*`; na etapa 5 troca-se `lib/tecnico/data/atual.ts` por Dexie, sem mexer nas telas. Telas de cadastro e o `/portal` podem usar Server Components.
- **Permissões (obrigatório):** sempre pelo helper `lib/auth/permissoes.ts` — `getSessaoOuRedirect()`, `exigirAdmin()`, `comAdminApi()` (route handlers) e `escopoCliente()`. **Nenhuma query do portal (ou de usuário `cliente`) pode ignorar `escopoCliente()`**: toda consulta filtra por `escopo.clienteId`. O `proxy.ts` é só checagem otimista de cookie; a proteção real é no servidor.
- **IDs são UUID** (gerados no cliente para registros que nascem offline). Datas de calendário (`data`, `proxima_data`) são `yyyy-mm-dd` (string), sem fuso.
- **Nomes de domínio em português, conforme o schema** (`clientes`, `locais`, `tipos_equipamento`, `equipamentos`, `servicos`, `fotos`, `usuarios`; campos `periodicidade_dias`, `proxima_data`…). Exceção: as colunas do Better Auth usam propriedades em inglês (`name`, `email`, `createdAt`…) com nome físico em português — ver comentário em `db/schema.ts`.
- JSONB tipado e validado com Zod em `lib/schemas/` (`campo.ts`, `checklist.ts`). O checklist de um serviço guarda **snapshot do rótulo**.
- Fotos (etapa 4): disco do servidor em `UPLOAD_DIR`, sempre via interface única `lib/storage/`; nunca públicas.
- **Hospedagem: Hostinger Node.js Web Apps**, processo Node (não serverless). Nada específico da Vercel (Edge, `@vercel/*`, Blob, Cron). A Hostinger aplica `output: "standalone"` sozinha: por isso o `next.config.ts` **não** define `output` e deve continuar exportando um **objeto** (não função). Build `build`, diretório de saída `.next`, Node 22.

## Estado atual

**Etapa 1 (fundação) — concluída.** Projeto Next.js 16, shadcn/ui (Radix, todos os componentes), design system acessível, Drizzle + Neon (schema da seção 5, migration inicial, seeds), Better Auth sem cadastro público, helper de permissões, layouts de `/tecnico` e `/portal`, camada `lib/tecnico/data`.

**Etapa 2 (cadastros, busca e QR Code) — concluída.**

- **Clientes e locais** (`/tecnico/clientes`): Cards, criar/editar em Dialog (computador) ou Drawer (celular) via `components/dialogo-responsivo.tsx`; CNPJ com máscara e validação; excluir local só sem equipamentos (AlertDialog explica). Com 1 cliente só, nenhuma tela mostra seletor de cliente: use `useClienteAutomatico()` (`precisaEscolher` só é verdadeiro com 2+ clientes).
- **Tipos** (`/tecnico/tipos`, `/tecnico/tipos/novo`, `/tecnico/tipos/[id]`): lista e editor em página própria (dados, campos, checklist; subir/descer por botão; `key` gerada ao salvar e imutável depois; pré-visualização ao vivo; aviso ao remover campo com valores; arquivar/reativar; excluir só sem equipamentos).
- **Equipamentos** (`/tecnico/equipamentos`, `/novo`, `/[id]`, `/[id]/editar`): lista com busca instantânea (sem acento) e chips por situação/tipo/local/arquivados, ordenada por urgência (vencido → vence em breve → sem registro → em dia); formulário com campos dinâmicos (Zod gerado de `lib/schemas/atributos.ts`; em etapas no celular); detalhe com "Registrar serviço" (rota `/tecnico/servicos/novo?equipamento=id` ainda é placeholder), menu Editar / Ver QR Code / Arquivar e área reservada para a linha do tempo (etapa 3). Valores de campos removidos do tipo continuam guardados.
- **QR Code:** `https://<domínio>/e/{id}` gerado na hora com `qrcode` (`components/qr-code.tsx`). `/e/[id]` leva admin ao `/tecnico/equipamentos/[id]`, cliente a `/portal/equipamentos/[id]` (página mínima, escopada por `escopoCliente()`), e quem não está logado ao login com `?voltar=` (só destinos internos, `lib/auth/destino.ts`; o `proxy.ts` também usa `voltar`). `/tecnico/etiquetas`: escolha por equipamento/local/tipo e folha A4 (3 colunas) com CSS de impressão.
- **Camada de dados:** `lib/tecnico/data` agora tem escrita (`repositorio.salvarCliente/Local/Tipo/Equipamento`, `excluirLocal/Tipo`, `definirTipoAtivo`, `arquivarEquipamento`) além dos hooks; toda escrita dispara `notificarMudanca()` e os hooks recarregam. `useEquipamentos` carrega a lista uma vez e filtra em memória. Route handlers em `/api/tecnico/*` com `comAdminApi` e validação Zod (`lib/api.ts`, `lib/schemas/entidades.ts`, `lib/tecnico/mutacoes.ts`). Cadastros exigem internet.

**Ainda não existe (próximas etapas):** registro de serviço, linha do tempo, painel de início, fotos e `lib/storage`, relatório PDF, tela de gestão de acessos, portal com listas reais, PWA/offline/Dexie/sincronização, leitor de QR (`/tecnico/escanear` é placeholder), `/api/sync/*`, `/api/fotos/*`.
