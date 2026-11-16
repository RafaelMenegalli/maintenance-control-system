/** Sem conexão (ou o servidor não respondeu): vale tentar de novo mais tarde. */
export class ErroDeRede extends Error {
  constructor() {
    super("Sem internet.");
    this.name = "ErroDeRede";
  }
}

/** A sessão terminou (401/403): é preciso entrar de novo. Nada da fila é perdido. */
export class ErroDeSessao extends Error {
  constructor() {
    super("Sua sessão terminou. Entre de novo.");
    this.name = "ErroDeSessao";
  }
}

/** O servidor respondeu com erro. `permanente` = repetir a mesma coisa nunca vai dar certo (4xx, menos 408/429). */
export class ErroDoServidor extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
    this.name = "ErroDoServidor";
  }
  get permanente(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429;
  }
}

export type Fetch = typeof fetch;

/** Faz a chamada e traduz os erros no vocabulário acima. Devolve o JSON da resposta. */
export async function chamar<T>(fetchFn: Fetch, url: string, init?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetchFn(url, init);
  } catch {
    throw new ErroDeRede();
  }
  if (resposta.status === 401 || resposta.status === 403) throw new ErroDeSessao();
  if (!resposta.ok) {
    let mensagem = "O servidor não conseguiu concluir. Tente de novo.";
    try {
      mensagem = ((await resposta.json()) as { erro?: string }).erro ?? mensagem;
    } catch {
      /* mantém a mensagem padrão */
    }
    throw new ErroDoServidor(mensagem, resposta.status);
  }
  try {
    return (await resposta.json()) as T;
  } catch {
    // Resposta que não é JSON (ex.: página de erro do provedor): trata como falha temporária.
    throw new ErroDoServidor("Resposta inesperada do servidor.", 502);
  }
}
