const { spawnSync } = require("node:child_process");
const path = require("node:path");

const runtime = path.join(__dirname, "tsx-runtime.cjs");
const currentOptions = process.env.NODE_OPTIONS ?? "";
const nodeOptions = `${currentOptions} --require=${runtime}`.trim();
const result = spawnSync(
  process.execPath,
  [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, NODE_OPTIONS: nodeOptions } },
);

process.exit(result.status ?? 1);
