import type { Metadata } from "next";
import { ClipboardList, Search } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Registrar serviço" };

export default function PaginaRegistrarServico() {
  return (
    <Tela titulo="Registrar serviço" voltarHref="/tecnico">
      <TelaVazia
        icone={ClipboardList}
        titulo="Registro de serviço"
        descricao="Aqui você vai escolher o equipamento, marcar o checklist, escrever o que foi feito e tirar as fotos de antes e depois. Funcionará mesmo sem internet. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Escolher equipamento", href: "/tecnico/equipamentos", icone: Search }}
      />
    </Tela>
  );
}
