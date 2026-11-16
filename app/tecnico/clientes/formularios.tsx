"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DialogoResponsivo } from "@/components/dialogo-responsivo";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { mascararCnpj } from "@/lib/format";
import { clienteInputSchema, localInputSchema } from "@/lib/schemas/entidades";
import { repositorio, type ClienteDTO, type LocalDTO } from "@/lib/tecnico/data";
import type { z } from "zod";

type DadosCliente = z.input<typeof clienteInputSchema>;
type SaidaCliente = z.output<typeof clienteInputSchema>;
type DadosLocal = z.input<typeof localInputSchema>;
type SaidaLocal = z.output<typeof localInputSchema>;

function BotaoSalvar({ enviando, rotulo }: { enviando: boolean; rotulo: string }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={enviando}>
      {enviando ? <Spinner /> : <Save aria-hidden />}
      {enviando ? "Salvando..." : rotulo}
    </Button>
  );
}

// ───────────────────────── Cliente ─────────────────────────

export function DialogoCliente({
  aberto,
  onAbertoChange,
  cliente,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  /** Se informado, edita este cliente; senão cria um novo. */
  cliente?: ClienteDTO;
}) {
  return (
    <DialogoResponsivo
      aberto={aberto}
      onAbertoChange={onAbertoChange}
      titulo={cliente ? "Editar cliente" : "Novo cliente"}
      descricao="Dados da empresa atendida."
    >
      {/* Remonta o formulário a cada abertura para não sobrar texto da vez anterior. */}
      {aberto && <FormularioCliente cliente={cliente} aoSalvar={() => onAbertoChange(false)} />}
    </DialogoResponsivo>
  );
}

function FormularioCliente({ cliente, aoSalvar }: { cliente?: ClienteDTO; aoSalvar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DadosCliente, unknown, SaidaCliente>({
    resolver: zodResolver(clienteInputSchema),
    defaultValues: { id: cliente?.id, nome: cliente?.nome ?? "", cnpj: cliente?.cnpj ?? "", contato: cliente?.contato ?? "" },
  });

  async function salvar(dados: SaidaCliente) {
    setEnviando(true);
    try {
      await repositorio.salvarCliente({ ...dados, id: cliente?.id ?? crypto.randomUUID() });
      toast.success(cliente ? "Cliente atualizado" : "Cliente salvo");
      aoSalvar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(salvar)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.nome}>
          <FieldLabel htmlFor="cliente-nome">Nome da empresa</FieldLabel>
          <Input id="cliente-nome" autoComplete="organization" aria-invalid={!!errors.nome} {...register("nome")} />
          <FieldError errors={[errors.nome]} />
        </Field>

        <Field data-invalid={!!errors.cnpj}>
          <FieldLabel htmlFor="cliente-cnpj">CNPJ (opcional)</FieldLabel>
          <Controller
            control={control}
            name="cnpj"
            render={({ field }) => (
              <Input
                id="cliente-cnpj"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                aria-invalid={!!errors.cnpj}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(mascararCnpj(e.target.value))}
              />
            )}
          />
          <FieldError errors={[errors.cnpj]} />
        </Field>

        <Field data-invalid={!!errors.contato}>
          <FieldLabel htmlFor="cliente-contato">Contato (opcional)</FieldLabel>
          <Input id="cliente-contato" aria-invalid={!!errors.contato} {...register("contato")} />
          <FieldDescription>Nome, telefone ou e-mail de quem atende.</FieldDescription>
          <FieldError errors={[errors.contato]} />
        </Field>

        <BotaoSalvar enviando={enviando} rotulo="Salvar cliente" />
      </FieldGroup>
    </form>
  );
}

// ───────────────────────── Local ─────────────────────────

export function DialogoLocal({
  aberto,
  onAbertoChange,
  cliente,
  local,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  cliente: ClienteDTO;
  /** Se informado, edita este local; senão cria um novo no cliente. */
  local?: LocalDTO;
}) {
  return (
    <DialogoResponsivo
      aberto={aberto}
      onAbertoChange={onAbertoChange}
      titulo={local ? "Editar local" : "Novo local"}
      descricao={`Local dentro de ${cliente.nome}.`}
    >
      {aberto && <FormularioLocal cliente={cliente} local={local} aoSalvar={() => onAbertoChange(false)} />}
    </DialogoResponsivo>
  );
}

function FormularioLocal({ cliente, local, aoSalvar }: { cliente: ClienteDTO; local?: LocalDTO; aoSalvar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DadosLocal, unknown, SaidaLocal>({
    resolver: zodResolver(localInputSchema),
    defaultValues: { id: local?.id, clienteId: cliente.id, nome: local?.nome ?? "" },
  });

  async function salvar(dados: SaidaLocal) {
    setEnviando(true);
    try {
      await repositorio.salvarLocal({ ...dados, id: local?.id ?? crypto.randomUUID() });
      toast.success(local ? "Local atualizado" : "Local salvo");
      aoSalvar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(salvar)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.nome}>
          <FieldLabel htmlFor="local-nome">Nome do local</FieldLabel>
          <Input id="local-nome" placeholder="Ex.: Bloco A, Cobertura" aria-invalid={!!errors.nome} {...register("nome")} />
          <FieldError errors={[errors.nome]} />
        </Field>
        <BotaoSalvar enviando={enviando} rotulo="Salvar local" />
      </FieldGroup>
    </form>
  );
}
