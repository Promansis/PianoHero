/**
 * Downloads nbrosowsky/tonejs-instruments sample packs used by PianoHero.
 * Run once (or after adding new instruments) with: node scripts/download-samples.mjs
 * Skips files that already exist.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const BASE_URL =
  'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples';

const DOWNLOADS = [
  {
    instrument: 'organ',
    destDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'organ'),
    files: [
      'A1.mp3', 'A2.mp3', 'A3.mp3', 'A4.mp3', 'A5.mp3',
      'C1.mp3', 'C2.mp3', 'C3.mp3', 'C4.mp3', 'C5.mp3', 'C6.mp3',
      'Ds1.mp3', 'Ds2.mp3', 'Ds3.mp3', 'Ds4.mp3', 'Ds5.mp3',
      'Fs1.mp3', 'Fs2.mp3', 'Fs3.mp3', 'Fs4.mp3', 'Fs5.mp3',
    ],
  },
  {
    instrument: 'harp',
    destDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'harp'),
    files: [
      'A2.mp3', 'A4.mp3', 'A6.mp3',
      'B1.mp3', 'B3.mp3', 'B5.mp3', 'B6.mp3',
      'C3.mp3', 'C5.mp3',
      'D2.mp3', 'D4.mp3', 'D6.mp3', 'D7.mp3',
      'E1.mp3', 'E3.mp3', 'E5.mp3',
      'F2.mp3', 'F4.mp3', 'F6.mp3', 'F7.mp3',
      'G1.mp3', 'G3.mp3', 'G5.mp3',
    ],
  },
  {
    instrument: 'xylophone',
    destDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'xylophone'),
    files: ['C5.mp3', 'C6.mp3', 'C7.mp3', 'C8.mp3', 'G4.mp3', 'G5.mp3', 'G6.mp3', 'G7.mp3'],
  },
  {
    instrument: 'bass-electric',
    destDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'bass-electric'),
    files: [
      'As1.mp3', 'As2.mp3', 'As3.mp3', 'As4.mp3',
      'Cs1.mp3', 'Cs2.mp3', 'Cs3.mp3', 'Cs4.mp3', 'Cs5.mp3',
      'E1.mp3', 'E2.mp3', 'E3.mp3', 'E4.mp3',
      'G1.mp3', 'G2.mp3', 'G3.mp3', 'G4.mp3',
    ],
  },
  {
    instrument: 'vibraphone',
    destDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'vibraphone'),
    files: [
      'A3.mp3', 'A4.mp3', 'A5.mp3',
      'C3.mp3', 'C4.mp3', 'C5.mp3', 'C6.mp3',
      'Ds4.mp3', 'Ds5.mp3',
      'Fs4.mp3', 'Fs5.mp3',
    ],
  },
];

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url, dest) {
  if (await fileExists(dest)) {
    process.stdout.write('.');
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  process.stdout.write('+');
}

let totalNew = 0;
let totalSkipped = 0;

for (const { instrument, destDir, files } of DOWNLOADS) {
  await mkdir(destDir, { recursive: true });
  process.stdout.write(`\n${instrument} (${files.length} files): `);
  for (const file of files) {
    const existed = await fileExists(join(destDir, file));
    await downloadFile(`${BASE_URL}/${instrument}/${file}`, join(destDir, file));
    if (existed) totalSkipped++;
    else totalNew++;
  }
}

console.log(`\n\nDone. ${totalNew} downloaded, ${totalSkipped} already present.`);
