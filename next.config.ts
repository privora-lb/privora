import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones/tablets on the local network (e.g. iPhone hotspot 172.20.10.x,
  // home Wi-Fi 192.168.x.x / 10.x.x.x) to load Next.js dev resources. Without
  // this, Next 16 blocks cross-origin dev requests and pages never hydrate on
  // devices, leaving all client-side buttons unresponsive. Dev-only setting.
  allowedDevOrigins: ["172.20.10.*", "192.168.*.*", "10.*.*.*"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
