import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const runtime = path.join(currentDirectory, "tsx-runtime.cjs");
const currentOptions = process.env.NODE_OPTIONS ?? "";
const nodeOptions = `${currentOptions} --require=${runtime}`.trim();
const result = spawnSync(
  process.execPath,
  [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, NODE_OPTIONS: nodeOptions } },
);

process.exit(result.status ?? 1);
