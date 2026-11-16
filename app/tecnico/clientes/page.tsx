import type { Metadata } from "next";
import { Tela } from "@/components/tecnico/tela";
import { ListaClientes } from "./lista-clientes";

export const metadata: Metadata = { title: "Clientes e locais" };

export default function PaginaClientes() {
  return (
    <Tela exigeInternet titulo="Clientes e locais">
      <ListaClientes />
    </Tela>
  );
}
