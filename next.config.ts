import type { NextConfig } from "next";

const repositoryName = "Loading-museum";
const isProduction = process.env.NODE_ENV === "production";
const pagesBasePath = isProduction ? `/${repositoryName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: pagesBasePath,
  assetPrefix: pagesBasePath,
};

export default nextConfig;
