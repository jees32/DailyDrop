import type { NextConfig } from "next";

/** LAN / phone dev: allow cross-origin requests to /_next/* from non-localhost hosts. */
function allowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "127.0.0.1",
    "192.168.1.4",
    "192.168.1.2",
    "192.168.1.4:3000",
    "192.168.1.*",
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const url = new URL(appUrl);
      origins.add(url.hostname);
      origins.add(url.host);
    } catch {
      // ignore malformed NEXT_PUBLIC_APP_URL
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
