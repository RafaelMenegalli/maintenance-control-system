import { CircleAlert, CircleCheck, CircleDashed, Clock } from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { textoVencimento } from "@/lib/format";
import type { StatusEquipamento } from "@/lib/status";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  StatusEquipamento,
  { rotulo: string; classes: string; Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  em_dia: {
    rotulo: "Em dia",
    classes: "bg-em-dia text-em-dia-foreground border-em-dia-border",
    Icone: CircleCheck,
  },
  vence_em_breve: {
    rotulo: "Vence em breve",
    classes: "bg-vence-em-breve text-vence-em-breve-foreground border-vence-em-breve-border",
    Icone: Clock,
  },
  vencido: {
    rotulo: "Vencido",
    classes: "bg-vencido text-vencido-foreground border-vencido-border",
    Icone: CircleAlert,
  },
  sem_registro: {
    rotulo: "Sem registro",
    classes: "bg-sem-registro text-sem-registro-foreground border-sem-registro-border",
    Icone: CircleDashed,
  },
};

type Props = {
  status: StatusEquipamento;
  /**
   * Se informada (yyyy-mm-dd), o texto mostra o prazo: "Vence em 5 dias", "Venceu há 3 dias".
   * Sem ela, mostra só o nome do status ("Vencido", "Em dia"...).
   */
  proximaData?: string | Date | null;
  className?: string;
};

/**
 * Selo de status do equipamento. Sempre mostra cor E texto (e ícone):
 * a cor sozinha não basta para quem enxerga mal ou não distingue cores.
 */
export function StatusBadge({ status, proximaData, className }: Props) {
  const { rotulo, classes, Icone } = CONFIG[status];
  const comPrazo = proximaData && (status === "vence_em_breve" || status === "vencido");
  const texto = comPrazo ? capitalizar(textoVencimento(proximaData)) : rotulo;

  return (
    <Badge variant="outline" className={cn("border-2 font-semibold", classes, className)}>
      <Icone className="size-4" aria-hidden />
      {texto}
    </Badge>
  );
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
