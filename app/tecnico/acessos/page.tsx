import type { Metadata } from "next";
import { Home, KeyRound } from "lucide-react";
import { Tela } from "@/components/tecnico/tela";
import { TelaVazia } from "@/components/tela-vazia";

export const metadata: Metadata = { title: "Acessos" };

export default function PaginaAcessos() {
  return (
    <Tela titulo="Acessos">
      <TelaVazia
        icone={KeyRound}
        titulo="Acessos da empresa"
        descricao="Aqui você vai criar o acesso da empresa cliente, redefinir a senha e desativar o acesso quando precisar. Esta tela será liberada nas próximas etapas."
        acao={{ rotulo: "Voltar ao início", href: "/tecnico", icone: Home }}
      />
    </Tela>
  );
}
