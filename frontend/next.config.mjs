import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const sharedConfig = {
  reactStrictMode: true,
  output: "export"
};

export default function nextConfig(phase) {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      ...sharedConfig,
      async rewrites() {
        const backendOrigin = process.env.BACKEND_URL || "http://127.0.0.1:3000";

        return [
          {
            source: "/api/:path*",
            destination: `${backendOrigin}/api/:path*`
          }
        ];
      }
    };
  }

  return sharedConfig;
}
