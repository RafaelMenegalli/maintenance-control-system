import type { z } from "zod";

/** Erro previsto de uma rota de API: vira JSON `{ erro }` com o status indicado. */
export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number = 400,
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

/** Lê o corpo JSON e valida com Zod. A primeira mensagem de erro (em português) vai para o usuário. */
export async function lerCorpo<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ErroApi("Os dados enviados estão incompletos. Tente de novo.", 400);
  }
  const resultado = schema.safeParse(json);
  if (!resultado.success) {
    throw new ErroApi(resultado.error.issues[0]?.message ?? "Dados inválidos.", 400);
  }
  return resultado.data;
}

export function criado(corpo: unknown): Response {
  return Response.json(corpo, { status: 201 });
}

export function idValido(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
