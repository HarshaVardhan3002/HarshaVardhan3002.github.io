// Writes src/hf.ts with the current Hugging Face numbers. Runs before every build
// (npm "prebuild"), and the deploy workflow builds once a day, so the site stays
// current on its own. If Hugging Face cannot be reached, the last file is kept.
import { writeFileSync } from "node:fs";

const USER = "Harsha001";
const OUT = new URL("../src/hf.ts", import.meta.url);

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": "portfolio-build" } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

try {
  const models = await get(`https://huggingface.co/api/models?author=${USER}&limit=1000&expand[]=downloadsAllTime&expand[]=likes&expand[]=pipeline_tag&expand[]=createdAt`);
  const user = await get(`https://huggingface.co/api/users/${USER}/overview`).catch(() => ({}));
  const repos = Object.fromEntries(
    models.map((m) => [m.id.split("/")[1], m.downloadsAllTime ?? 0]).sort((a, b) => b[1] - a[1]),
  );
  // Model type and upload date, so new models can join the site's list on their own.
  const info = Object.fromEntries(
    models.map((m) => [m.id.split("/")[1], { tag: m.pipeline_tag ?? "", created: (m.createdAt ?? "").slice(0, 10) }]),
  );
  const data = {
    synced: new Date().toISOString().slice(0, 10),
    models: models.length,
    downloads: models.reduce((s, m) => s + (m.downloadsAllTime ?? 0), 0),
    likes: models.reduce((s, m) => s + (m.likes ?? 0), 0),
    followers: user.numFollowers ?? 0,
    repos,
    info,
  };
  const body =
    "// Written by scripts/hf-stats.mjs before each build. Do not edit by hand.\n" +
    `export const hf = ${JSON.stringify(data, null, 2)} as const;\n`;
  writeFileSync(OUT, body);
  console.log(`hf-stats: ${data.models} models, ${data.downloads} downloads (${data.synced})`);
} catch (e) {
  console.warn(`hf-stats: kept the last numbers (${e.message})`);
}
