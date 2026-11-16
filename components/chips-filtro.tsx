"use client";

import { useId } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type OpcaoChip = { valor: string; rotulo: string };

/**
 * Filtro em "chips" fáceis de tocar (ToggleGroup). Sempre tem a opção "Todos";
 * tocar de novo no chip ativo volta para "Todos".
 */
export function ChipsFiltro({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: OpcaoChip[];
  valor: string | undefined;
  aoMudar: (valor: string | undefined) => void;
}) {
  const id = useId();
  const classeChip = "rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground";
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="font-semibold">
        {rotulo}
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-labelledby={id}
        value={valor ?? "todos"}
        onValueChange={(v) => aoMudar(!v || v === "todos" ? undefined : v)}
        className="flex w-full flex-wrap justify-start"
      >
        <ToggleGroupItem value="todos" className={classeChip}>
          Todos
        </ToggleGroupItem>
        {opcoes.map((o) => (
          <ToggleGroupItem key={o.valor} value={o.valor} className={classeChip}>
            {o.rotulo}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
