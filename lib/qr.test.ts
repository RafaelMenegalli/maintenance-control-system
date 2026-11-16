import { describe, expect, it } from "vitest";
import { extrairIdDoQr } from "./qr";

const ID = "6577a85e-73f8-4427-bf78-f677a727d195";

describe("extrairIdDoQr", () => {
  it("lê o endereço completo, de qualquer domínio", () => {
    expect(extrairIdDoQr(`https://manutencoes.exemplo.com.br/e/${ID}`)).toBe(ID);
    expect(extrairIdDoQr(`http://localhost:3000/e/${ID}`)).toBe(ID);
    expect(extrairIdDoQr(`  https://x.com/e/${ID}/  `)).toBe(ID);
    expect(extrairIdDoQr(`https://x.com/e/${ID}?origem=qr#topo`)).toBe(ID);
  });
  it("lê o caminho e o id puro (e normaliza maiúsculas)", () => {
    expect(extrairIdDoQr(`/e/${ID}`)).toBe(ID);
    expect(extrairIdDoQr(ID.toUpperCase())).toBe(ID);
  });
  it("recusa QR que não é de equipamento", () => {
    expect(extrairIdDoQr("https://exemplo.com")).toBeNull();
    expect(extrairIdDoQr(`https://exemplo.com/outro/${ID}`)).toBeNull();
    expect(extrairIdDoQr("/e/123")).toBeNull();
    expect(extrairIdDoQr("")).toBeNull();
    expect(extrairIdDoQr(`https://exemplo.com/e/${ID}x`)).toBeNull();
  });
});
