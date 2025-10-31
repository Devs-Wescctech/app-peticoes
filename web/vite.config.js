import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"

// 🔧 Gera timestamp único (força novo nome de arquivo a cada build)
const buildVersion = Date.now()

export default defineConfig({
  base: "/peticoes/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host: "0.0.0.0", port: 3002 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${buildVersion}.js`,
        chunkFileNames: `assets/[name]-[hash]-${buildVersion}.js`,
        assetFileNames: `assets/[name]-[hash]-${buildVersion}.[ext]`,
      },
    },
  },
})
