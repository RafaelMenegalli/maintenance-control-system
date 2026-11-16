import { z } from "zod";
import { lerNumero } from "@/lib/format";
import type { Atributos, CampoDefinicao, ValorAtributo } from "./campo";

/**
 * Validação dinâmica dos campos de um tipo de equipamento.
 *
 * Há dois formatos:
 *  - FORMULÁRIO: tudo é texto digitado (número "12,5", sim/não "sim"/"nao", data "2026-03-05").
 *  - ARMAZENADO (JSONB `equipamentos.atributos`): número, boolean e null de verdade.
 */

export type ValoresFormulario = Record<string, string>;

const SEM_VALOR = "";

function vazio(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function mensagemObrigatorio(campo: CampoDefinicao): string {
  switch (campo.type) {
    case "selecao":
    case "sim_nao":
      return `Escolha uma opção em "${campo.label}"`;
    default:
      return `Preencha o campo "${campo.label}"`;
  }
}

/** Schema do formulário (valores como texto), com mensagens em português. */
export function criarSchemaFormulario(campos: CampoDefinicao[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const campo of campos) {
    shape[campo.key] = z
      .string()
      .optional()
      .superRefine((valor, ctx) => {
        if (vazio(valor)) {
          if (campo.obrigatorio) ctx.addIssue({ code: "custom", message: mensagemObrigatorio(campo) });
          return;
        }
        const v = valor as string;
        if (campo.type === "numero" && lerNumero(v) === null) {
          ctx.addIssue({ code: "custom", message: `"${campo.label}" precisa ser um número, por exemplo 12,5` });
        }
        if (campo.type === "data" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          ctx.addIssue({ code: "custom", message: `Informe uma data válida em "${campo.label}"` });
        }
        if (campo.type === "selecao" && !(campo.options ?? []).includes(v)) {
          ctx.addIssue({ code: "custom", message: `Escolha uma das opções de "${campo.label}"` });
        }
      });
  }
  return z.object(shape);
}

/** Texto do formulário → valor armazenado. Campo vazio vira null. */
export function formularioParaAtributos(campos: CampoDefinicao[], valores: ValoresFormulario): Atributos {
  const saida: Atributos = {};
  for (const campo of campos) {
    const bruto = valores[campo.key];
    if (vazio(bruto)) {
      saida[campo.key] = null;
      continue;
    }
    switch (campo.type) {
      case "numero":
        saida[campo.key] = lerNumero(bruto);
        break;
      case "sim_nao":
        saida[campo.key] = bruto === "sim";
        break;
      default:
        saida[campo.key] = bruto.trim();
    }
  }
  return saida;
}

/** Valor armazenado → texto do formulário (para editar). */
export function atributosParaFormulario(campos: CampoDefinicao[], atributos: Atributos): ValoresFormulario {
  const saida: ValoresFormulario = {};
  for (const campo of campos) {
    const v: ValorAtributo | undefined = atributos[campo.key];
    if (v === null || v === undefined) saida[campo.key] = SEM_VALOR;
    else if (campo.type === "sim_nao") saida[campo.key] = v ? "sim" : "nao";
    else if (campo.type === "numero") saida[campo.key] = String(v).replace(".", ",");
    else saida[campo.key] = String(v);
  }
  return saida;
}

/** Schema do valor ARMAZENADO — usado pelo servidor para validar o que chega do cliente. */
export function criarSchemaArmazenado(campos: CampoDefinicao[]) {
  return z.record(z.string(), z.unknown()).superRefine((atributos, ctx) => {
    for (const campo of campos) {
      const v = atributos[campo.key];
      if (v === null || v === undefined || v === "") {
        if (campo.obrigatorio) ctx.addIssue({ code: "custom", message: mensagemObrigatorio(campo) });
        continue;
      }
      const ok =
        (campo.type === "texto" && typeof v === "string") ||
        (campo.type === "numero" && typeof v === "number" && Number.isFinite(v)) ||
        (campo.type === "data" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) ||
        (campo.type === "sim_nao" && typeof v === "boolean") ||
        (campo.type === "selecao" && typeof v === "string" && (campo.options ?? []).includes(v));
      if (!ok) ctx.addIssue({ code: "custom", message: `Valor inválido em "${campo.label}"` });
    }
  });
}
