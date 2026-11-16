import type { Metadata } from "next";
import { Building2, Wrench } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Clientes e locais" };

export default function PaginaClientes() {
  return (
    <Tela titulo="Clientes e locais">
      <TelaVazia
        icone={Building2}
        titulo="Clientes e locais"
        descricao="Aqui você vai cadastrar as empresas atendidas e os locais de cada uma (por exemplo, Bloco A e Cobertura). Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Ver equipamentos", href: "/tecnico/equipamentos", icone: Wrench }}
      />
    </Tela>
  );
}
