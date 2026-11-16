import { CalendarCheck, ClipboardCheck, PackagePlus, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROTULOS_TIPO_SERVICO, type TipoServicoValor } from "@/lib/schemas/entidades";

export const ICONES_TIPO_SERVICO: Record<TipoServicoValor, LucideIcon> = {
  instalacao: PackagePlus,
  preventiva: CalendarCheck,
  corretiva: Wrench,
  limpeza: Sparkles,
  inspecao: ClipboardCheck,
};

/** Selo com o tipo do serviço (ícone + texto). */
export function BadgeTipoServico({ tipo }: { tipo: TipoServicoValor }) {
  const Icone = ICONES_TIPO_SERVICO[tipo];
  return (
    <Badge variant="secondary" className="border border-primary/30 bg-accent text-accent-foreground">
      <Icone className="size-4" aria-hidden />
      {ROTULOS_TIPO_SERVICO[tipo]}
    </Badge>
  );
}
