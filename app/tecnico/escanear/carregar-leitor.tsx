"use client";

import dynamic from "next/dynamic";
import { CarregandoLista } from "@/components/estados";

/** O leitor só roda no navegador (câmera + WebAssembly): carregado sob demanda, sem renderizar no servidor. */
const LeitorQr = dynamic(() => import("./leitor-qr"), { ssr: false, loading: () => <CarregandoLista linhas={2} /> });

export function CarregarLeitor() {
  return <LeitorQr />;
}
