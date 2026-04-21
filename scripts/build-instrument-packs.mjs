/**
 * Downloads redistributable pilot instrument samples and generates bundled/enhanced pack assets.
 * Run with: node scripts/build-instrument-packs.mjs
 */

import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const SOURCE_BASE_URL =
  'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples';

const PILOT_PACKS = [
  {
    instrumentId: 'flute',
    standardDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'flute'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'flute', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'flute', 'manifest.json'),
    packLabel: 'Flute Enhanced Pack',
    standardFiles: ['C4.mp3', 'A4.mp3', 'E5.mp3', 'C6.mp3', 'A6.mp3', 'C7.mp3'],
    enhancedFiles: ['C4.mp3', 'E4.mp3', 'A4.mp3', 'C5.mp3', 'E5.mp3', 'A5.mp3', 'C6.mp3', 'E6.mp3', 'A6.mp3', 'C7.mp3'],
  },
  {
    instrumentId: 'trumpet',
    standardDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'trumpet'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'trumpet', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'trumpet', 'manifest.json'),
    packLabel: 'Trumpet Enhanced Pack',
    standardFiles: ['F3.mp3', 'C4.mp3', 'F4.mp3', 'As4.mp3', 'F5.mp3', 'C6.mp3'],
    enhancedFiles: ['F3.mp3', 'A3.mp3', 'C4.mp3', 'Ds4.mp3', 'F4.mp3', 'G4.mp3', 'As4.mp3', 'D5.mp3', 'F5.mp3', 'A5.mp3', 'C6.mp3'],
  },
];

function noteNameFromFilename(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '');
  const sharpMatch = /^([A-G])s(\d{1,2})$/.exec(base);
  if (sharpMatch) {
    return `${sharpMatch[1]}#${sharpMatch[2]}`;
  }
  const plainMatch = /^([A-G][#b]?\d{1,2})$/.exec(base);
  if (plainMatch) {
    return plainMatch[1];
  }
  throw new Error(`Unable to derive note name from ${fileName}`);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

for (const pack of PILOT_PACKS) {
  const tempDir = join(PUBLIC_DIR, '.tmp-pilot-pack-build', pack.instrumentId);
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await mkdir(pack.standardDir, { recursive: true });
  await mkdir(pack.enhancedDir, { recursive: true });

  const allFiles = [...new Set([...pack.standardFiles, ...pack.enhancedFiles])];
  for (const fileName of allFiles) {
    const downloadedPath = join(tempDir, fileName);
    const sourceUrl = `${SOURCE_BASE_URL}/${pack.instrumentId}/${fileName}`;
    if (!(await fileExists(downloadedPath))) {
      await downloadFile(sourceUrl, downloadedPath);
    }
  }

  for (const fileName of pack.standardFiles) {
    await copyFile(join(tempDir, fileName), join(pack.standardDir, fileName));
  }

  for (const fileName of pack.enhancedFiles) {
    await copyFile(join(tempDir, fileName), join(pack.enhancedDir, fileName));
  }

  const manifest = {
    instrumentId: pack.instrumentId,
    packLabel: pack.packLabel,
    version: '2',
    sourceName: 'nbrosowsky/tonejs-instruments',
    licenseLabel: 'MIT',
    attributionUrl: 'https://github.com/nbrosowsky/tonejs-instruments',
    assets: pack.enhancedFiles.map((fileName) => ({
      note: noteNameFromFilename(fileName),
      fileName,
      url: `/instrument-packs/${pack.instrumentId}/assets/${fileName}`,
    })),
  };
  await writeFile(pack.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
