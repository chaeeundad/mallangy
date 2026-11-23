import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, ".", "MALLANG_AR_").MALLANG_AR_DEV_BACKEND_URL;
  return {
    base: "./",
    server: target
      ? { proxy: { "/api": { target, changeOrigin: true } } }
      : undefined,
    build: {
      target: "es2022",
      rollupOptions: {
        input: { main: "index.html", ar: "ar/index.html" },
        output: {
          manualChunks(id) {
            if (id.includes("/three/")) return "three";
          },
        },
      },
    },
  };
});
