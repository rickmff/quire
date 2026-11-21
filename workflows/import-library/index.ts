import { FatalError, sleep } from "workflow";
import type { ImportRequest } from "@/lib/imports";
import {
  type Box,
  batches,
  collectOutputs,
  createSandbox,
  demoNames,
  importArgs,
  importScript,
  openPullRequest,
  pollPhase,
  pushBlobs,
  readDiscovery,
  removeSandbox,
  setStatus,
  setupScript,
  startPhase,
  stopSandbox,
  uploadPreviews,
} from "./steps";

const RECORD_BATCH = 16;
const FILE_BATCH = 40;

class Refused extends FatalError {}

async function phase(box: Box, name: string, script: string, cwd?: string) {
  await startPhase(box, name, script, cwd);
  for (;;) {
    await sleep("30s");
    const r = await pollPhase(box, name);
    if (!r.done) continue;
    await stopSandbox(box);
    if (r.code !== 0) {
      const message = `${name} failed (exit ${r.code})\n${r.log ?? ""}`;
      if (name === "discover") throw new Refused(message);
      throw new FatalError(message);
    }
    return r;
  }
}

export async function importLibrary(importId: string, request: ImportRequest, repo: string, revision: string) {
  "use workflow";
  let box: Box | undefined;
  try {
    box = await createSandbox(importId);
    await setStatus(importId, { phase: "setup", detail: "installing the stage, Chromium and ffmpeg" });
    await phase(box, "setup", setupScript(repo, revision), box.root.replace(/\/quire$/, ""));

    await setStatus(importId, { phase: "discover", detail: "checking the license and the registry" });
    await phase(box, "discover", `${importScript(importArgs(request))} --until discover`);
    const found = await readDiscovery(box);
    const id = found.id;
    await setStatus(importId, {
      phase: "stage",
      library: id,
      detail: `${found.name}, ${found.license}, ${found.components} components: building the live demos`,
    });
    await phase(box, "stage", `${importScript(`--id ${id}`)} --from catalog --until stage`);

    const names = await demoNames(box, id);
    const groups = batches(names, RECORD_BATCH);
    for (let i = 0; i < groups.length; i++) {
      await setStatus(importId, {
        phase: "record",
        detail: "recording previews",
        progress: { done: i * RECORD_BATCH, total: names.length },
      });
      await phase(
        box,
        `record-${i}`,
        `${importScript(`--id ${id}`)} --from record --until record --only ${groups[i].join(",")}`,
      );
    }

    await setStatus(importId, { phase: "publish", detail: "writing the catalog", progress: undefined });
    await phase(box, "publish", `${importScript(`--id ${id}`)} --from publish`);

    await setStatus(importId, { phase: "deliver", detail: "uploading previews and opening the pull request" });
    const out = await collectOutputs(box, id);
    for (const group of batches(out.previews, FILE_BATCH)) await uploadPreviews(box, group);
    const entries = [];
    for (const group of batches(out.files, FILE_BATCH)) entries.push(...(await pushBlobs(box, group)));
    const pr = await openPullRequest({
      importId,
      id,
      name: found.name,
      license: found.license,
      url: request.url,
      parent: out.parent,
      summary: out.summary,
      entries,
    });

    await setStatus(importId, { phase: "done", detail: "waiting for review", pr, summary: out.summary });
    return { pr };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setStatus(importId, { phase: e instanceof Refused ? "refused" : "failed", detail: message.slice(0, 2000) });
    throw e;
  } finally {
    if (box) await removeSandbox(box);
  }
}
