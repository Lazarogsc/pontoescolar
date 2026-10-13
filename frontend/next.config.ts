import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Atestados do Meu RH chegam a 5 MB (+ folga do multipart).
    serverActions: { bodySizeLimit: "6mb" },
  },
  // Build enxuto para a imagem Docker (ativado pelo Dockerfile).
  output: process.env.NEXT_STANDALONE ? "standalone" : undefined,
};

export default nextConfig;
