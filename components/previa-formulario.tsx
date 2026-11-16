"use client";

import { useForm } from "react-hook-form";
import { CamposDinamicos } from "@/components/campos-dinamicos";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { CampoDefinicao } from "@/lib/schemas/campo";

/** Formulário de exemplo (interativo, mas que não salva nada) a partir dos campos do tipo. */
export function PreviaFormulario({ campos }: { campos: CampoDefinicao[] }) {
  // Remonta quando a estrutura muda, para não sobrar valor de campo que mudou de tipo.
  const estrutura = JSON.stringify(campos.map((c) => [c.key, c.type, c.label, c.options, c.unidade, c.obrigatorio]));
  return <PreviaInterna key={estrutura} campos={campos} />;
}

function PreviaInterna({ campos }: { campos: CampoDefinicao[] }) {
  const { control } = useForm({ defaultValues: { previa: {} } });
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="previa-nome">Nome ou identificação</FieldLabel>
        <Input id="previa-nome" placeholder="Ex.: Sala de reuniões" />
      </Field>
      {campos.length === 0 && (
        <p className="text-muted-foreground">Adicione campos no bloco anterior para vê-los aqui.</p>
      )}
      <CamposDinamicos campos={campos} control={control} prefixo="previa" idBase="previa" />
    </FieldGroup>
  );
}
