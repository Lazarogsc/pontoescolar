import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem rápida: sem cookie de sessão, vai para o login.
 * A validação de verdade (sessão expirada, permissão do setor) é feita pela API.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("pe_sessao")) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Tudo, menos a tela de login e os arquivos estáticos
  matcher: ["/((?!login|_next/static|_next/image|marca/|icon.png|apple-icon.png|favicon.ico).*)"],
};
