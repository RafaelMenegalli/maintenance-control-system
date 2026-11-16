"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.email("Digite um e-mail válido, por exemplo nome@empresa.com.br"),
  senha: z.string().min(1, "Digite a sua senha"),
});
type Dados = z.infer<typeof schema>;

/** Traduz o erro do Better Auth para uma frase que diz o que fazer. */
function mensagemDeErro(erro: { code?: string; status?: number; message?: string }): string {
  if (erro.code === "USUARIO_INATIVO") {
    return "Este acesso está desativado. Fale com o técnico responsável.";
  }
  if (erro.status === 401 || erro.code === "INVALID_EMAIL_OR_PASSWORD") {
    return "E-mail ou senha incorretos. Confira os dados e tente de novo.";
  }
  if (erro.status === 429) {
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  }
  if (erro.status === 0 || erro.status === undefined) {
    return "Não foi possível conectar. Verifique a sua internet e tente de novo.";
  }
  return "Não foi possível entrar agora. Tente de novo em instantes.";
}

export function FormularioLogin({ voltar }: { voltar?: string }) {
  const router = useRouter();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(schema), defaultValues: { email: "", senha: "" } });

  async function entrar(dados: Dados) {
    setErroGeral(null);
    try {
      const { error } = await authClient.signIn.email({
        email: dados.email.trim(),
        password: dados.senha,
      });
      if (error) {
        setErroGeral(mensagemDeErro(error));
        return;
      }
      // Sem destino pedido, a raiz decide: técnico → /tecnico, empresa → /portal.
      router.replace(voltar ?? "/");
      router.refresh();
    } catch {
      setErroGeral(mensagemDeErro({ status: 0 }));
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(entrar)} noValidate>
          <FieldGroup>
            {erroGeral && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Não foi possível entrar</AlertTitle>
                <AlertDescription>{erroGeral}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={!!errors.senha}>
              <FieldLabel htmlFor="senha">Senha</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={!!errors.senha}
                  {...register("senha")}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-pressed={mostrarSenha}
                  >
                    {mostrarSenha ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    {mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError errors={[errors.senha]} />
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : <LogIn aria-hidden />}
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
