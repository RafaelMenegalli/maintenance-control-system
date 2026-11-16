import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { fotos, servicos } from "@/db/schema";
import { ErroApi } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { normalizarFoto, TAMANHO_MAXIMO_BYTES, TIPOS_ACEITOS } from "@/lib/fotos/processar";
import { chaveFoto, armazenamento } from "@/lib/storage";

export const dynamic = "force-dynamic";

const campos = z.object({
  fotoId: z.uuid("Foto inválida"),
  servicoId: z.uuid("Serviço inválido"),
  momento: z.enum(["antes", "depois"], { error: "Informe se a foto é de antes ou depois" }),
});

/**
 * Recebe uma foto (multipart/form-data: fotoId, servicoId, momento, arquivo). Só admin.
 * IDEMPOTENTE: se a foto com este id já existe, responde sucesso sem regravar.
 *
 * As fotos chegam ANTES do serviço (a ordem do envio é fotos → serviço, igual na sincronização
 * offline). Como `fotos.servico_id` tem chave estrangeira, a linha da foto é criada aqui só se
 * o serviço já existir; senão, o endpoint de serviços a cria ao salvar o serviço (ver
 * lib/tecnico/servicos.ts). O arquivo em disco é a prova de que a foto foi recebida.
 */
export function POST(req: Request) {
  return comAdminApi(async () => {
    const form = await req.formData().catch(() => {
      throw new ErroApi("Não foi possível ler a foto enviada.", 400);
    });
    const parsed = campos.safeParse({
      fotoId: form.get("fotoId"),
      servicoId: form.get("servicoId"),
      momento: form.get("momento"),
    });
    if (!parsed.success) throw new ErroApi(parsed.error.issues[0]?.message ?? "Dados inválidos.", 400);
    const { fotoId, servicoId, momento } = parsed.data;

    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) throw new ErroApi("Envie o arquivo da foto.", 400);
    if (!(TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) {
      throw new ErroApi("A foto precisa ser JPEG, PNG ou WebP.", 415);
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      throw new ErroApi("A foto é grande demais (máximo de 2 MB).", 413);
    }

    // Idempotência: já recebida e registrada → sucesso sem regravar.
    const [existente] = await db.select({ id: fotos.id }).from(fotos).where(eq(fotos.id, fotoId)).limit(1);
    if (existente) return { ok: true, jaExistia: true, registrada: true };

    const chave = chaveFoto(servicoId, fotoId);
    let largura: number | null = null;
    let altura: number | null = null;

    if (!(await armazenamento.existe(chave))) {
      let processada;
      try {
        processada = await normalizarFoto(Buffer.from(await arquivo.arrayBuffer()));
      } catch {
        throw new ErroApi("Este arquivo não parece ser uma foto válida.", 415);
      }
      await armazenamento.salvar(chave, processada.jpeg);
      largura = processada.largura;
      altura = processada.altura;
    }

    const [servico] = await db.select({ id: servicos.id }).from(servicos).where(eq(servicos.id, servicoId)).limit(1);
    if (!servico) return { ok: true, jaExistia: false, registrada: false };

    await db
      .insert(fotos)
      .values({ id: fotoId, servicoId, momento, storageKey: chave, largura, altura })
      .onConflictDoNothing({ target: fotos.id });
    return { ok: true, jaExistia: false, registrada: true };
  });
}
