import { limparDadosBaixados } from "@/lib/tecnico/data/banco";

/**
 * Ao sair: apaga do celular o que foi baixado do servidor (equipamentos, serviços, telas e miniaturas em cache).
 * A FILA de serviços aguardando envio NUNCA é apagada: ela continua guardada e sobe quando alguém entrar de novo.
 */
export async function limparDadosAoSair(): Promise<void> {
  try {
    await limparDadosBaixados();
  } catch {
    /* sem IndexedDB: nada a limpar */
  }
  try {
    if (typeof caches !== "undefined") {
      for (const nome of await caches.keys()) {
        if (nome.startsWith("paginas-") || nome === "fotos-miniaturas") await caches.delete(nome);
      }
    }
  } catch {
    /* sem Cache API: nada a limpar */
  }
}
