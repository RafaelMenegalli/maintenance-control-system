import { ChevronRight, CircleAlert, CircleDashed, Clock } from "lucide-react";
import Link from "next/link";
import { formatarNumero } from "@/lib/format";
import type { StatusEquipamento } from "@/lib/status";
import { cn } from "@/lib/utils";

type SituacaoDoCartao = Extract<StatusEquipamento, "vencido" | "vence_em_breve" | "sem_registro">;

const CARTOES: {
  status: SituacaoDoCartao;
  titulo: string;
  classes: string;
  Icone: typeof CircleAlert;
}[] = [
  { status: "vencido", titulo: "Vencidos", classes: "border-vencido-border bg-vencido text-vencido-foreground", Icone: CircleAlert },
  { status: "vence_em_breve", titulo: "Vencem em até 15 dias", classes: "border-vence-em-breve-border bg-vence-em-breve text-vence-em-breve-foreground", Icone: Clock },
  { status: "sem_registro", titulo: "Sem registro", classes: "border-sem-registro-border bg-sem-registro text-sem-registro-foreground", Icone: CircleDashed },
];

/**
 * Os 3 cartões do painel (Vencidos / Vencem em até 15 dias / Sem registro).
 * Usado no painel do técnico e no início do portal da empresa.
 * `contagem` indefinida = ainda carregando ("…").
 */
export function CartoesResumo({
  contagem,
  hrefDaSituacao,
}: {
  contagem: Record<SituacaoDoCartao, number> | undefined;
  /** Para onde o cartão leva (lista de equipamentos já filtrada). */
  hrefDaSituacao: (status: SituacaoDoCartao) => string;
}) {
  return (
    <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-3">
      {CARTOES.map(({ status, titulo, classes, Icone }) => (
        <Link
          key={status}
          href={hrefDaSituacao(status)}
          className={cn("flex items-center gap-4 rounded-xl border-2 p-4 transition-opacity hover:opacity-90 sm:flex-col sm:items-start sm:gap-2", classes)}
        >
          <Icone className="size-8 shrink-0" aria-hidden />
          <span className="flex flex-1 items-center justify-between gap-3 sm:w-full sm:flex-col sm:items-start sm:gap-0">
            <span className="text-lg leading-tight font-semibold">{titulo}</span>
            <span className="text-4xl leading-none font-bold" aria-label={contagem ? `${contagem[status]} equipamentos` : "carregando"}>
              {contagem ? formatarNumero(contagem[status], 0) : "…"}
            </span>
          </span>
          <ChevronRight className="size-6 shrink-0 sm:hidden" aria-hidden />
        </Link>
      ))}
    </section>
  );
}
