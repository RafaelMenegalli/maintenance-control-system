import { asc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { clientes, type PapelUsuario } from "@/db/schema";
import { auth } from "@/lib/auth";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HELPER CENTRAL DE PERMISSÕES  (docs/ESCOPO.md, seção 7 — "Permissões")
 *
 *  As permissões são feitas na aplicação, aqui. O proxy.ts só faz uma checagem
 *  otimista do cookie; quem decide de verdade são estas funções, no servidor.
 *
 *  ⚠ NENHUMA query do portal (nem de qualquer usuário `cliente`) pode ignorar
 *    `escopoCliente()`: toda consulta tem de ser filtrada por `escopo.clienteId`.
 *    Rotas de API que servem dados do portal também. Sem exceções.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ROTA_LOGIN = "/login";

/** Rota inicial de cada papel depois do login. */
export function rotaInicial(papel: PapelUsuario | string | null | undefined): string {
  return papel === "admin" ? "/tecnico" : "/portal";
}

/**
 * Sessão atual, ou `null` se não há login válido. Usuário desativado conta como
 * "sem sessão" (vale também para sessões que já estavam abertas).
 * Memoizada por requisição.
 */
export const getSessao = cache(async () => {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao || !sessao.user.ativo) return null;
  return sessao;
});

/** Sessão válida ou redireciona para /login. */
export async function getSessaoOuRedirect() {
  const sessao = await getSessao();
  if (!sessao) redirect(ROTA_LOGIN);
  return sessao;
}

/** Só o técnico (admin). Cliente é redirecionado para o portal. */
export async function exigirAdmin() {
  const sessao = await getSessaoOuRedirect();
  if (sessao.user.papel !== "admin") redirect("/portal?aviso=sem-acesso");
  return sessao;
}

/** UUID "nulo": não existe nenhum cliente com este id, então não devolve dado algum. */
const CLIENTE_NENHUM = "00000000-0000-0000-0000-000000000000";

export type EscopoCliente = {
  /** Use SEMPRE em `where cliente_id = ...` (ou via join com `locais.cliente_id`). */
  clienteId: string;
  /** O portal é somente leitura. */
  somenteLeitura: true;
};

/**
 * Filtro de `cliente_id` para toda query do portal.
 *
 * - Usuário `cliente`: sempre o `cliente_id` da própria sessão (nunca um valor vindo da URL).
 * - Admin vendo o portal "como a empresa enxerga": o cliente pedido em `clienteIdParaAdmin`
 *   ou, se não pedir, o primeiro cliente cadastrado. Como hoje existe 1 cliente só,
 *   fica automático (o seletor de cliente entra quando houver mais de um).
 * - Sem cliente associado: devolve um id que não casa com nada (nega por padrão).
 *
 * ⚠ Nenhuma query do portal pode ignorar este helper.
 */
export async function escopoCliente(clienteIdParaAdmin?: string): Promise<EscopoCliente> {
  const sessao = await getSessaoOuRedirect();

  if (sessao.user.papel === "admin") {
    if (clienteIdParaAdmin) return { clienteId: clienteIdParaAdmin, somenteLeitura: true };
    const [primeiro] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .orderBy(asc(clientes.nome))
      .limit(1);
    return { clienteId: primeiro?.id ?? CLIENTE_NENHUM, somenteLeitura: true };
  }

  return { clienteId: sessao.user.clienteId ?? CLIENTE_NENHUM, somenteLeitura: true };
}

// ───────────────────────── Rotas de API ─────────────────────────

/**
 * Para route handlers (/api/tecnico/*): exige admin e devolve JSON
 * (401 sem login, 403 se não for admin) em vez de redirecionar.
 * Se `executar` devolver `null`, responde 404.
 */
export async function comAdminApi(
  executar: (sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>) => Promise<unknown>,
): Promise<Response> {
  const sessao = await getSessao();
  if (!sessao) return Response.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  if (sessao.user.papel !== "admin") {
    return Response.json({ erro: "Você não tem acesso a esta área." }, { status: 403 });
  }
  try {
    const resultado = await executar(sessao);
    if (resultado === null) return Response.json({ erro: "Não encontrado." }, { status: 404 });
    return Response.json(resultado);
  } catch (erro) {
    console.error("Erro na API do técnico:", erro);
    return Response.json({ erro: "Erro interno. Tente de novo." }, { status: 500 });
  }
}
