import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Atestados e materiais chegam a 5 MB; cartões escaneados do CGA, a 10 MB (+ folga do multipart).
    serverActions: { bodySizeLimit: "11mb" },
  },
  // Cabeçalhos de segurança em todas as respostas. O HSTS (só HTTPS) liga junto com o cookie seguro.
  async headers() {
    const seguranca = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
    ];
    if (process.env.COOKIE_SEGURO === "1") {
      seguranca.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [{ source: "/:caminho*", headers: seguranca }];
  },
  // Build enxuto para a imagem Docker (ativado pelo Dockerfile).
  output: process.env.NEXT_STANDALONE ? "standalone" : undefined,
};

export default nextConfig;
