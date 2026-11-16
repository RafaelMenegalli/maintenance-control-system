"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type Erros = Partial<Record<"atual" | "nova" | "repetir", string>>;

export function FormularioSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novos: Erros = {};
    if (!atual) novos.atual = "Digite a sua senha de agora.";
    if (nova.length < 8) novos.nova = "A senha nova precisa ter pelo menos 8 caracteres.";
    else if (nova === atual) novos.nova = "Escolha uma senha diferente da de agora.";
    if (repetir !== nova) novos.repetir = "As duas senhas novas não são iguais.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: atual,
        newPassword: nova,
        // Se alguém mais estiver logado com a senha antiga, sai.
        revokeOtherSessions: true,
      });
      if (error) {
        const errada = /senha|password|credential/i.test(`${error.code ?? ""} ${error.message ?? ""}`);
        setErros(errada ? { atual: "A senha de agora está errada. Confira e tente de novo." } : {});
        toast.error(errada ? "A senha de agora está errada." : "Não foi possível alterar a senha. Tente de novo.");
        return;
      }
      toast.success("Senha alterada");
      setAtual("");
      setNova("");
      setRepetir("");
    } catch {
      toast.error("Sem internet. Conecte-se e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erros.atual}>
          <FieldLabel htmlFor="senha-atual">Senha de agora</FieldLabel>
          <Input id="senha-atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} aria-invalid={!!erros.atual} />
          {erros.atual && <FieldError>{erros.atual}</FieldError>}
        </Field>
        <Field data-invalid={!!erros.nova}>
          <FieldLabel htmlFor="senha-nova">Senha nova</FieldLabel>
          <Input id="senha-nova" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} aria-invalid={!!erros.nova} />
          {erros.nova && <FieldError>{erros.nova}</FieldError>}
        </Field>
        <Field data-invalid={!!erros.repetir}>
          <FieldLabel htmlFor="senha-repetir">Repita a senha nova</FieldLabel>
          <Input id="senha-repetir" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} aria-invalid={!!erros.repetir} />
          {erros.repetir && <FieldError>{erros.repetir}</FieldError>}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? <Spinner /> : <Save aria-hidden />}
          {enviando ? "Salvando..." : "Salvar senha nova"}
        </Button>
      </FieldGroup>
    </form>
  );
}
