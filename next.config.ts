import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Fotos werden im Browser verkleinert; 6 MB als Sicherheitsreserve
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
