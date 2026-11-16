import type { Metadata } from "next";
import { ScanLine, Search } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Escanear" };

export default function PaginaEscanear() {
  return (
    <Tela titulo="Escanear">
      <TelaVazia
        icone={ScanLine}
        titulo="Leitor de QR Code"
        descricao="Aqui você vai apontar a câmera para a etiqueta de um equipamento para abrir o histórico dele na hora. É só um atalho: você sempre pode procurar o equipamento pela lista. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Procurar na lista", href: "/tecnico/equipamentos", icone: Search }}
      />
    </Tela>
  );
}
