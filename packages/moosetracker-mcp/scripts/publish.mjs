#!/usr/bin/env node
// Publishes moosetracker-mcp to npm. The temporary userconfig refers to ${NPM_TOKEN};
// the secret itself is never written to a file, printed, or committed.
// Do not run the 1.2.9 (combined-release) publish until the gate has passed.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.NPM_TOKEN) {
  console.error("NPM_TOKEN is not set; not publishing. The moosetracker npm account is not ready yet.");
  process.exit(1);
}

const cwd = join(dirname(fileURLToPath(import.meta.url)), "..");
const wantProvenance = !process.argv.includes("--no-provenance");
const extra = process.argv.slice(2).filter(a => a !== "--no-provenance");

function publish(provenance) {
  const dir = mkdtempSync(join(tmpdir(), "mt-npm-"));
  const rc = join(dir, "npmrc");
  try {
    // Literal ${NPM_TOKEN}: npm expands it from the environment. Do not interpolate the secret here.
    writeFileSync(rc, "registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n", { mode: 0o600 });
    const text = readFileSync(rc, "utf8");
    if (!text.includes("${NPM_TOKEN}") || text.includes(process.env.NPM_TOKEN)) {
      throw new Error("userconfig must refer to ${NPM_TOKEN} and must not contain the secret");
    }
    const args = ["publish", "--access", "public", "--userconfig", rc, ...extra];
    if (provenance) args.push("--provenance");
    const r = spawnSync("npm", args, { cwd, stdio: ["ignore", "inherit", "inherit"] });
    return r.status === 0 ? 0 : (r.status || 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let status = wantProvenance ? publish(true) : 1;
if (status !== 0 && wantProvenance) {
  console.error("publish with --provenance did not succeed; retrying without provenance.");
  status = publish(false);
}
process.exit(status);
