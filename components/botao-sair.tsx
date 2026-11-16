"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { contarPendencias } from "@/lib/tecnico/sync/pendencias";
import { limparDadosAoSair } from "@/lib/tecnico/sync/sessao";

type Props = Omit<ComponentProps<typeof Button>, "onClick" | "children">;

/**
 * Botão "Sair" (ícone + texto). Encerra a sessão e volta para o login.
 * Se há serviços ainda não enviados, avisa antes (eles continuam guardados no celular).
 */
export function BotaoSair({ variant = "outline", ...props }: Props) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [avisando, setAvisando] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await authClient.signOut();
      await limparDadosAoSair();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  async function aoClicar() {
    const n = await contarPendencias();
    if (n > 0) {
      setPendentes(n);
      setAvisando(true);
    } else {
      await sair();
    }
  }

  return (
    <>
      <Button variant={variant} onClick={aoClicar} disabled={saindo} {...props}>
        {saindo ? <Spinner /> : <LogOut aria-hidden />}
        {saindo ? "Saindo..." : "Sair"}
      </Button>
      <DialogoConfirmacao
        aberto={avisando}
        onAbertoChange={setAvisando}
        titulo="Há serviços que ainda não foram enviados"
        descricao={`${pendentes === 1 ? "1 serviço está salvo" : `${pendentes} serviços estão salvos`} só neste celular. Se você sair agora, ${pendentes === 1 ? "ele continua guardado" : "eles continuam guardados"} e ${pendentes === 1 ? "é enviado" : "são enviados"} quando você entrar de novo com internet. Para enviar agora, conecte-se à internet e toque no aviso de envio no topo da tela.`}
        rotuloConfirmar="Sair mesmo assim"
        onConfirmar={sair}
        destrutivo
      />
    </>
  );
}
