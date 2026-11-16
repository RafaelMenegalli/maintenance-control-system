/** Letras e números fáceis de ler e ditar (sem 0/o, 1/l/i). */
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

function sorteio(maximo: number): number {
  // Rejeição para não favorecer os primeiros caracteres (sem "viés de módulo").
  const limite = Math.floor(256 / maximo) * maximo;
  const um = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(um);
    if (um[0] < limite) return um[0] % maximo;
  }
}

/** Senha inicial legível, ex.: "k7mq2-x9ptw" (10 caracteres + hífen; passa dos 8 mínimos). */
export function gerarSenha(): string {
  const trecho = () => Array.from({ length: 5 }, () => ALFABETO[sorteio(ALFABETO.length)]).join("");
  return `${trecho()}-${trecho()}`;
}

/** Mensagem pronta para o técnico enviar à empresa pelo WhatsApp. */
export function mensagemDeAcesso(dados: { nome: string; empresa: string; link: string; email: string; senha: string }): string {
  const primeiroNome = dados.nome.trim().split(/\s+/)[0] ?? "";
  return [
    `Olá, ${primeiroNome}! Seu acesso ao sistema de manutenções da ${dados.empresa} está pronto.`,
    "",
    `Endereço: ${dados.link}`,
    `E-mail: ${dados.email}`,
    `Senha: ${dados.senha}`,
    "",
    "Por aqui você vê os equipamentos, o histórico de serviços com fotos e baixa o relatório em PDF.",
  ].join("\n");
}
