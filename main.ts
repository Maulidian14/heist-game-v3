// VELVET HOUR — the hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ to the output directory
// and writes dossier.json with make.fun's vendored library, so the judge's
// dossier is byte for byte what the scorer rebuilds from the same files.
// In the grader the output directory is /output; outside it,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The bounty gate's caps: only text_max_bytes shapes the dossier's bytes; the
// other caps make this program fail exactly where the scorer would refuse the
// entry (more than 4 screenshots, one over 256 KiB, game/ past its limits).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`velvet-hour: wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
