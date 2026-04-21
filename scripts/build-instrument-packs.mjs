/**
 * Downloads redistributable instrument samples and generates bundled/enhanced pack assets.
 * Run with: node scripts/build-instrument-packs.mjs
 */

import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const TEMP_BUILD_ROOT = join(PUBLIC_DIR, '.tmp-pilot-pack-build');
const SOURCE_BASE_URL =
  'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples';
const MIDI_JS_FLUIDR3_BASE_URL =
  'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM';

const PACKS = [
  {
    instrumentId: 'honky-tonk',
    source: {
      type: 'midi-js',
      sourceName: 'FluidR3_GM via MIDI.js Soundfonts',
      licenseLabel: 'CC BY 3.0',
      attributionUrl: 'https://github.com/gleitz/midi-js-soundfonts',
      remoteInstrumentId: 'honkytonk_piano',
    },
    standardDir: join(PUBLIC_DIR, 'samples', 'fluidr3', 'honky-tonk'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'honky-tonk', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'honky-tonk', 'manifest.json'),
    packLabel: 'Honky-Tonk Enhanced Pack',
    standardFiles: ['C1.mp3', 'G1.mp3', 'C2.mp3', 'G2.mp3', 'C3.mp3', 'G3.mp3', 'C4.mp3', 'G4.mp3', 'C5.mp3', 'G5.mp3', 'C6.mp3', 'G6.mp3', 'C7.mp3'],
    enhancedFiles: ['A0.mp3', 'C1.mp3', 'Eb1.mp3', 'G1.mp3', 'Bb1.mp3', 'C2.mp3', 'Eb2.mp3', 'G2.mp3', 'Bb2.mp3', 'C3.mp3', 'Eb3.mp3', 'G3.mp3', 'Bb3.mp3', 'C4.mp3', 'Eb4.mp3', 'G4.mp3', 'Bb4.mp3', 'C5.mp3', 'Eb5.mp3', 'G5.mp3', 'Bb5.mp3', 'C6.mp3', 'Eb6.mp3', 'G6.mp3', 'Bb6.mp3', 'C7.mp3', 'C8.mp3'],
  },
  {
    instrumentId: 'flute',
    source: {
      type: 'tonejs',
      sourceName: 'nbrosowsky/tonejs-instruments',
      licenseLabel: 'MIT',
      attributionUrl: 'https://github.com/nbrosowsky/tonejs-instruments',
    },
    standardDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'flute'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'flute', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'flute', 'manifest.json'),
    packLabel: 'Flute Enhanced Pack',
    standardFiles: ['C4.mp3', 'A4.mp3', 'E5.mp3', 'C6.mp3', 'A6.mp3', 'C7.mp3'],
    enhancedFiles: ['C4.mp3', 'E4.mp3', 'A4.mp3', 'C5.mp3', 'E5.mp3', 'A5.mp3', 'C6.mp3', 'E6.mp3', 'A6.mp3', 'C7.mp3'],
  },
  {
    instrumentId: 'trumpet',
    source: {
      type: 'tonejs',
      sourceName: 'nbrosowsky/tonejs-instruments',
      licenseLabel: 'MIT',
      attributionUrl: 'https://github.com/nbrosowsky/tonejs-instruments',
    },
    standardDir: join(PUBLIC_DIR, 'samples', 'nbrosowsky', 'trumpet'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'trumpet', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'trumpet', 'manifest.json'),
    packLabel: 'Trumpet Enhanced Pack',
    standardFiles: ['F3.mp3', 'C4.mp3', 'F4.mp3', 'As4.mp3', 'F5.mp3', 'C6.mp3'],
    enhancedFiles: ['F3.mp3', 'A3.mp3', 'C4.mp3', 'Ds4.mp3', 'F4.mp3', 'G4.mp3', 'As4.mp3', 'D5.mp3', 'F5.mp3', 'A5.mp3', 'C6.mp3'],
  },
  {
    instrumentId: 'saxophone',
    source: {
      type: 'midi-js',
      sourceName: 'FluidR3_GM via MIDI.js Soundfonts',
      licenseLabel: 'CC BY 3.0',
      attributionUrl: 'https://github.com/gleitz/midi-js-soundfonts',
      remoteInstrumentId: 'alto_sax',
    },
    standardDir: join(PUBLIC_DIR, 'samples', 'fluidr3', 'saxophone'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'saxophone', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'saxophone', 'manifest.json'),
    packLabel: 'Saxophone Enhanced Pack',
    standardFiles: ['A3.mp3', 'C4.mp3', 'Eb4.mp3', 'G4.mp3', 'Bb4.mp3', 'D5.mp3', 'F5.mp3', 'A5.mp3', 'C6.mp3'],
    enhancedFiles: ['A3.mp3', 'C4.mp3', 'Eb4.mp3', 'F4.mp3', 'G4.mp3', 'A4.mp3', 'Bb4.mp3', 'C5.mp3', 'D5.mp3', 'Eb5.mp3', 'F5.mp3', 'G5.mp3', 'A5.mp3', 'Bb5.mp3', 'C6.mp3'],
  },
  {
    instrumentId: 'cello',
    source: {
      type: 'midi-js',
      sourceName: 'FluidR3_GM via MIDI.js Soundfonts',
      licenseLabel: 'CC BY 3.0',
      attributionUrl: 'https://github.com/gleitz/midi-js-soundfonts',
      remoteInstrumentId: 'cello',
    },
    standardDir: join(PUBLIC_DIR, 'samples', 'fluidr3', 'cello'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'cello', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'cello', 'manifest.json'),
    packLabel: 'Cello Enhanced Pack',
    standardFiles: ['C2.mp3', 'G2.mp3', 'C3.mp3', 'G3.mp3', 'C4.mp3', 'G4.mp3', 'C5.mp3', 'G5.mp3'],
    enhancedFiles: ['C2.mp3', 'Eb2.mp3', 'G2.mp3', 'Bb2.mp3', 'C3.mp3', 'Eb3.mp3', 'G3.mp3', 'Bb3.mp3', 'C4.mp3', 'Eb4.mp3', 'G4.mp3', 'Bb4.mp3', 'C5.mp3', 'Eb5.mp3', 'G5.mp3', 'C6.mp3'],
  },
  {
    instrumentId: 'string-ensemble',
    source: {
      type: 'midi-js',
      sourceName: 'FluidR3_GM via MIDI.js Soundfonts',
      licenseLabel: 'CC BY 3.0',
      attributionUrl: 'https://github.com/gleitz/midi-js-soundfonts',
      remoteInstrumentId: 'string_ensemble_1',
    },
    standardDir: join(PUBLIC_DIR, 'samples', 'fluidr3', 'string-ensemble'),
    enhancedDir: join(PUBLIC_DIR, 'instrument-packs', 'string-ensemble', 'assets'),
    manifestPath: join(PUBLIC_DIR, 'instrument-packs', 'string-ensemble', 'manifest.json'),
    packLabel: 'String Ensemble Enhanced Pack',
    standardFiles: ['C2.mp3', 'G2.mp3', 'C3.mp3', 'G3.mp3', 'C4.mp3', 'G4.mp3', 'C5.mp3', 'G5.mp3'],
    enhancedFiles: ['C2.mp3', 'Eb2.mp3', 'G2.mp3', 'Bb2.mp3', 'C3.mp3', 'Eb3.mp3', 'G3.mp3', 'Bb3.mp3', 'C4.mp3', 'Eb4.mp3', 'G4.mp3', 'Bb4.mp3', 'C5.mp3', 'Eb5.mp3', 'G5.mp3', 'C6.mp3'],
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

async function fetchMidiJsSoundfont(remoteInstrumentId) {
  const response = await fetch(`${MIDI_JS_FLUIDR3_BASE_URL}/${remoteInstrumentId}-mp3.js`);
  if (!response.ok) {
    throw new Error(`Failed to download ${remoteInstrumentId}-mp3.js: ${response.status}`);
  }

  const source = await response.text();
  const context = { MIDI: { Soundfont: {} } };
  vm.runInNewContext(source, context);
  const noteMap = context.MIDI.Soundfont[remoteInstrumentId];
  if (!noteMap || typeof noteMap !== 'object') {
    throw new Error(`Unable to parse MIDI.js soundfont for ${remoteInstrumentId}.`);
  }
  return noteMap;
}

await rm(TEMP_BUILD_ROOT, { recursive: true, force: true });

try {
  for (const pack of PACKS) {
    const tempDir = join(TEMP_BUILD_ROOT, pack.instrumentId);
    await rm(tempDir, { recursive: true, force: true });
    await mkdir(tempDir, { recursive: true });
    await mkdir(pack.standardDir, { recursive: true });
    await mkdir(pack.enhancedDir, { recursive: true });

    const allFiles = [...new Set([...pack.standardFiles, ...pack.enhancedFiles])];
    if (pack.source.type === 'tonejs') {
      for (const fileName of allFiles) {
        const downloadedPath = join(tempDir, fileName);
        const sourceUrl = `${SOURCE_BASE_URL}/${pack.instrumentId}/${fileName}`;
        if (!(await fileExists(downloadedPath))) {
          await downloadFile(sourceUrl, downloadedPath);
        }
      }
    } else {
      const noteMap = await fetchMidiJsSoundfont(pack.source.remoteInstrumentId);
      for (const fileName of allFiles) {
        const downloadedPath = join(tempDir, fileName);
        if (await fileExists(downloadedPath)) {
          continue;
        }
        const noteName = noteNameFromFilename(fileName);
        const dataUri = noteMap[noteName];
        if (typeof dataUri !== 'string' || !dataUri.startsWith('data:audio/mp3;base64,')) {
          throw new Error(`Missing MP3 note ${noteName} in ${pack.source.remoteInstrumentId}.`);
        }
        const base64Data = dataUri.slice('data:audio/mp3;base64,'.length);
        await writeFile(downloadedPath, Buffer.from(base64Data, 'base64'));
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
      sourceName: pack.source.sourceName,
      licenseLabel: pack.source.licenseLabel,
      attributionUrl: pack.source.attributionUrl,
      assets: pack.enhancedFiles.map((fileName) => ({
        note: noteNameFromFilename(fileName),
        fileName,
        url: `/instrument-packs/${pack.instrumentId}/assets/${fileName}`,
      })),
    };
    await writeFile(pack.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
} finally {
  await rm(TEMP_BUILD_ROOT, { recursive: true, force: true });
}
