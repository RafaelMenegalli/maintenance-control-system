import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Atributos, CampoDefinicao } from "@/lib/schemas/campo";
import type { ItemChecklist, RespostaChecklist } from "@/lib/schemas/checklist";

/**
 * Modelo de dados — docs/ESCOPO.md, seção 5.
 * Hierarquia: clientes → locais → equipamentos → servicos → fotos.
 * Todos os IDs são UUID (gerados no cliente quando o registro nasce offline).
 */

// ───────────────────────── Enums ─────────────────────────

export const papelUsuario = pgEnum("papel_usuario", ["admin", "cliente"]);
export const tipoServico = pgEnum("tipo_servico", [
  "instalacao",
  "preventiva",
  "corretiva",
  "limpeza",
  "inspecao",
]);
export const momentoFoto = pgEnum("momento_foto", ["antes", "depois"]);

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();

// ───────────────────────── Domínio ─────────────────────────

export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  contato: text("contato"),
  criadoEm: criadoEm(),
});

export const locais = pgTable(
  "locais",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id),
    nome: text("nome").notNull(),
  },
  (t) => [index("locais_cliente_id_idx").on(t.clienteId)],
);

export const tiposEquipamento = pgTable(
  "tipos_equipamento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    /** Nome do ícone (lucide-react) usado na interface. */
    icone: text("icone"),
    /** Definição dos campos de cadastro (ver lib/schemas/campo.ts). */
    campos: jsonb("campos").$type<CampoDefinicao[]>().notNull().default(sql`'[]'::jsonb`),
    /** Itens do checklist de serviço (ver lib/schemas/checklist.ts). */
    checklist: jsonb("checklist").$type<ItemChecklist[]>().notNull().default(sql`'[]'::jsonb`),
    periodicidadePadraoDias: integer("periodicidade_padrao_dias").notNull(),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [uniqueIndex("tipos_equipamento_nome_uq").on(t.nome)],
);

export const equipamentos = pgTable(
  "equipamentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    localId: uuid("local_id")
      .notNull()
      .references(() => locais.id),
    tipoId: uuid("tipo_id")
      .notNull()
      .references(() => tiposEquipamento.id),
    nome: text("nome").notNull(),
    periodicidadeDias: integer("periodicidade_dias").notNull(),
    /** Valores dos campos do tipo, indexados pela `key` do campo. */
    atributos: jsonb("atributos").$type<Atributos>().notNull().default(sql`'{}'::jsonb`),
    observacoes: text("observacoes"),
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("equipamentos_local_id_idx").on(t.localId),
    index("equipamentos_tipo_id_idx").on(t.tipoId),
  ],
);

export const servicos = pgTable(
  "servicos",
  {
    /** UUID gerado no cliente (o registro pode nascer offline). */
    id: uuid("id").primaryKey().defaultRandom(),
    equipamentoId: uuid("equipamento_id")
      .notNull()
      .references(() => equipamentos.id),
    tipo: tipoServico("tipo").notNull(),
    /** Data do serviço (yyyy-mm-dd, sem fuso). */
    data: date("data", { mode: "string" }).notNull(),
    descricao: text("descricao"),
    /** Respostas do checklist com snapshot do rótulo (ver lib/schemas/checklist.ts). */
    checklist: jsonb("checklist").$type<RespostaChecklist[]>().notNull().default(sql`'[]'::jsonb`),
    proximaData: date("proxima_data", { mode: "string" }),
    criadoPor: uuid("criado_por").references((): typeof usuarios.id => usuarios.id),
    criadoEm: criadoEm(),
    sincronizadoEm: timestamp("sincronizado_em", { withTimezone: true }),
    /** Última alteração (a sincronização incremental do técnico usa isto para saber o que mudou). */
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("servicos_equipamento_id_data_idx").on(t.equipamentoId, t.data),
    index("servicos_criado_por_idx").on(t.criadoPor),
  ],
);

export const fotos = pgTable(
  "fotos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    servicoId: uuid("servico_id")
      .notNull()
      .references(() => servicos.id, { onDelete: "cascade" }),
    momento: momentoFoto("momento").notNull(),
    /** Caminho relativo dentro de UPLOAD_DIR: servicos/{servicoId}/{fotoId}.jpg */
    storageKey: text("storage_key").notNull(),
    largura: integer("largura"),
    altura: integer("altura"),
    criadoEm: criadoEm(),
  },
  (t) => [index("fotos_servico_id_idx").on(t.servicoId)],
);

// ───────────────────────── Autenticação (Better Auth) ─────────────────────────
//
// O Better Auth lê as colunas pelo NOME DA PROPRIEDADE (name, email, emailVerified…),
// por isso as propriedades ficam no padrão dele; o nome físico da coluna é em português.
// Em lib/auth.ts o objeto de schema mapeia user → usuarios, session → sessoes, etc.

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("nome").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verificado").notNull().default(false),
    image: text("imagem"),
    createdAt: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    /** Campos extras do produto (declarados em `user.additionalFields` no Better Auth). */
    papel: papelUsuario("papel").notNull().default("cliente"),
    clienteId: uuid("cliente_id").references(() => clientes.id),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [index("usuarios_cliente_id_idx").on(t.clienteId)],
);

export const sessoes = pgTable(
  "sessoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expira_em", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip"),
    userAgent: text("user_agent"),
    userId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
  },
  (t) => [index("sessoes_usuario_id_idx").on(t.userId)],
);

export const contas = pgTable(
  "contas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("conta_id").notNull(),
    providerId: text("provedor_id").notNull(),
    userId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expira_em", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expira_em", { withTimezone: true }),
    scope: text("scope"),
    /** Hash da senha (provedor "credential"). */
    password: text("senha_hash"),
    createdAt: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("contas_usuario_id_idx").on(t.userId)],
);

export const verificacoes = pgTable(
  "verificacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identificador").notNull(),
    value: text("valor").notNull(),
    expiresAt: timestamp("expira_em", { withTimezone: true }).notNull(),
    createdAt: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verificacoes_identificador_idx").on(t.identifier)],
);

// ───────────────────────── Tipos inferidos ─────────────────────────

export type Cliente = typeof clientes.$inferSelect;
export type Local = typeof locais.$inferSelect;
export type TipoEquipamento = typeof tiposEquipamento.$inferSelect;
export type Equipamento = typeof equipamentos.$inferSelect;
export type Servico = typeof servicos.$inferSelect;
export type Foto = typeof fotos.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type TipoServico = (typeof tipoServico.enumValues)[number];
export type MomentoFoto = (typeof momentoFoto.enumValues)[number];
export type PapelUsuario = (typeof papelUsuario.enumValues)[number];
