import { describe, expect, it } from "vitest";
import { gerarSenha, mensagemDeAcesso } from "./senha";

describe("gerarSenha", () => {
  it("gera senha legível com pelo menos 8 caracteres, sem letras confusas", () => {
    for (let i = 0; i < 200; i++) {
      const s = gerarSenha();
      expect(s).toMatch(/^[a-hj-km-np-z2-9]{5}-[a-hj-km-np-z2-9]{5}$/);
      expect(s.length).toBeGreaterThanOrEqual(8);
    }
  });
  it("não repete", () => {
    expect(new Set(Array.from({ length: 50 }, gerarSenha)).size).toBe(50);
  });
});

describe("mensagemDeAcesso", () => {
  it("leva link, e-mail e senha", () => {
    const m = mensagemDeAcesso({ nome: "Maria Souza", empresa: "Condomínio X", link: "https://app.exemplo.com", email: "maria@x.com", senha: "abcde-fghjk" });
    expect(m).toContain("Olá, Maria!");
    expect(m).toContain("Endereço: https://app.exemplo.com");
    expect(m).toContain("E-mail: maria@x.com");
    expect(m).toContain("Senha: abcde-fghjk");
  });
});
