# Sistema de Controle de Manutenções — Escopo do Projeto

> Documento de referência do projeto. Fica em `docs/ESCOPO.md` e deve ser consultado antes de qualquer decisão de produto ou arquitetura.

## 1. Visão geral

Sistema web com app instalável (PWA) para registrar e comprovar manutenções de **ar-condicionado, caixas d'água, portas corta-fogo e luzes de emergência**, feitas por um técnico (prestador de serviço) para empresas clientes.

- **Usuários:** o técnico (admin), que cadastra e registra os serviços, e a empresa cliente, que só consulta.
- **Objetivo:** histórico documentado (fotos, descrição, checklist, tipo de serviço e data) compartilhado com a empresa, para dar controle e comprovação dos serviços prestados.
- **Plataforma:** web, usada no computador e instalada no celular (PWA). As fotos são tiradas no celular.
- **Público:** o usuário principal tem mais de 40 anos. **Usabilidade e clareza são requisitos de primeira classe**, não detalhes (ver seção 9).

## 2. Perfis de usuário

| Perfil | O que faz | Conexão |
| --- | --- | --- |
| **Técnico (admin)** | Cadastra clientes, locais, tipos de equipamento, equipamentos e acessos; registra serviços com checklist e fotos; gera relatórios e etiquetas QR | Registro de serviços e consulta funcionam **offline** e sincronizam quando a internet volta. Cadastros exigem internet |
| **Empresa (cliente)** | Consulta equipamentos, histórico com fotos e próximas manutenções; baixa relatórios | **Somente online**, somente leitura, vê apenas os dados do próprio cliente |

No início são 2 acessos: um do técnico e um da empresa. Não existe cadastro público: só o técnico cria acessos.

## 3. Funcionalidades

1. **Clientes e locais.** Hoje é uma empresa só, mas o sistema já nasce multi-cliente. Se só existe 1 cliente, a interface não pede para escolher cliente (seleciona automaticamente).
2. **Tipos de equipamento personalizáveis.** O sistema vem com 4 tipos pré-cadastrados (seção 4). O técnico pode editar os tipos e criar novos, definindo:
   - campos de cadastro (texto, número, data, seleção, sim/não; obrigatório ou não; unidade opcional);
   - itens do checklist de serviço;
   - periodicidade padrão (dias).
3. **Equipamentos.** Local, nome/identificação, campos do tipo (formulário dinâmico), periodicidade em dias (vem do tipo, editável por equipamento), observações. Podem ser arquivados (nunca apagados se tiverem serviços).
4. **Busca de equipamentos.** Lista com busca por nome, local e tipo, e filtros. É o **caminho principal** para encontrar um equipamento e registrar um serviço.
5. **QR Code (opcional).** Gerado automaticamente para cada equipamento; tela de impressão de etiquetas (várias por folha A4). Leitor de QR dentro do app abre o equipamento, inclusive offline. É um atalho, nunca obrigatório.
6. **Registro de serviço.**
   - Tipo: instalação, preventiva, corretiva, limpeza ou inspeção/teste.
   - Data (padrão: hoje), descrição, fotos de antes e de depois.
   - Checklist do tipo de equipamento: cada item OK / Não OK / N/A, com observação opcional.
   - Próxima data = data + periodicidade do equipamento (editável).
7. **Linha do tempo por equipamento** com todos os serviços, checklist e fotos.
8. **Painel** com manutenções vencidas, que vencem em até 15 dias e equipamentos sem nenhum registro; filtro por tipo e local.
9. **Portal da empresa**, somente leitura.
10. **Relatório em PDF** (seção 6).
11. **Gestão de acessos:** o técnico cria, redefine a senha e desativa o acesso da empresa.

## 4. Tipos de equipamento pré-cadastrados (seed)

### Ar-condicionado — periodicidade padrão 90 dias
- **Campos:** local/sala (texto), marca (texto), modelo (texto), tipo (seleção: Split, Janela, Cassete, Piso-teto, Outro), capacidade (número, BTUs), nº de série (texto).
- **Checklist:** filtros limpos; evaporadora limpa; dreno desobstruído; condensadora verificada; aparelho resfriando normalmente.

### Caixa d'água — periodicidade padrão 180 dias
- **Campos:** capacidade (número, litros), material (seleção: Polietileno, Fibra, Concreto, Outro), tipo de tampa (texto).
- **Checklist:** esvaziamento realizado; limpeza e desinfecção realizadas; tampa bem vedada; sem trincas ou vazamentos; boia funcionando.

### Porta corta-fogo (NBR 11742) — periodicidade padrão 30 dias
- **Campos:** identificação (texto), fabricante (texto), classe (seleção: P-30, P-60, P-90, P-120), nº de série do selo de conformidade (texto), mês/ano de fabricação (texto, MM/AAAA), tipo de fechamento (seleção: Dobradiça com mola, Mola aérea), acionamento (seleção: Maçaneta, Barra antipânico).
- **Checklist:** fecha sozinha e por completo; fechadura, barra antipânico e trincos funcionando; dobradiças e trincos limpos e lubrificados; folga entre folha e soleira de 5 a 10 mm; folha sem corrosão ou amassados; plaqueta de identificação legível; letreiro "Porta corta-fogo, é obrigatório manter fechada"; passagem desobstruída.

