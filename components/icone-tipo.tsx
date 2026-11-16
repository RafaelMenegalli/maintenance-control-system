import {
  AirVent,
  Droplets,
  DoorClosed,
  Fan,
  Flame,
  Gauge,
  Lightbulb,
  Plug,
  ShieldCheck,
  Thermometer,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { NomeIcone } from "@/lib/schemas/icones";

const MAPA: Record<NomeIcone, LucideIcon> = {
  AirVent,
  Droplets,
  DoorClosed,
  Lightbulb,
  Flame,
  Zap,
  Fan,
  Thermometer,
  Gauge,
  ShieldCheck,
  Wrench,
  Plug,
};

/** Ícone de um tipo de equipamento a partir do nome salvo no banco (cai na chave inglesa se desconhecido). */
export function IconeTipo({ nome, className }: { nome: string | null | undefined; className?: string }) {
  const Icone = (nome && MAPA[nome as NomeIcone]) || Wrench;
  return <Icone className={className} aria-hidden />;
}
