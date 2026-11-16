import type { Metadata } from "next";
import { QrCode, Wrench } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Etiquetas QR" };

export default function PaginaEtiquetas() {
  return (
    <Tela titulo="Etiquetas QR">
      <TelaVazia
        icone={QrCode}
        titulo="Etiquetas com QR Code"
        descricao="Aqui você vai escolher equipamentos e imprimir etiquetas com QR Code, várias por folha A4, para colar nos equipamentos. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver equipamentos", href: "/tecnico/equipamentos", icone: Wrench }}
      />
    </Tela>
  );
}
