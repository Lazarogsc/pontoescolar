import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem rápida: sem cookie de sessão, vai para o login (guardando para onde ia).
 * A validação de verdade (sessão expirada, permissão do setor) é feita pela API.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("pe_sessao")) return NextResponse.next();
  const login = new URL("/login", request.url);
  const destino = request.nextUrl.pathname + request.nextUrl.search;
  if (destino !== "/") login.searchParams.set("de", destino);
  return NextResponse.redirect(login);
}

export const config = {
  // Tudo, menos a tela de login e os arquivos estáticos
  matcher: ["/((?!login|_next/static|_next/image|marca/|icon.png|apple-icon.png|favicon.ico).*)"],
};
