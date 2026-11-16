import { eq } from "drizzle-orm";
import { db } from "@/db";
import { equipamentos, fotos, locais, servicos } from "@/db/schema";
import { idValido } from "@/lib/api";
import { escopoCliente, getSessao } from "@/lib/auth/permissoes";
import { garantirMiniatura } from "@/lib/fotos/miniatura";
import { armazenamento, chaveFoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

const naoEncontrada = () => Response.json({ erro: "Foto não encontrada." }, { status: 404 });

/**
 * Entrega a foto SÓ para quem tem permissão — fotos nunca ficam públicas.
 * - sem login → 401
 * - admin → qualquer foto
 * - cliente → só fotos de equipamentos do próprio cliente (via `escopoCliente()`)
 * Foto de outro cliente responde 404 (não revela que existe).
 * `?tamanho=miniatura` devolve uma miniatura (~400 px), gerada e guardada na primeira vez.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sessao = await getSessao();
  if (!sessao) return Response.json({ erro: "Entre para ver as fotos." }, { status: 401 });
  if (!idValido(id)) return naoEncontrada();

  const [foto] = await db
    .select({ servicoId: fotos.servicoId, clienteId: locais.clienteId })
    .from(fotos)
    .innerJoin(servicos, eq(servicos.id, fotos.servicoId))
    .innerJoin(equipamentos, eq(equipamentos.id, servicos.equipamentoId))
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .where(eq(fotos.id, id))
    .limit(1);
  if (!foto) return naoEncontrada();

  if (sessao.user.papel !== "admin") {
    const escopo = await escopoCliente();
    if (escopo.clienteId !== foto.clienteId) return naoEncontrada();
  }

  const miniatura = new URL(req.url).searchParams.get("tamanho") === "miniatura";
  let chave = chaveFoto(foto.servicoId, id);

  if (miniatura) {
    const chaveMini = await garantirMiniatura(foto.servicoId, id);
    if (!chaveMini) return naoEncontrada();
    chave = chaveMini;
  }

  const arquivo = await armazenamento.lerStream(chave);
  if (!arquivo) return naoEncontrada();

  return new Response(arquivo.stream, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(arquivo.tamanho),
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
