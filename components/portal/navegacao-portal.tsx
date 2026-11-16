"use client";

import { CalendarClock, FileText, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITENS: { href: string; rotulo: string; icone: LucideIcon }[] = [
  { href: "/portal", rotulo: "Equipamentos", icone: Wrench },
  { href: "/portal/proximas", rotulo: "Próximas manutenções", icone: CalendarClock },
  { href: "/portal/relatorios", rotulo: "Relatórios", icone: FileText },
];

/** Abas do portal da empresa (ícone + texto). */
export function NavegacaoPortal() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do portal" className="border-b bg-background">
      <ul className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-2">
        {ITENS.map(({ href, rotulo, icone: Icone }) => {
          const ativo = href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-2 border-b-4 px-3 font-semibold whitespace-nowrap",
                  ativo
                    ? "border-primary text-primary"
                    : "border-transparent text-foreground hover:bg-muted",
                )}
              >
                <Icone className="size-5" aria-hidden />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
