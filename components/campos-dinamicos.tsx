"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CampoDefinicao } from "@/lib/schemas/campo";

type Props = {
  campos: CampoDefinicao[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  /** Prefixo do nome no formulário: os campos viram `${prefixo}.${key}`. */
  prefixo: string;
  /** Erros do grupo (ex.: `errors.atributos`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  erros?: Record<string, any>;
  idBase?: string;
};

/**
 * Gera o formulário a partir da definição de campos de um tipo (JSONB).
 * Todos os valores são texto no formulário (ver lib/schemas/atributos.ts).
 */
export function CamposDinamicos({ campos, control, prefixo, erros, idBase = "campo" }: Props) {
  return (
    <>
      {campos.map((campo) => {
        const id = `${idBase}-${campo.key}`;
        const erro = erros?.[campo.key];
        const rotulo = campo.obrigatorio ? campo.label : `${campo.label} (opcional)`;

        return (
          <Controller<FieldValues>
            key={campo.key}
            control={control}
            name={`${prefixo}.${campo.key}`}
            defaultValue=""
            render={({ field }) => {
              const valor: string = field.value ?? "";
              return (
                <Field data-invalid={!!erro}>
                  {campo.type === "sim_nao" ? (
                    <>
                      <FieldLabel id={`${id}-rotulo`}>{rotulo}</FieldLabel>
                      <RadioGroup
                        aria-labelledby={`${id}-rotulo`}
                        value={valor}
                        onValueChange={field.onChange}
                        className="grid grid-cols-2 gap-3"
                      >
                        {[
                          { v: "sim", t: "Sim" },
                          { v: "nao", t: "Não" },
                        ].map(({ v, t }) => (
                          <label
                            key={v}
                            htmlFor={`${id}-${v}`}
                            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-input px-4 has-data-checked:border-primary has-data-checked:bg-accent"
                          >
                            <RadioGroupItem id={`${id}-${v}`} value={v} />
                            <span className="text-base font-medium">{t}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </>
                  ) : (
                    <>
                      <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
                      {campo.type === "selecao" && (
                        <NativeSelect
                          id={id}
                          className="w-full"
                          value={valor}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={!!erro}
                        >
                          <NativeSelectOption value="">Escolha uma opção</NativeSelectOption>
                          {(campo.options ?? []).map((o) => (
                            <NativeSelectOption key={o} value={o}>
                              {o}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      )}
                      {campo.type === "data" && (
                        <Input
                          id={id}
                          type="date"
                          value={valor}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={!!erro}
                        />
                      )}
                      {campo.type === "texto" && (
                        <Input
                          id={id}
                          value={valor}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={!!erro}
                        />
                      )}
                      {campo.type === "numero" &&
                        (campo.unidade ? (
                          <InputGroup>
                            <InputGroupInput
                              id={id}
                              inputMode="decimal"
                              value={valor}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              aria-invalid={!!erro}
                            />
                            <InputGroupAddon align="inline-end">
                              <InputGroupText>{campo.unidade}</InputGroupText>
                            </InputGroupAddon>
                          </InputGroup>
                        ) : (
                          <Input
                            id={id}
                            inputMode="decimal"
                            value={valor}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            aria-invalid={!!erro}
                          />
                        ))}
                    </>
                  )}
                  <FieldError errors={[erro]} />
                </Field>
              );
            }}
          />
        );
      })}
    </>
  );
}
