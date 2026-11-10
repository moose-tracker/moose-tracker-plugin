#!/usr/bin/env node
// © 2026 Kurtis Alexander. MIT License.
// Tiny stdio-to-remote MCP bridge. No engine code, no secrets. Forwards JSON-RPC
// between a local MCP client and the live Streamable HTTP server. Stdio is newline-delimited JSON (the MCP
// stdio transport); Content-Length framed input is still accepted and answered in the same framing.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stdin, stdout, stderr } from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8"));
const DEFAULT_URL = "https://mcp.moosetracker.app/mcp";

function argUrl() {
  const i = process.argv.indexOf("--url");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env.MOOSETRACKER_MCP_URL || DEFAULT_URL;
}

const url = argUrl();
let sessionId = null;
let framing = "line";   // "line" (MCP stdio) or "header" (Content-Length), set by the client's first message

function writeMessage(obj) {
  const json = JSON.stringify(obj);   // JSON.stringify never emits a raw newline, so one message is one line
  if (framing === "line") { stdout.write(json + "\n"); return; }
  const body = Buffer.from(json, "utf8");
  stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  stdout.write(body);
}

function parseSseOrJson(text, contentType) {
  if (contentType && contentType.includes("text/event-stream")) {
    const payloads = [];
    for (const block of text.split(/\n\n/)) {
      const data = block.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trimStart()).join("\n");
      if (data) {
        try { payloads.push(JSON.parse(data)); } catch { /* ignore keepalives */ }
      }
    }
    return payloads;
  }
  return [JSON.parse(text)];
}

async function forward(msg) {
  const headers = {
    "content-type": "application/json",
    "accept": "application/json, text/event-stream",
    "user-agent": `moosetracker-mcp/${pkg.version}`,
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(msg) });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  const text = await res.text();
  if (msg.id === undefined) return [];   // a notification never gets a reply (JSON-RPC 2.0)
  if (res.status === 204 || text.trim() === "") {
    if (msg.id === undefined) return []; // notification
    return [{ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: `empty reply from ${url} (HTTP ${res.status})` } }];
  }
  try {
    return parseSseOrJson(text, res.headers.get("content-type") || "");
  } catch (e) {
    if (msg.id === undefined) return [];
    return [{ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: `bad reply from ${url} (HTTP ${res.status}): ${String(e.message || e).slice(0, 200)}` } }];
  }
}

async function onMessage(msg) {
  try {
    const replies = await forward(msg);
    for (const r of replies) writeMessage(r);
  } catch (e) {
    if (msg && msg.id !== undefined) {
      writeMessage({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: String(e.message || e).slice(0, 300) } });
    } else {
      stderr.write(`moosetracker-mcp: ${String(e.message || e)}\n`);
    }
  }
}

let buf = Buffer.alloc(0);
function handleJson(text) {
  let msg;
  try { msg = JSON.parse(text); } catch {
    writeMessage({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
    return;
  }
  onMessage(msg);
}
stdin.on("data", chunk => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const head = buf.subarray(0, 32).toString("utf8").replace(/^\s+/, "");
    if (/^content-length\s*:/i.test(head)) {   // Content-Length framed (older clients)
      framing = "header";
      const crlf = buf.indexOf("\r\n\r\n"), lf = buf.indexOf("\n\n");
      const headerEnd = crlf >= 0 ? crlf : lf, sepLen = crlf >= 0 ? 4 : 2;
      if (headerEnd < 0) break;
      const m = /content-length:\s*(\d+)/i.exec(buf.subarray(0, headerEnd).toString("utf8"));
      const start = headerEnd + sepLen;
      if (!m) { buf = buf.subarray(start); continue; }
      const len = Number(m[1]);
      if (buf.length < start + len) break;
      const json = buf.subarray(start, start + len).toString("utf8");
      buf = buf.subarray(start + len);
      handleJson(json);
      continue;
    }
    const nl = buf.indexOf("\n");   // newline-delimited JSON (the MCP stdio transport)
    if (nl < 0) break;
    const line = buf.subarray(0, nl).toString("utf8").replace(/\r$/, "");
    buf = buf.subarray(nl + 1);
    if (line.trim()) { framing = "line"; handleJson(line); }
  }
});
stdin.on("end", () => process.exit(0));
stdin.resume();