### Luz de emergência (NBR 10898) — periodicidade padrão 30 dias
- **Campos:** tipo de sistema (seleção: Bloco autônomo, Centralizado com baterias, Grupo motogerador), marca/modelo (texto), autonomia declarada (número, horas), tipo de bateria (texto), data da última troca de bateria (data).
- **Checklist:** acende ao simular falta de energia (botão de teste); indicador de carga funcionando; mantém a luz por pelo menos 1 hora; lente limpa e fixação firme; bateria dentro da vida útil.

## 5. Modelo de dados

Hierarquia: `clientes → locais → equipamentos → servicos → fotos`; `tipos_equipamento` define campos e checklist; `usuarios` com papel. **Todos os IDs são UUID gerados no cliente quando o registro nasce offline.**

| Tabela | Campos principais |
| --- | --- |
| `clientes` | id, nome, cnpj, contato, criado_em |
| `locais` | id, cliente_id, nome (ex.: Bloco A, Cobertura) |
| `tipos_equipamento` | id, nome, icone, campos (JSONB: definição dos campos), checklist (JSONB: itens), periodicidade_padrao_dias, ativo |
| `equipamentos` | id, local_id, tipo_id, nome, periodicidade_dias, atributos (JSONB: valores dos campos), observacoes, arquivado_em, criado_em, atualizado_em |
| `servicos` | id (UUID do cliente), equipamento_id, tipo (instalacao / preventiva / corretiva / limpeza / inspecao), data, descricao, checklist (JSONB: respostas com **snapshot do rótulo**), proxima_data, criado_por, criado_em, sincronizado_em |
| `fotos` | id, servico_id, momento (antes / depois), storage_key, largura, altura, criado_em |
| `usuarios` (Better Auth) | id, nome, email, papel (admin / cliente), cliente_id, ativo |

Definição de campo (JSONB): `{ key, label, type: "texto" | "numero" | "data" | "selecao" | "sim_nao", options?: string[], obrigatorio: boolean, unidade?: string }`.
Item de checklist (JSONB): `{ key, label }`.
Resposta de checklist no serviço: `{ key, label, resultado: "ok" | "nao_ok" | "na", observacao?: string }` — o `label` é copiado no momento do registro, para que editar o tipo depois não altere o histórico.

**Status do equipamento** (calculado a partir do último serviço): `em_dia`, `vence_em_breve` (≤ 15 dias), `vencido`, `sem_registro`.

## 6. Modelo de relatório (PDF)

Gerado com filtro por período, local, tipo de equipamento ou equipamento.

1. **Cabeçalho:** nome do prestador, empresa cliente, período e data de emissão.
2. **Resumo:** total de serviços por tipo de serviço e por tipo de equipamento, quantidade de equipamentos atendidos e manutenções vencidas.
3. **Serviços realizados:** tabela em ordem de data — Data | Equipamento | Local | Serviço | O que foi feito.
4. **Detalhe de cada serviço:** descrição, checklist com resultado e observações, fotos de antes e depois em miniatura.
5. **Próximas manutenções:** equipamento, local, serviço, data prevista.
6. **Rodapé:** espaço para assinatura do prestador e do responsável da empresa; numeração de páginas.

## 7. Arquitetura

Um único projeto Next.js com duas áreas:

- **`/tecnico`** — área do técnico (admin). Funciona no computador e no celular. As telas de consulta de equipamentos e de registro de serviço funcionam **offline**.
- **`/portal`** — área da empresa, online, somente leitura.

### Regra de ouro do offline
As telas do técnico que precisam funcionar offline (lista/detalhe de equipamentos, registro de serviço, histórico, leitor de QR) são **Client Components** que acessam dados **somente através da camada `lib/tecnico/data`** (repositório). Nas primeiras fases essa camada chama a API (route handlers). Na fase offline, a implementação passa a ler/gravar no IndexedDB (Dexie) e sincronizar, **sem alterar as telas**. Server Components e Server Actions não funcionam offline: não use nessas telas.

O `/portal` e as telas de cadastro podem usar Server Components normalmente.

### Sincronização (fase offline)
1. Ao abrir com internet: `GET /api/sync/pull` baixa tipos, locais, equipamentos e os últimos serviços para o IndexedDB.
2. Sem internet: cada serviço e suas fotos (já comprimidas) entram numa fila local; a interface mostra "N serviços aguardando envio".
3. Quando a conexão volta (ao abrir o app, no evento `online` e periodicamente com a aba visível): o app envia cada foto para `POST /api/fotos` (idempotente pelo id da foto).
4. Depois das fotos: `POST /api/sync/push` envia os serviços em lote com `insert ... on conflict (id) do nothing` (idempotente).
5. Edição de equipamento: vale a última edição.

