import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Für das Docker-Image: schlanker, eigenständiger Server unter .next/standalone
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Fotos werden im Browser verkleinert; 6 MB als Sicherheitsreserve
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
