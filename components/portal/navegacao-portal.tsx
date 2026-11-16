"use client";

import { FileText, Home, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITENS: { href: string; rotulo: string; icone: LucideIcon }[] = [
  { href: "/portal", rotulo: "Início", icone: Home },
  { href: "/portal/equipamentos", rotulo: "Equipamentos", icone: Wrench },
  { href: "/portal/relatorios", rotulo: "Relatórios", icone: FileText },
];

/** Abas do portal da empresa (ícone + texto). */
export function NavegacaoPortal() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do portal" className="border-b bg-background">
      {/* 3 abas iguais que cabem em qualquer tela: no celular o ícone fica em cima do texto. */}
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-1 px-2 sm:flex">
        {ITENS.map(({ href, rotulo, icone: Icone }) => {
          const ativo = href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
          return (
            <li key={href} className="sm:shrink-0">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 border-b-4 px-1 text-center text-base leading-tight font-semibold sm:min-h-14 sm:flex-row sm:gap-2 sm:px-3 sm:whitespace-nowrap",
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
