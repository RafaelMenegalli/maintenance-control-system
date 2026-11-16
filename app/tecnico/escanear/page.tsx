import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { CarregarLeitor } from "./carregar-leitor";

export const metadata: Metadata = { title: "Escanear QR Code" };

/** Leitor de QR (funciona offline). O leitor ocupa a tela toda; esta página só o carrega. */
export default function PaginaEscanear() {
  return (
    <Tela titulo="Escanear QR Code" voltarHref="/tecnico">
      <CarregarLeitor />
    </Tela>
  );
}
