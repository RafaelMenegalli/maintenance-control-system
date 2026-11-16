import { renderToBuffer } from "@react-pdf/renderer";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, usuarios } from "@/db/schema";
import { escopoCliente, getSessao } from "@/lib/auth/permissoes";
import { montarDadosRelatorio } from "@/lib/relatorios/dados";
import { DocumentoRelatorio } from "@/lib/relatorios/documento";
import { filtrosRelatorioSchema, nomeArquivoRelatorio } from "@/lib/relatorios/filtros";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status });

/**
 * GET /api/relatorios?inicio=yyyy-mm-dd&fim=yyyy-mm-dd[&localId=…][&tipoId=…][&equipamentoId=…][&clienteId=…][&baixar=1]
 *
 * Devolve o relatório em PDF (docs/ESCOPO.md, seção 6).
 * - sem login → 401
 * - admin: escolhe o cliente por `clienteId`; se só existe 1 cliente, usa ele automaticamente
 * - cliente: SEMPRE o cliente da própria sessão (`clienteId` da URL é ignorado)
 * Somente leitura: nada é gravado.
 */
export async function GET(req: Request) {
  const sessao = await getSessao();
  if (!sessao) return erro("Sessão expirada. Entre de novo.", 401);

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const analise = filtrosRelatorioSchema.safeParse(params);
  if (!analise.success) return erro(analise.error.issues[0]?.message ?? "Confira os filtros do relatório.", 400);
  const filtros = analise.data;

  const admin = sessao.user.papel === "admin";
  let clienteIdAdmin: string | undefined;
  if (admin) {
    if (filtros.clienteId) {
      clienteIdAdmin = filtros.clienteId;
    } else {
      const todos = await db.select({ id: clientes.id }).from(clientes).orderBy(asc(clientes.nome)).limit(2);
      if (todos.length > 1) return erro("Escolha a empresa do relatório.", 400);
    }
  }
  // Para cliente, `escopoCliente()` ignora qualquer id de cliente e usa o da sessão.
  const escopo = await escopoCliente(clienteIdAdmin);

  // Prestador: o técnico que gera; se a empresa gera, o (primeiro) técnico cadastrado.
  let prestador = sessao.user.name;
  if (!admin) {
    const [tecnico] = await db
      .select({ nome: usuarios.name })
      .from(usuarios)
      .where(eq(usuarios.papel, "admin"))
      .orderBy(asc(usuarios.createdAt))
      .limit(1);
    prestador = tecnico?.nome ?? "Prestador de serviço";
  }

  const dados = await montarDadosRelatorio(escopo, filtros, prestador);
  if (!dados) return erro("Empresa não encontrada.", 404);

  let pdf: Buffer;
  try {
    pdf = await renderToBuffer(DocumentoRelatorio({ dados }));
  } catch (e) {
    console.error("Erro ao gerar o PDF do relatório:", e);
    return erro("Não foi possível gerar o PDF. Tente de novo.", 500);
  }

  const nome = nomeArquivoRelatorio(dados.cliente.nome, filtros.inicio, filtros.fim);
  const baixar = new URL(req.url).searchParams.get("baixar") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Expose-Headers": "Content-Disposition",
    },
  });
}
