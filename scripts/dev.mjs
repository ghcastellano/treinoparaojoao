// Translate the preview runner's Vite-style flags for Next.js.
import { spawn } from "node:child_process";
const incoming = process.argv.slice(2);
const args = incoming
  .filter((a) => a !== "--strictPort")
  .map((a) => (a === "--host" ? "--hostname" : a));
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", ...args],
  { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
);
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
