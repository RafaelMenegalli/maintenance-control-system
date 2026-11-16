import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antigo "middleware" no Next 16): checagem OTIMISTA — só verifica se existe
 * o cookie de sessão e manda quem não tem para o /login.
 *
 * Isto NÃO é a proteção real. A validação da sessão e do papel (admin/cliente)
 * acontece no servidor, em lib/auth/permissoes.ts (getSessaoOuRedirect / exigirAdmin /
 * escopoCliente), chamado pelos layouts e pelas rotas de API.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url);
    // Depois de entrar, a pessoa volta para onde queria ir.
    login.searchParams.set("voltar", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/tecnico/:path*", "/portal/:path*"],
};
