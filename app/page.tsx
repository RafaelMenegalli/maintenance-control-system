import { redirect } from "next/navigation";
import { getSessao, rotaInicial } from "@/lib/auth/permissoes";

/** Raiz do app: manda cada pessoa para a sua área (ou para o login). */
export default async function Home() {
  const sessao = await getSessao();
  redirect(sessao ? rotaInicial(sessao.user.papel) : "/login");
}
