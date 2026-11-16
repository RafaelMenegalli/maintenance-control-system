import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { equipamentos, fotos, locais, servicos, tiposEquipamento, usuarios } from "@/db/schema";
import { ErroApi } from "@/lib/api";
import { dimensoes } from "@/lib/fotos/processar";
import { servicoEdicaoSchema, servicoInputSchema } from "@/lib/schemas/entidades";
import { armazenamento, chaveFoto, chaveMiniatura } from "@/lib/storage";
import type { ServicoRecente } from "@/lib/tecnico/data/types";

type Criar = z.output<typeof servicoInputSchema>;
type Editar = z.output<typeof servicoEdicaoSchema>;
type FotoDoServico = Criar["fotos"][number];

/**
 * Escritas e consultas de serviços do técnico (admin). Sempre chamadas depois de `comAdminApi()`.
 */

/** Cria as linhas de `fotos` para fotos cujo arquivo já foi recebido (POST /api/fotos). */
async function registrarFotos(servicoId: string, lista: FotoDoServico[]) {
  const registradas: string[] = [];
  const faltando: string[] = [];
  for (const f of lista) {
    const chave = chaveFoto(servicoId, f.id);
    const arquivo = await armazenamento.ler(chave);
    if (!arquivo) {
      faltando.push(f.id);
      continue;
    }
    const { largura, altura } = await dimensoes(arquivo);
    await db
      .insert(fotos)
      .values({ id: f.id, servicoId, momento: f.momento, storageKey: chave, largura, altura })
      .onConflictDoNothing({ target: fotos.id });
    registradas.push(f.id);
  }
  return { registradas, faltando };
}

async function removerArquivosDaFoto(servicoId: string, fotoId: string) {
  await armazenamento.remover(chaveFoto(servicoId, fotoId));
  await armazenamento.remover(chaveMiniatura(servicoId, fotoId));
}

/**
 * Cria o serviço. IDEMPOTENTE: `insert ... on conflict (id) do nothing` — enviar o mesmo serviço
 * duas vezes (duplo toque, reenvio depois de falha de rede) não duplica nada.
 */
export async function criarServico(dados: Criar, usuarioId: string) {
  const [equipamento] = await db
    .select({ id: equipamentos.id })
    .from(equipamentos)
    .where(eq(equipamentos.id, dados.equipamentoId))
    .limit(1);
  if (!equipamento) throw new ErroApi("Equipamento não encontrado.", 404);

  const inseridos = await db
    .insert(servicos)
    .values({
      id: dados.id,
      equipamentoId: dados.equipamentoId,
      tipo: dados.tipo,
      data: dados.data,
      descricao: dados.descricao,
      checklist: dados.checklist,
      proximaData: dados.proximaData ?? null,
      criadoPor: usuarioId,
      sincronizadoEm: new Date(),
    })
    .onConflictDoNothing({ target: servicos.id })
    .returning({ id: servicos.id });

  // Mesmo se o serviço já existia, garante que as fotos listadas estejam registradas.
  const { faltando } = await registrarFotos(dados.id, dados.fotos);
  return { id: dados.id, criado: inseridos.length > 0, fotosFaltando: faltando };
}

export async function editarServico(id: string, dados: Editar) {
  const [atual] = await db.select({ id: servicos.id }).from(servicos).where(eq(servicos.id, id)).limit(1);
  if (!atual) throw new ErroApi("Serviço não encontrado.", 404);

  await db
    .update(servicos)
    .set({
      tipo: dados.tipo,
      data: dados.data,
      descricao: dados.descricao,
      checklist: dados.checklist,
      proximaData: dados.proximaData ?? null,
    })
    .where(eq(servicos.id, id));

  if (dados.fotosRemovidas.length > 0) {
    const doServico = await db
      .select({ id: fotos.id })
      .from(fotos)
      .where(and(eq(fotos.servicoId, id), inArray(fotos.id, dados.fotosRemovidas)));
    for (const f of doServico) {
      await db.delete(fotos).where(eq(fotos.id, f.id));
      await removerArquivosDaFoto(id, f.id);
    }
  }
  const { faltando } = await registrarFotos(id, dados.fotosNovas);
  return { id, fotosFaltando: faltando };
}

export async function excluirServico(id: string) {
  const linhas = await db.select({ id: fotos.id }).from(fotos).where(eq(fotos.servicoId, id));
  for (const f of linhas) await removerArquivosDaFoto(id, f.id);
  // `fotos` tem ON DELETE CASCADE.
  const removidos = await db
    .delete(servicos)
    .where(eq(servicos.id, id))
    .returning({ id: servicos.id, equipamentoId: servicos.equipamentoId });
  if (removidos.length === 0) throw new ErroApi("Serviço não encontrado.", 404);
  // Serviço apagado não deixa rastro para a sincronização incremental: marcamos o equipamento como
  // alterado, e o celular troca a lista de serviços dele inteira no próximo pull.
  await db.update(equipamentos).set({ atualizadoEm: new Date() }).where(eq(equipamentos.id, removidos[0].equipamentoId));
  return { ok: true };
}

/** Serviços mais recentes de todos os equipamentos (para o painel e para "usados recentemente"). */
export async function listarServicosRecentesAdmin(limite: number): Promise<ServicoRecente[]> {
  const linhas = await db
    .select({
      id: servicos.id,
      data: servicos.data,
      tipo: servicos.tipo,
      criadoEm: servicos.criadoEm,
      equipamentoId: equipamentos.id,
      equipamentoNome: equipamentos.nome,
      localNome: locais.nome,
      tipoEquipamentoNome: tiposEquipamento.nome,
      tipoEquipamentoIcone: tiposEquipamento.icone,
      criadoPorNome: usuarios.name,
    })
    .from(servicos)
    .innerJoin(equipamentos, eq(equipamentos.id, servicos.equipamentoId))
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .innerJoin(tiposEquipamento, eq(tiposEquipamento.id, equipamentos.tipoId))
    .leftJoin(usuarios, eq(usuarios.id, servicos.criadoPor))
    .orderBy(desc(servicos.criadoEm))
    .limit(limite);
  return linhas.map((l) => ({ ...l, criadoEm: l.criadoEm.toISOString() }));
}
