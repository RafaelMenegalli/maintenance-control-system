import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { Instrucoes } from "./instrucoes";

export const metadata: Metadata = { title: "Instalar no celular" };

/** Passo a passo para instalar o app (funciona offline: está na lista de telas guardadas). */
export default function PaginaInstalar() {
  return (
    <Tela titulo="Instalar no celular" voltarHref="/tecnico">
      <Instrucoes />
    </Tela>
  );
}
