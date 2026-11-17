import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("publish step refuses when NPM_TOKEN is missing", () => {
  let err;
  try {
    execFileSync(process.execPath, [join(root, "scripts/publish.mjs")], {
      cwd: root,
      env: { ...process.env, NPM_TOKEN: "" },
      encoding: "utf8",
    });
  } catch (e) { err = e; }
  assert.ok(err, "publish should exit non-zero without a token");
  assert.match(String(err.stderr || err.stdout || err), /NPM_TOKEN is not set; not publishing/);
});
