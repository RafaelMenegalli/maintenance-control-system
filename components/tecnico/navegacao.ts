import {
  Building2,
  ClipboardList,
  FileText,
  Home,
  KeyRound,
  Lock,
  QrCode,
  ScanLine,
  Settings2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ItemNavegacao = { href: string; rotulo: string; icone: LucideIcon };

/** Os 3 itens principais; o 4º da barra inferior é "Mais". */
export const ITENS_PRINCIPAIS: ItemNavegacao[] = [
  { href: "/tecnico", rotulo: "Início", icone: Home },
  { href: "/tecnico/equipamentos", rotulo: "Equipamentos", icone: Wrench },
  { href: "/tecnico/escanear", rotulo: "Escanear", icone: ScanLine },
];

/** Conteúdo do "Mais" (celular) e do grupo "Cadastros e ferramentas" (computador). */
export const ITENS_MAIS: ItemNavegacao[] = [
  { href: "/tecnico/clientes", rotulo: "Clientes e locais", icone: Building2 },
  { href: "/tecnico/tipos", rotulo: "Tipos de equipamento", icone: Settings2 },
  { href: "/tecnico/etiquetas", rotulo: "Etiquetas QR", icone: QrCode },
  { href: "/tecnico/relatorios", rotulo: "Relatórios", icone: FileText },
  { href: "/tecnico/acessos", rotulo: "Acessos", icone: KeyRound },
  { href: "/tecnico/senha", rotulo: "Alterar minha senha", icone: Lock },
];

export const ITEM_REGISTRAR_SERVICO: ItemNavegacao = {
  href: "/tecnico/servicos/novo",
  rotulo: "Registrar serviço",
  icone: ClipboardList,
};

/** A rota está ativa? "Início" só casa exato; os outros casam também as subrotas. */
export function rotaAtiva(pathname: string, href: string): boolean {
  if (href === "/tecnico") return pathname === "/tecnico";
  return pathname === href || pathname.startsWith(`${href}/`);
}
