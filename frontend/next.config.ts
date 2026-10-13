import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Build enxuto para a imagem Docker (ativado pelo Dockerfile).
  output: process.env.NEXT_STANDALONE ? "standalone" : undefined,
};

export default nextConfig;
