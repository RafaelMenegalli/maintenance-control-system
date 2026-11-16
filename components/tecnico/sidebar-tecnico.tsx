"use client";

import { Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotaoSair } from "@/components/botao-sair";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ITEM_REGISTRAR_SERVICO, ITENS_MAIS, ITENS_PRINCIPAIS, rotaAtiva } from "./navegacao";

/** Menu lateral do computador (no celular é substituído pela barra inferior). */
export function SidebarTecnico({ nome, email }: { nome: string; email: string }) {
  const pathname = usePathname();
  const RegistrarIcone = ITEM_REGISTRAR_SERVICO.icone;

  return (
    <Sidebar collapsible="none" className="hidden h-svh md:sticky md:top-0 md:flex">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wrench className="size-6" aria-hidden />
          </span>
          <span className="text-lg leading-tight font-bold">Controle de Manutenções</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="lg"
                  isActive={rotaAtiva(pathname, ITEM_REGISTRAR_SERVICO.href)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground"
                >
                  <Link href={ITEM_REGISTRAR_SERVICO.href}>
                    <RegistrarIcone aria-hidden />
                    <span className="font-semibold">{ITEM_REGISTRAR_SERVICO.rotulo}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {ITENS_PRINCIPAIS.map(({ href, rotulo, icone: Icone }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={rotaAtiva(pathname, href)}>
                    <Link href={href}>
                      <Icone aria-hidden />
                      <span>{rotulo}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Cadastros e ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITENS_MAIS.map(({ href, rotulo, icone: Icone }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={rotaAtiva(pathname, href)}>
                    <Link href={href}>
                      <Icone aria-hidden />
                      <span>{rotulo}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{nome}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
        <BotaoSair className="w-full" />
      </SidebarFooter>
    </Sidebar>
  );
}
