"use client";

import { Ban, Check, Copy, KeyRound, Plus, RefreshCw, RotateCcw, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DialogoConfirmacao } from "@/components/dialogo-confirmacao";
import { DialogoResponsivo } from "@/components/dialogo-responsivo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Acesso } from "@/lib/auth/acessos";
import { gerarSenha, mensagemDeAcesso } from "@/lib/auth/senha";
import { cn } from "@/lib/utils";

type Cliente = { id: string; nome: string };

/** Chama a API e devolve o JSON; erros viram `Error` com a mensagem em português. */
async function chamarApi<T>(url: string, metodo: "POST" | "PATCH", corpo: unknown): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  } catch {
    throw new Error("Sem internet. Conecte-se e tente de novo.");
  }
  const json = (await resposta.json().catch(() => null)) as (T & { erro?: string }) | null;
  if (!resposta.ok) throw new Error(json?.erro ?? "Não foi possível concluir. Tente de novo.");
  return json as T;
}

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
  }
}

/** Dados que o técnico precisa enviar para a empresa (mostrados uma única vez: a senha não fica guardada em lugar nenhum). */
type Entrega = { nome: string; email: string; empresa: string; senha: string; titulo: string };

export function GerenciarAcessos({
  acessos,
  clientes,
  meuId,
}: {
  acessos: Acesso[];
  clientes: Cliente[];
  meuId: string;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [redefinindo, setRedefinindo] = useState<Acesso | null>(null);
  const [alterandoSituacao, setAlterandoSituacao] = useState<Acesso | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" className="w-full sm:w-auto sm:self-start" onClick={() => setCriando(true)} disabled={clientes.length === 0}>
        <Plus aria-hidden />
        Novo acesso da empresa
      </Button>
      {clientes.length === 0 && (
        <p className="text-muted-foreground">Cadastre uma empresa em &quot;Clientes e locais&quot; antes de criar o acesso dela.</p>
      )}

      <ul className="flex flex-col gap-3">
        {acessos.map((a) => {
          const sou = a.id === meuId;
          return (
            <li key={a.id}>
              <Card className={cn(!a.ativo && "bg-muted/40")}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg leading-tight font-bold">
                        {a.nome}
                        {sou && <span className="font-normal text-muted-foreground"> (você)</span>}
                      </p>
                      <p className="text-base break-all text-muted-foreground">{a.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-sm">
                        {a.papel === "admin" ? "Técnico" : "Empresa"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-2 text-sm font-semibold",
                          a.ativo
                            ? "border-em-dia-border bg-em-dia text-em-dia-foreground"
                            : "border-sem-registro-border bg-sem-registro text-sem-registro-foreground",
                        )}
                      >
                        {a.ativo ? <UserCheck className="size-4" aria-hidden /> : <Ban className="size-4" aria-hidden />}
                        {a.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  {a.clienteNome && (
                    <p>
                      <span className="text-muted-foreground">Empresa:</span> <span className="font-medium">{a.clienteNome}</span>
                    </p>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" onClick={() => setRedefinindo(a)}>
                      <KeyRound aria-hidden />
                      Redefinir senha
                    </Button>
                    {sou ? (
                      <p className="flex items-center text-muted-foreground">Você não pode desativar o seu próprio acesso.</p>
                    ) : (
                      <Button variant="outline" onClick={() => setAlterandoSituacao(a)}>
                        {a.ativo ? <Ban aria-hidden /> : <RotateCcw aria-hidden />}
                        {a.ativo ? "Desativar acesso" : "Reativar acesso"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* Novo acesso */}
      <DialogoResponsivo
        aberto={criando}
        onAbertoChange={setCriando}
        titulo="Novo acesso da empresa"
        descricao="A pessoa da empresa vai entrar no portal para ver os equipamentos, o histórico e os relatórios."
      >
        {criando && (
          <FormularioNovoAcesso
            clientes={clientes}
            aoCriar={(dados) => {
              setCriando(false);
              setEntrega({ ...dados, titulo: "Acesso criado" });
              router.refresh();
            }}
          />
        )}
      </DialogoResponsivo>

      {/* Mensagem pronta (depois de criar ou redefinir) */}
      <DialogoResponsivo
        aberto={!!entrega}
        onAbertoChange={(v) => !v && setEntrega(null)}
        titulo={entrega?.titulo ?? ""}
        descricao="Copie a mensagem e envie para a empresa pelo WhatsApp. A senha só aparece agora."
      >
        {entrega && <MensagemPronta entrega={entrega} aoFechar={() => setEntrega(null)} />}
      </DialogoResponsivo>

      {/* Redefinir senha */}
      {redefinindo && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setRedefinindo(null)}
          titulo={`Redefinir a senha de ${redefinindo.nome}?`}
          descricao="O sistema cria uma senha nova. A senha de agora deixa de funcionar e a pessoa será desconectada de onde estiver logada."
          rotuloConfirmar="Redefinir senha"
          onConfirmar={async () => {
            const senha = gerarSenha();
            try {
              await chamarApi(`/api/tecnico/acessos/${redefinindo.id}`, "PATCH", { acao: "redefinir_senha", senha });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Não foi possível redefinir a senha.");
              throw e;
            }
            setEntrega({
              nome: redefinindo.nome,
              email: redefinindo.email,
              empresa: redefinindo.clienteNome ?? "empresa",
              senha,
              titulo: "Senha redefinida",
            });
          }}
        />
      )}

      {/* Desativar / reativar */}
      {alterandoSituacao && (
        <DialogoConfirmacao
          aberto
          onAbertoChange={(v) => !v && setAlterandoSituacao(null)}
          destrutivo={alterandoSituacao.ativo}
          titulo={alterandoSituacao.ativo ? `Desativar o acesso de ${alterandoSituacao.nome}?` : `Reativar o acesso de ${alterandoSituacao.nome}?`}
          descricao={
            alterandoSituacao.ativo
              ? "A pessoa será desconectada agora e não consegue mais entrar. Nada é apagado: você pode reativar o acesso quando quiser."
              : "A pessoa volta a poder entrar com o e-mail e a senha dela."
          }
          rotuloConfirmar={alterandoSituacao.ativo ? "Desativar acesso" : "Reativar acesso"}
          onConfirmar={async () => {
            try {
              await chamarApi(`/api/tecnico/acessos/${alterandoSituacao.id}`, "PATCH", {
                acao: "definir_ativo",
                ativo: !alterandoSituacao.ativo,
              });
              toast.success(alterandoSituacao.ativo ? "Acesso desativado" : "Acesso reativado");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Não foi possível concluir.");
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────── Formulário ─────────────────────────

function FormularioNovoAcesso({
  clientes,
  aoCriar,
}: {
  clientes: Cliente[];
  aoCriar: (dados: Omit<Entrega, "titulo">) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  // Com 1 empresa só, nada é perguntado.
  const [clienteId, setClienteId] = useState(clientes.length === 1 ? clientes[0].id : "");
  const [senha, setSenha] = useState(() => gerarSenha());
  const [erros, setErros] = useState<Partial<Record<"nome" | "email" | "clienteId" | "senha", string>>>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novos: typeof erros = {};
    if (nome.trim().length < 2) novos.nome = "Preencha o nome de quem vai usar o acesso.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) novos.email = "Preencha um e-mail válido.";
    if (!clienteId) novos.clienteId = "Escolha a empresa deste acesso.";
    if (senha.length < 8) novos.senha = "A senha precisa ter pelo menos 8 caracteres.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      await chamarApi("/api/tecnico/acessos", "POST", { nome, email, clienteId, senha });
      toast.success("Acesso criado");
      aoCriar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        empresa: clientes.find((c) => c.id === clienteId)?.nome ?? "empresa",
        senha,
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível criar o acesso.";
      setErros({ email: /e-mail/i.test(mensagem) ? mensagem : undefined });
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erros.nome}>
          <FieldLabel htmlFor="acesso-nome">Nome da pessoa</FieldLabel>
          <Input id="acesso-nome" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={!!erros.nome} />
          {erros.nome && <FieldError>{erros.nome}</FieldError>}
        </Field>

        <Field data-invalid={!!erros.email}>
          <FieldLabel htmlFor="acesso-email">E-mail (é o que ela usa para entrar)</FieldLabel>
          <Input
            id="acesso-email"
            type="email"
            autoComplete="off"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!erros.email}
          />
          {erros.email && <FieldError>{erros.email}</FieldError>}
        </Field>

        {clientes.length > 1 && (
          <Field data-invalid={!!erros.clienteId}>
            <FieldLabel htmlFor="acesso-empresa">Empresa</FieldLabel>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger id="acesso-empresa" className="w-full" aria-invalid={!!erros.clienteId}>
                <SelectValue placeholder="Escolha a empresa" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erros.clienteId && <FieldError>{erros.clienteId}</FieldError>}
          </Field>
        )}

        <Field data-invalid={!!erros.senha}>
          <FieldLabel htmlFor="acesso-senha">Senha inicial</FieldLabel>
          <InputGroup>
            <InputGroupInput id="acesso-senha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="off" aria-invalid={!!erros.senha} />
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={() => copiar(senha, "Senha copiada")}>
                <Copy aria-hidden />
                Copiar
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Button type="button" variant="outline" onClick={() => setSenha(gerarSenha())}>
            <RefreshCw aria-hidden />
            Gerar senha
          </Button>
          <FieldDescription>Pelo menos 8 caracteres. A pessoa pode pedir outra depois.</FieldDescription>
          {erros.senha && <FieldError>{erros.senha}</FieldError>}
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? <Spinner /> : <Check aria-hidden />}
          {enviando ? "Criando..." : "Criar acesso"}
        </Button>
      </FieldGroup>
    </form>
  );
}

// ───────────────────────── Mensagem para o WhatsApp ─────────────────────────

function MensagemPronta({ entrega, aoFechar }: { entrega: Entrega; aoFechar: () => void }) {
  const link = typeof window === "undefined" ? "" : window.location.origin;
  const mensagem = mensagemDeAcesso({ ...entrega, link });
  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="mensagem-acesso">Mensagem para enviar à empresa</FieldLabel>
        <Textarea id="mensagem-acesso" readOnly rows={9} value={mensagem} onFocus={(e) => e.currentTarget.select()} />
      </Field>
      <Button size="lg" className="w-full" onClick={() => copiar(mensagem, "Mensagem copiada")}>
        <Copy aria-hidden />
        Copiar mensagem
      </Button>
      <Button size="lg" variant="outline" className="w-full" onClick={aoFechar}>
        Pronto
      </Button>
    </div>
  );
}
