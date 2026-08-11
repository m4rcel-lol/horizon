import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const rootAssets = path.resolve(__dirname, "../../assets");

/**
 * The brand assets (logo, default avatar, verification badges) live once at the
 * repo root and are referenced as /assets/*.svg. In production the web image
 * copies them next to the built bundle; in dev this serves them from the same
 * single source so the paths behave identically.
 */
function rootAssetsPlugin(): Plugin {
  return {
    name: "horizon-root-assets",
    configureServer(server) {
      server.middlewares.use("/assets", (req, res, next) => {
        const name = path.basename(decodeURIComponent((req.url ?? "").split("?")[0]));
        const file = path.join(rootAssets, name);
        if (!name || !file.startsWith(rootAssets) || !fs.existsSync(file)) return next();
        const ext = path.extname(name).toLowerCase();
        const types: Record<string, string> = {
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".gif": "image/gif",
        };
        res.setHeader("Content-Type", types[ext] || "application/octet-stream");
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), rootAssetsPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Resolve the workspace package to its source: its published entry is
      // CommonJS, and Rollup cannot read named exports from it when bundling.
      "@horizon/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
