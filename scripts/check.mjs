import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const mod = await server.ssrLoadModule("/src/truth.ts");
  await mod.verifyCases();
  console.log("cases lock");
  const spin = await server.ssrLoadModule("/src/rotate.ts");
  await spin.verifyRotation();
  console.log("rotation");
} finally {
  await server.close();
}
