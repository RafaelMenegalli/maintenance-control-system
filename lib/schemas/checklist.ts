import { z } from "zod";

/** Item de checklist definido no tipo de equipamento (JSONB `tipos_equipamento.checklist`). */
export const itemChecklistSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "Use só letras minúsculas, números e _"),
  label: z.string().min(1, "Informe o texto do item"),
});
export type ItemChecklist = z.infer<typeof itemChecklistSchema>;

export const checklistSchema = z
  .array(itemChecklistSchema)
  .refine((itens) => new Set(itens.map((i) => i.key)).size === itens.length, {
    message: "Existem dois itens com a mesma chave",
  });

export const RESULTADOS_CHECKLIST = ["ok", "nao_ok", "na"] as const;
export type ResultadoChecklist = (typeof RESULTADOS_CHECKLIST)[number];

/**
 * Resposta de um item no serviço (JSONB `servicos.checklist`).
 * O `label` é copiado (snapshot) no momento do registro: editar o tipo depois
 * não altera o histórico.
 */
export const respostaChecklistSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  resultado: z.enum(RESULTADOS_CHECKLIST),
  observacao: z.string().optional(),
});
export type RespostaChecklist = z.infer<typeof respostaChecklistSchema>;

export const respostasChecklistSchema = z.array(respostaChecklistSchema);
