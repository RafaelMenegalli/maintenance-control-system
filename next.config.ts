import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger (Node.js Web Apps): o deploy aplica `output: "standalone"` sozinho e inicia o
  // servidor próprio. Por isso NÃO definimos `output` aqui — assim `pnpm build` + `pnpm start`
  // continuam funcionando como um servidor Node comum. Mantenha este arquivo como objeto
  // (não exporte uma função), senão a Hostinger perde a configuração. (`withSerwist` devolve
  // um objeto.)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Service worker (PWA/offline): ver app/sw.ts e app/serwist/[path]/route.ts.
export default withSerwist(nextConfig);
