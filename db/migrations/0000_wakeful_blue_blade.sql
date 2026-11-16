CREATE TYPE "public"."momento_foto" AS ENUM('antes', 'depois');--> statement-breakpoint
CREATE TYPE "public"."papel_usuario" AS ENUM('admin', 'cliente');--> statement-breakpoint
CREATE TYPE "public"."tipo_servico" AS ENUM('instalacao', 'preventiva', 'corretiva', 'limpeza', 'inspecao');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text,
	"contato" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conta_id" text NOT NULL,
	"provedor_id" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expira_em" timestamp with time zone,
	"refresh_token_expira_em" timestamp with time zone,
	"scope" text,
	"senha_hash" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"local_id" uuid NOT NULL,
	"tipo_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"periodicidade_dias" integer NOT NULL,
	"atributos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observacoes" text,
	"arquivado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servico_id" uuid NOT NULL,
	"momento" "momento_foto" NOT NULL,
	"storage_key" text NOT NULL,
	"largura" integer,
	"altura" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nome" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipamento_id" uuid NOT NULL,
	"tipo" "tipo_servico" NOT NULL,
	"data" date NOT NULL,
	"descricao" text,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proxima_data" date,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"sincronizado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text,
	"usuario_id" uuid NOT NULL,
	CONSTRAINT "sessoes_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tipos_equipamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"icone" text,
	"campos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"periodicidade_padrao_dias" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"imagem" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"papel" "papel_usuario" DEFAULT 'cliente' NOT NULL,
	"cliente_id" uuid,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identificador" text NOT NULL,
	"valor" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_local_id_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_tipo_id_tipos_equipamento_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_equipamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locais" ADD CONSTRAINT "locais_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_equipamento_id_equipamentos_id_fk" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contas_usuario_id_idx" ON "contas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "equipamentos_local_id_idx" ON "equipamentos" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "equipamentos_tipo_id_idx" ON "equipamentos" USING btree ("tipo_id");--> statement-breakpoint
CREATE INDEX "fotos_servico_id_idx" ON "fotos" USING btree ("servico_id");--> statement-breakpoint
CREATE INDEX "locais_cliente_id_idx" ON "locais" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "servicos_equipamento_id_data_idx" ON "servicos" USING btree ("equipamento_id","data");--> statement-breakpoint
CREATE INDEX "servicos_criado_por_idx" ON "servicos" USING btree ("criado_por");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_equipamento_nome_uq" ON "tipos_equipamento" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "usuarios_cliente_id_idx" ON "usuarios" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "verificacoes_identificador_idx" ON "verificacoes" USING btree ("identificador");