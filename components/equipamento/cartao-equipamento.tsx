import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { IconeTipo } from "@/components/icone-tipo";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatarData } from "@/lib/format";
import type { EquipamentoResumo } from "@/lib/tecnico/data/types";

/** Cartão de um equipamento nas listas (técnico e portal): ícone, nome, local, status e último serviço. */
export function CartaoEquipamento({
  equipamento: e,
  href,
  mostrarLocal = true,
}: {
  equipamento: EquipamentoResumo;
  href: string;
  /** No portal a lista já é agrupada por local, então o local não precisa se repetir. */
  mostrarLocal?: boolean;
}) {
  return (
    <Link href={href} className="block rounded-xl">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <IconeTipo nome={e.tipoIcone} className="size-7" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold">
              {e.nome}
              {e.arquivado && <Badge variant="secondary">Arquivado</Badge>}
            </p>
            <p className="text-muted-foreground">{mostrarLocal ? `${e.localNome} · ${e.tipoNome}` : e.tipoNome}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusBadge status={e.status} proximaData={e.proximaData} />
              <span className="text-muted-foreground">
                {e.ultimoServicoEm ? `Último serviço: ${formatarData(e.ultimoServicoEm)}` : "Nenhum serviço registrado"}
              </span>
            </div>
          </div>
          <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