### Permissões
Feitas na aplicação, num helper central. Toda query de um usuário `cliente` é filtrada pelo `cliente_id` da sessão. Nenhuma rota do portal consulta o banco sem passar por esse helper. Fotos nunca ficam públicas: são entregues por uma rota da aplicação (`GET /api/fotos/[id]`) que checa a permissão antes de ler o arquivo.

### Armazenamento das fotos
As fotos ficam **no disco do próprio servidor da Hostinger**, numa pasta fora dos diretórios gerenciados pelo deploy (`hbuilds/` e `public_html/` são sobrescritos a cada deploy). O caminho vem da variável `UPLOAD_DIR` (ex.: `/home/<usuario>/storage/manutencoes`; em desenvolvimento, `./.storage`). Estrutura: `{UPLOAD_DIR}/servicos/{servicoId}/{fotoId}.jpg`.

Todo acesso a arquivos passa por uma interface única em `lib/storage/` (`salvar`, `ler`, `existe`, `remover`) com implementação em disco local. Assim, se um dia for preciso trocar por um storage externo, só essa camada muda.

## 8. Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js (App Router, versão estável mais recente) + TypeScript (strict) |
| UI | shadcn/ui (todos os componentes) + Tailwind CSS + lucide-react |
| Banco | Neon (Postgres) |
| ORM | Drizzle + `@neondatabase/serverless` + drizzle-kit (migrations) |
| Validação | Zod + react-hook-form (via componentes de formulário do shadcn) |
| Auth | Better Auth (e-mail e senha, sem cadastro público, papéis admin/cliente) |
| Fotos | Disco do servidor (pasta definida em `UPLOAD_DIR`), upload e leitura por route handlers autenticados |
| Compressão | browser-image-compression (~250 KB, lado maior 1600 px) |
| Miniaturas | sharp (no servidor, geradas sob demanda e guardadas) |
| Offline (dados) | Dexie (IndexedDB) + `useLiveQuery` |
| Offline (app) | Serwist (`@serwist/next`) |
| QR Code | `qrcode` (gerar) + `@yudiel/react-qr-scanner` (ler) |
| PDF | `@react-pdf/renderer` (em route handler) |
| Datas | date-fns com locale pt-BR |
| Hospedagem | Hostinger — Node.js Web Apps (plano Business ou Cloud), deploy pelo GitHub, domínio na própria Hostinger |
| Banco hospedado | Neon (externo à Hostinger, que não oferece Postgres nos planos compartilhados) |

**Observações da hospedagem:** o app roda como processo Node (não é serverless) e pode "dormir" após um tempo sem acesso, acordando na próxima requisição. Não use APIs específicas da Vercel (Edge Runtime, `@vercel/*`, Vercel Blob, Cron da Vercel). Consulte a documentação da Hostinger para Next.js (build, `output: standalone`, Node 22 LTS).

## 9. Diretrizes de UX (obrigatórias)

O usuário principal tem mais de 40 anos e usa o sistema no celular, em campo, às vezes com pressa. O sistema deve ser **óbvio sem treinamento**.

**Leitura e toque**
- Texto base de pelo menos 16 px (preferir 17–18 px no celular); nada abaixo de 14 px.
- Botões e campos com altura mínima de 48 px no celular; espaço generoso entre alvos de toque.
- Alto contraste (texto escuro sobre fundo claro). Tema claro apenas.
- Ícones **sempre acompanhados de texto**. Nunca botão só com ícone para ações importantes.

**Linguagem**
- Português do Brasil simples, sem jargão técnico de software ("Salvar serviço", não "Submit"; "Sem internet — seu registro está salvo no celular", não "Offline mode").
- Datas no formato dd/mm/aaaa; números com vírgula decimal.
- Mensagens de erro que dizem o que fazer ("Preencha a data do serviço").

**Navegação**
- Celular: barra inferior fixa com até 4 itens grandes (Início, Equipamentos, Escanear, Mais).
- Computador: Sidebar do shadcn.
- Registrar um serviço a partir da tela inicial em **no máximo 3 toques**: Início → "Registrar serviço" → escolher equipamento (busca com recentes) → formulário.
- Uma ação principal por tela, em destaque. Botão de voltar sempre visível.

**Formulários**
- Rótulos sempre visíveis acima dos campos (nunca só placeholder).
- Valores padrão inteligentes (data = hoje, periodicidade vinda do tipo, próxima data calculada).
- Formulários longos no celular viram etapas com indicador de progresso; os dados não se perdem ao voltar.
- Ações destrutivas sempre com AlertDialog de confirmação, explicando a consequência.

**Feedback**
- Toda ação tem retorno visível (toast do Sonner): "Serviço salvo".
- Estados de carregamento com Skeleton/Spinner; estados vazios com explicação e botão de próxima ação.
- Status com cor **e** texto (Badge "Vencido", "Vence em 5 dias", "Em dia", "Sem registro").
- Indicador de sincronização sempre visível na área do técnico.

**Componentes**
- Use exclusivamente componentes do shadcn/ui para manter um padrão minimalista e consistente. Não instale outra biblioteca de UI.
