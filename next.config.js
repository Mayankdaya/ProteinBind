const CopyPlugin = require("copy-webpack-plugin");
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.clerk.com'],
  },
  experimental: {
    forceSwcTransforms: true
  },
  webpack(config, { isServer }) {
    // Add WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      syncWebAssembly: true
    };

    // Add worker support
    config.output = {
      ...config.output,
      globalObject: 'self'
    };

    // Copy RDKit WASM files to public directory
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm",
            to: path.join(__dirname, "public/static/wasm/RDKit_minimal.wasm"),
          },
        ],
      })
    );

    config.externals = [...(config.externals || []), 'canvas'];

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        source: '/_next/static/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
      {
        source: '/scripts/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
