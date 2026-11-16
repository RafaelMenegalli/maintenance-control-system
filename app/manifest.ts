import type { MetadataRoute } from "next";

/** Manifesto do app instalável (PWA). O app abre direto na área do técnico. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Controle de Manutenções",
    short_name: "Manutenções",
    description: "Registro e comprovação de manutenções, com funcionamento sem internet.",
    lang: "pt-BR",
    dir: "ltr",
    id: "/tecnico",
    start_url: "/tecnico",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#004a9c",
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
