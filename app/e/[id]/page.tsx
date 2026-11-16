import { notFound, redirect } from "next/navigation";
import { idValido } from "@/lib/api";
import { getSessao } from "@/lib/auth/permissoes";

/**
 * Destino do QR Code do equipamento: https://<domínio>/e/{id}.
 * - sem login → /login e, depois de entrar, volta para cá;
 * - admin → detalhe do equipamento no /tecnico;
 * - cliente → equipamento no /portal.
 */
export default async function PaginaQr({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idValido(id)) notFound();

  const sessao = await getSessao();
  if (!sessao) redirect(`/login?voltar=${encodeURIComponent(`/e/${id}`)}`);

  redirect(sessao.user.papel === "admin" ? `/tecnico/equipamentos/${id}` : `/portal/equipamentos/${id}`);
}
