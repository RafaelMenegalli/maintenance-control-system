import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { IconeTipo } from "@/components/icone-tipo";
import { StatusBadge } from "@/components/status-badge";
import { formatarData } from "@/lib/format";
import type { EquipamentoResumo } from "@/lib/tecnico/data/types";

/** Lista "Próximas manutenções" (painel do técnico e início do portal). */
export function ProximasManutencoes({
  equipamentos,
  hrefDoEquipamento,
}: {
  equipamentos: EquipamentoResumo[];
  hrefDoEquipamento: (id: string) => string;
}) {
  return (
    <section aria-labelledby="titulo-proximas" className="flex flex-col gap-3">
      <h2 id="titulo-proximas" className="text-xl font-bold">
        Próximas manutenções
      </h2>
      {equipamentos.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed p-4 text-muted-foreground">
          Nenhuma manutenção agendada ainda. Quando um serviço for registrado, a próxima data aparece aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {equipamentos.map((e) => (
            <li key={e.id}>
              <Link href={hrefDoEquipamento(e.id)} className="flex items-center gap-3 rounded-xl border-2 bg-card p-3 hover:bg-muted/50">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <IconeTipo nome={e.tipoIcone} className="size-7" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-lg leading-tight font-semibold">{e.nome}</span>
                  <span className="text-muted-foreground">
                    {e.localNome} · {formatarData(e.proximaData)}
                  </span>
                  <span>
                    <StatusBadge status={e.status} proximaData={e.proximaData} />
                  </span>
                </span>
                <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
