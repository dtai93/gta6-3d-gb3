// Hands in the Port Solano entry. Copies game/ and screenshots/ to the output
// directory and writes dossier.json with the same caps the scorer checks.
// Node 22, standard library only. MAKEFUN_OUTPUT_DIR replaces /output locally.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });

const shotsOut = join(outDir, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
const shotsSrc = join(root, 'screenshots');
if (existsSync(shotsSrc)) cpSync(shotsSrc, shotsOut, { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
