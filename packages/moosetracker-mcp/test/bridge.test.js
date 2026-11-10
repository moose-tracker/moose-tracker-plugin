import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin/moosetracker-mcp.js");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function writeRpc(child, obj) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
  child.stdin.write(body);
}

function readRpc(child, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    const t = setTimeout(() => reject(new Error("timeout waiting for MCP reply")), timeoutMs);
    const onData = chunk => {
      buf = Buffer.concat([buf, chunk]);
      const headerEnd = buf.indexOf("\r\n\r\n") >= 0 ? buf.indexOf("\r\n\r\n") : buf.indexOf("\n\n");
      const sepLen = buf.indexOf("\r\n\r\n") >= 0 ? 4 : (buf.indexOf("\n\n") >= 0 ? 2 : 0);
      if (headerEnd < 0) return;
      const header = buf.subarray(0, headerEnd).toString("utf8");
      const m = /content-length:\s*(\d+)/i.exec(header);
      if (!m) return;
      const len = Number(m[1]);
      const start = headerEnd + sepLen;
      if (buf.length < start + len) return;
      clearTimeout(t);
      child.stdout.off("data", onData);
      resolve(JSON.parse(buf.subarray(start, start + len).toString("utf8")));
    };
    child.stdout.on("data", onData);
  });
}

function startMock() {
  const tools = [
    { name: "describe", description: "usage notes" },
    { name: "sfx", description: "sound effects" },
    { name: "song", description: "plan and analyze a song" },
    { name: "render", description: "files to embed" },
    { name: "convert", description: "convert songs" },
    { name: "assets", description: "renew links" },
    { name: "feedback", description: "send a note" },
    { name: "research_composition", description: "composition advice" },
  ];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", c => { raw += c; });
    req.on("end", () => {
      const msg = JSON.parse(raw || "{}");
      if (msg.id === undefined) { res.statusCode = 202; res.end(); return; }   // notifications: accepted, no body (as the live server does)
      res.setHeader("content-type", "application/json");
      if (msg.method === "initialize") {
        res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "moose-tracker", version: pkg.version } } }));
        return;
      }
      if (msg.method === "tools/list") {
        res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { tools } }));
        return;
      }
      res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "unknown" } }));
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    resolve({ server, url: `http://127.0.0.1:${port}/mcp` });
  }));
}

test("package is MIT, has a bin, and has no runtime dependencies", () => {
  assert.equal(pkg.name, "moosetracker-mcp");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.bin["moosetracker-mcp"], "bin/moosetracker-mcp.js");
  assert.equal(pkg.dependencies && Object.keys(pkg.dependencies).length, 0);
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});

test("npm pack includes the bridge, license and README, and no secrets", () => {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: root, encoding: "utf8" });
  const report = JSON.parse(out);
  const files = (report[0]?.files || report.files || []).map(f => f.path || f);
  const joined = files.join("\n");
  assert.ok(files.some(f => /bin\/moosetracker-mcp\.js$/.test(f)), `bin missing: ${joined}`);
  assert.ok(files.some(f => /LICENSE$/.test(f)), "LICENSE missing from pack");
  assert.ok(files.some(f => /README\.md$/.test(f)), "README missing from pack");
  assert.ok(!files.some(f => /secret|token|\.env/i.test(f)), `secrets in pack: ${joined}`);
});

test("a local MCP client lists the tools through the bridge", async () => {
  const mock = await startMock();
  const child = spawn(process.execPath, [bin, "--url", mock.url], { stdio: ["pipe", "pipe", "pipe"] });
  try {
    writeRpc(child, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "gate", version: "0" } } });
    const init = await readRpc(child);
    assert.equal(init.result.serverInfo.name, "moose-tracker");
    writeRpc(child, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const list = await readRpc(child);
    const names = (list.result.tools || []).map(t => t.name);
    assert.deepEqual(names, ["describe", "sfx", "song", "render", "convert", "assets", "feedback", "research_composition"]);
  } finally {
    child.kill();
    mock.server.close();
  }
});

// The MCP stdio transport: one JSON-RPC message per line, no headers (what Claude Desktop, Cursor, Continue... send).
function writeLine(child, obj) { child.stdin.write(JSON.stringify(obj) + "\n"); }
function readLine(child, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const t = setTimeout(() => reject(new Error("timeout waiting for a newline-delimited MCP reply")), timeoutMs);
    const onData = chunk => {
      buf += chunk.toString("utf8");
      const i = buf.indexOf("\n"); if (i < 0) return;
      clearTimeout(t); child.stdout.off("data", onData);
      const line = buf.slice(0, i);
      assert.ok(!/^content-length/i.test(line), "reply must be a JSON line, not Content-Length framed");
      resolve(JSON.parse(line));
    };
    child.stdout.on("data", onData);
  });
}

test("an MCP stdio client (newline-delimited JSON) gets newline-delimited replies", async () => {
  const mock = await startMock();
  const child = spawn(process.execPath, [bin, "--url", mock.url], { stdio: ["pipe", "pipe", "pipe"] });
  try {
    writeLine(child, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gate", version: "0" } } });
    const init = await readLine(child);
    assert.equal(init.result.serverInfo.name, "moose-tracker");
    writeLine(child, { jsonrpc: "2.0", method: "notifications/initialized" });
    writeLine(child, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const list = await readLine(child);
    assert.equal(list.id, 2);
    assert.equal((list.result.tools || []).length, 8);
  } finally {
    child.kill();
    mock.server.close();
  }
});
