"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type Props = Omit<ComponentProps<typeof Button>, "onClick" | "children">;

/** Botão "Sair" (ícone + texto). Encerra a sessão e volta para o login. */
export function BotaoSair({ variant = "outline", ...props }: Props) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant={variant} onClick={sair} disabled={saindo} {...props}>
      {saindo ? <Spinner /> : <LogOut aria-hidden />}
      {saindo ? "Saindo..." : "Sair"}
    </Button>
  );
}
