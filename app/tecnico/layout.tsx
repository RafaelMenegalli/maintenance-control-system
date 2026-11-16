import { BarraInferior } from "@/components/tecnico/barra-inferior";
import { SidebarTecnico } from "@/components/tecnico/sidebar-tecnico";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { exigirAdmin } from "@/lib/auth/permissoes";

/**
 * Área do técnico (admin). A checagem de papel é feita AQUI, no servidor:
 * cliente é redirecionado para o portal.
 * Computador: menu lateral. Celular: barra inferior fixa.
 */
export default async function LayoutTecnico({ children }: { children: React.ReactNode }) {
  const sessao = await exigirAdmin();

  return (
    <SidebarProvider>
      <SidebarTecnico nome={sessao.user.name} email={sessao.user.email} />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
      <BarraInferior />
    </SidebarProvider>
  );
}
