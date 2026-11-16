/**
 * Gera os ícones do app (PWA) em public/icons/ a partir de um desenho simples (chave inglesa branca
 * sobre o azul do tema). Rode `node scripts/gerar-icones.mjs` se quiser trocar o desenho;
 * os PNG já gerados ficam no repositório.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const AZUL = "#004a9c";
const CHAVE =
  "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";

/** `margem`: fração da área livre em volta do desenho (ícone "maskable" precisa de zona segura). */
function svg(tamanho, { arredondado, margem }) {
  const area = tamanho * (1 - margem * 2);
  const escala = area / 24;
  const desloc = (tamanho - area) / 2;
  const raio = arredondado ? tamanho * 0.22 : 0;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
      <rect width="${tamanho}" height="${tamanho}" rx="${raio}" fill="${AZUL}"/>
      <g transform="translate(${desloc} ${desloc}) scale(${escala})" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${CHAVE}"/>
      </g>
    </svg>`,
  );
}

const saida = path.join(process.cwd(), "public", "icons");
await mkdir(saida, { recursive: true });

const icones = [
  ["icone-192.png", 192, { arredondado: true, margem: 0.2 }],
  ["icone-512.png", 512, { arredondado: true, margem: 0.2 }],
  // Maskable: fundo azul até a borda e desenho dentro dos 80% centrais.
  ["icone-maskable-512.png", 512, { arredondado: false, margem: 0.3 }],
  ["apple-touch-icon.png", 180, { arredondado: false, margem: 0.2 }],
];

for (const [nome, tamanho, opcoes] of icones) {
  await sharp(svg(tamanho, opcoes)).png().toFile(path.join(saida, nome));
  console.log("✓", nome);
}
