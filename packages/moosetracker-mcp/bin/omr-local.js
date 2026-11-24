// © 2026 Kurtis Alexander. MIT License.
// KUR-333: convert from photo, on the user's own computer. The bridge runs homr (liebharc/homr, AGPL-3.0) UNMODIFIED as its own program
// through uv (`uvx --from 'homr[cpu]==<version>' homr --no-title <photo>`), then sends homr's MusicXML to the Moose Tracker server as an
// ordinary MusicXML import. This file contains no homr code and installs nothing itself: uv fetches homr when the user's machine runs it.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, existsSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

export const HOMR_VERSION = "0.7.1";
export const HOMR_SPEC = `homr[cpu]==${HOMR_VERSION}`;
const MAX_BYTES = 15 * 1024 * 1024, RUN_MS = 10 * 60 * 1000;

/** Is this call one the bridge answers on this computer? A photo given as a path, as base64 input, or as an upload job. */
export function isLocalPhoto(msg) {
  const a = msg && msg.method === "tools/call" && msg.params && msg.params.name === "convert" ? msg.params.arguments : null;
  return !!(a && a.from === "photo" && (typeof a.path === "string" || typeof a.input === "string" || typeof a.upload === "string"));
}
const isPhoto = b => b.length > 12 && ((b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) || (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") || (b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d) || (b[0] === 0x42 && b[1] === 0x4d));
const textResult = (id, text, sc, isError = false) => ({ jsonrpc: "2.0", id, result: { ...(isError ? { isError: true } : {}), content: [{ type: "text", text }], structuredContent: sc } });

/** The command that runs homr here: MOOSETRACKER_HOMR (tests, or a homr the user installed another way) or uvx. */
function homrCommand(photo) {
  const own = process.env.MOOSETRACKER_HOMR;
  if (own) return { cmd: own, args: ["--no-title", photo] };
  return { cmd: "uvx", args: ["--from", HOMR_SPEC, "homr", "--no-title", photo] };
}
const haveUv = () => { if (process.env.MOOSETRACKER_HOMR) return true; try { return spawnSync("uvx", ["--version"], { stdio: "ignore", timeout: 15000 }).status === 0; } catch { return false; } };

export const PREP_DEPS = ["opencv-python-headless==5.1.0.95", "numpy==2.5.5"];
const PREP_SCRIPT = fileURLToPath(new URL("./omr-prep.py", import.meta.url));
/** Our own prep (omr-prep.py: upright, flatten the page, level, scale down), run through uv. Off with MOOSETRACKER_PREP=0; when it cannot
 *  run (no uv, an old Python, a photo it cannot open) homr reads the photo as it is. Returns the photo to read and what prep did. */
async function prepare(photo, dir) {
  if (process.env.MOOSETRACKER_PREP === "0") return { photo, did: null };
  const out = join(dir, "prepared.jpg"), cmd = process.env.MOOSETRACKER_PREP_CMD;
  const r = cmd ? await run(cmd, [photo, out], dir, true) : await run("uv", ["run", "-q", "--no-project", ...PREP_DEPS.flatMap(d => ["--with", d]), "python", PREP_SCRIPT, photo, out], dir, true);
  let did = null; try { did = JSON.parse(r.out.trim().split("\n").pop()); } catch { /* no report */ }
  return r.code === 0 && did && did.ok && existsSync(out) ? { photo: out, did } : { photo, did: null };
}

function run(cmd, args, cwd, keepOut = false) {
  return new Promise(resolve => {
    const t0 = Date.now(); let err = "", out = "";
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", keepOut ? "pipe" : "ignore", "pipe"], env: { ...process.env, PYTHONUNBUFFERED: "1" } });
    if (keepOut) p.stdout.on("data", d => { out = (out + d.toString("utf8")).slice(-4000); });
    const timer = setTimeout(() => { try { p.kill("SIGKILL"); } catch { } }, RUN_MS);
    p.stderr.on("data", d => { err = (err + d.toString("utf8")).slice(-4000); });
    p.on("error", e => { clearTimeout(timer); resolve({ code: -1, err: String(e.message || e), out, ms: Date.now() - t0 }); });
    p.on("close", code => { clearTimeout(timer); resolve({ code, err, out, ms: Date.now() - t0 }); });
  });
}

/** Handles convert from photo here. `forward(msg)` sends a JSON-RPC message to the server and resolves to its replies. */
export async function photoLocally(msg, forward) {
  const a = msg.params.arguments, id = msg.id, to = a.to || "mtl";
  const dir = mkdtempSync(join(tmpdir(), "moose-omr-"));
  try {
    let photo = join(dir, "score.jpg"), name = "score.jpg";
    if (typeof a.path === "string") {
      if (!existsSync(a.path) || !statSync(a.path).isFile()) return textResult(id, `There is no file at ${a.path}.`, { ok: false, problem: "no such file" }, true);
      const b = readFileSync(a.path); if (b.length > MAX_BYTES) return textResult(id, `The photo is over ${MAX_BYTES / 1048576} MB.`, { ok: false }, true);
      if (!isPhoto(b)) return textResult(id, "That file is not a photo (JPEG, PNG, WebP, TIFF or BMP). A HEIC photo needs to be saved as JPEG first.", { ok: false }, true);
      name = basename(a.path); photo = join(dir, "score" + (extname(a.path) || ".jpg")); copyFileSync(a.path, photo);   // homr writes its result next to the photo: a copy keeps the user's folder clean
    } else if (typeof a.input === "string") {
      const b = Buffer.from(a.input, "base64"); if (!isPhoto(b)) return textResult(id, "input is not a photo (base64 of a JPEG, PNG, WebP, TIFF or BMP).", { ok: false }, true);
      writeFileSync(photo, b);
    } else {   // an upload job: the server says where the photo is (a signed pickup URL on mcp.moosetracker.app, 10 minutes)
      const rep = (await forward({ jsonrpc: "2.0", id, method: "tools/call", params: { name: "convert", arguments: { from: "photo", to, upload: a.upload } } }))[0];
      const pick = rep && rep.result && rep.result.structuredContent && rep.result.structuredContent.callerSide && rep.result.structuredContent.callerSide.photo && rep.result.structuredContent.callerSide.photo.pickupUrl;
      if (!pick) return rep || textResult(id, "The server did not return the uploaded photo.", { ok: false }, true);
      const u = new URL(pick); if (u.protocol !== "https:" || !(u.hostname === "moosetracker.app" || u.hostname.endsWith(".moosetracker.app") || process.env.MOOSETRACKER_TEST_PICKUP === "1")) return textResult(id, "The pickup address is not a Moose Tracker address.", { ok: false }, true);
      const r = await fetch(pick); if (!r.ok) return textResult(id, `The uploaded photo could not be fetched (HTTP ${r.status}).`, { ok: false }, true);
      const b = Buffer.from(await r.arrayBuffer()); if (!isPhoto(b) || b.length > MAX_BYTES) return textResult(id, "The uploaded file is not a photo.", { ok: false }, true);
      writeFileSync(photo, b);
    }
    if (!haveUv()) {
      const cmd = `uvx --from '${HOMR_SPEC}' homr --no-title <photo>`;
      return textResult(id, `Reading sheet music photos on this computer needs uv (https://docs.astral.sh/uv/getting-started/installation/), which then fetches homr ${HOMR_VERSION} (an AGPL-3.0 program, about 130 MB with its models) the first time. Install uv, then call again; or run ${cmd} yourself and import the .musicxml it writes with convert from musicxml.`,
        { ok: true, status: "run_on_device", callerSide: { status: "run_on_device", why: "no_uv", reader: `homr ${HOMR_VERSION}`, options: [{ where: "shell", steps: [cmd] }] } });
    }
    const prep = await prepare(photo, dir);
    const { cmd, args } = homrCommand(prep.photo), r = await run(cmd, args, dir), out = prep.photo.replace(/\.[^.]+$/, "") + ".musicxml";
    if (r.code !== 0 || !existsSync(out)) return textResult(id, `homr could not read the photo${r.code === -1 ? ` (${r.err})` : ""}. ${r.err.split("\n").filter(Boolean).slice(-3).join(" ").slice(0, 400)}`, { ok: false, problem: "homr failed", exitCode: r.code }, true);
    const xml = readFileSync(out, "utf8");
    const fwd = { jsonrpc: "2.0", id, method: "tools/call", params: { ...msg.params, arguments: { from: "musicxml", to, input: xml, name: name.replace(/\.[^.]+$/, "") + ".musicxml", ...(a.voices ? { voices: a.voices } : {}), ...(a.names ? { names: a.names } : {}), ...(a.feel ? { feel: a.feel } : {}) } } };
    const reps = await forward(fwd), rep = reps[0];
    if (rep && rep.result) {
      const d = prep.did, steps = d ? [d.page && "flattened the page", d.turned && "turned the photo a quarter turn (it was sideways with no orientation tag; if the result looks like nonsense the photo may be upside down: send it upright)", d.deskew && `levelled it by ${Math.abs(d.deskew)} degrees`, d.scaled && "scaled it down"].filter(Boolean) : [];
      const note = `Read on this computer by homr ${HOMR_VERSION} in ${(r.ms / 1000).toFixed(1)} s${steps.length ? ` (first ${steps.join(", ")}; flag positions are in the prepared image)` : ""}.`;
      const t = rep.result.content && rep.result.content[0]; if (t && t.type === "text") t.text = `${note}\n${t.text}`;
      rep.result.structuredContent = { ...(rep.result.structuredContent || {}), readOn: "this computer", readSeconds: +(r.ms / 1000).toFixed(1), prepared: prep.did };
    }
    return rep;
  } finally { try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp folder */ } }
}
