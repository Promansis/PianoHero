import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const TEMP_DIR = join(ROOT_DIR, 'public', '.tmp-audio-normalize');

const INSTRUMENT_TARGET_PEAK_DB = -3;
const SOUNDBOARD_TARGET_MEAN_DB = -20;
const SOUNDBOARD_TARGET_PEAK_DB = -2;
const SKIP_GAIN_EPSILON_DB = 0.6;

const SOUND_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav', '.flac', '.aif', '.aiff', '.m4a']);
const KNOWN_INVALID_UNREFERENCED_FILES = [
  'public/soundboard/animals/coyote.mp3',
  'public/soundboard/animals/raven.mp3',
  'public/soundboard/animals/woodpecker.mp3',
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const verifyOnly = args.has('--verify');

async function runCommand(command, args, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}\n${stderr}`));
    });
  });
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listAudioFiles(dir) {
  const entries = await runCommand('find', [
    dir,
    '-type',
    'f',
    '(',
    '-name',
    '*.mp3',
    '-o',
    '-name',
    '*.ogg',
    '-o',
    '-name',
    '*.wav',
    '-o',
    '-name',
    '*.flac',
    '-o',
    '-name',
    '*.aif',
    '-o',
    '-name',
    '*.aiff',
    '-o',
    '-name',
    '*.m4a',
    ')',
  ]);
  return entries.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function parseClassicSoundboardRefs(source) {
  return [...source.matchAll(/src: '([^']+)'/g)].map((match) => `public${match[1]}`);
}

async function getRuntimeSoundboardFiles() {
  const catalogSource = await readFile(join(ROOT_DIR, 'src/lib/audio/soundboardCatalog.ts'), 'utf8');
  const animalManifest = JSON.parse(await readFile(join(ROOT_DIR, 'src/lib/audio/animalSoundboardManifest.json'), 'utf8'));
  const refs = new Set(parseClassicSoundboardRefs(catalogSource));

  for (const clip of animalManifest) {
    if (typeof clip.src === 'string') {
      refs.add(`public${clip.src.split('?')[0]}`);
    }
  }

  return [...refs].sort();
}

async function getInstrumentFiles() {
  return [
    ...(await listAudioFiles('public/samples')),
    ...(await listAudioFiles('public/instrument-packs')),
  ].filter((path) => SOUND_EXTENSIONS.has(extname(path).toLowerCase()));
}

async function analyzeVolume(path) {
  const { stderr } = await runCommand('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-i',
    path,
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]);

  const meanMatch = stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  const maxMatch = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  if (!meanMatch || !maxMatch) {
    throw new Error(`Unable to parse ffmpeg volume data for ${path}`);
  }

  return {
    meanVolumeDb: Number(meanMatch[1]),
    maxVolumeDb: Number(maxMatch[1]),
  };
}

function computeGainDb(kind, analysis) {
  if (kind === 'instrument') {
    return INSTRUMENT_TARGET_PEAK_DB - analysis.maxVolumeDb;
  }

  const meanGainDb = SOUNDBOARD_TARGET_MEAN_DB - analysis.meanVolumeDb;
  const peakSafeGainDb = SOUNDBOARD_TARGET_PEAK_DB - analysis.maxVolumeDb;
  return Math.min(meanGainDb, peakSafeGainDb);
}

function codecArgsFor(path) {
  switch (extname(path).toLowerCase()) {
    case '.mp3':
      return ['-c:a', 'libmp3lame', '-q:a', '4'];
    case '.ogg':
      return ['-c:a', 'libvorbis', '-q:a', '4'];
    case '.wav':
      return ['-c:a', 'pcm_s16le'];
    case '.flac':
      return ['-c:a', 'flac'];
    case '.m4a':
      return ['-c:a', 'aac', '-b:a', '192k'];
    default:
      return [];
  }
}

function tempPathFor(path, suffix = '') {
  const hash = createHash('sha1').update(path).digest('hex').slice(0, 10);
  return join(TEMP_DIR, `${hash}${suffix}${extname(path)}`);
}

async function normalizeFile(path, kind) {
  const before = await analyzeVolume(path);
  const gainDb = computeGainDb(kind, before);
  if (Math.abs(gainDb) < SKIP_GAIN_EPSILON_DB) {
    return { path, kind, before, after: before, gainDb, changed: false };
  }

  let outputPath = tempPathFor(path);
  await runCommand('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    path,
    '-vn',
    '-af',
    `volume=${gainDb.toFixed(4)}dB`,
    ...codecArgsFor(path),
    outputPath,
  ]);

  let outputAnalysis = await analyzeVolume(relative(ROOT_DIR, outputPath));
  for (let pass = 0; kind === 'soundboard' && outputAnalysis.maxVolumeDb > SOUNDBOARD_TARGET_PEAK_DB + 0.6 && pass < 3; pass += 1) {
    const safeOutputPath = tempPathFor(path, `-safe-${pass}`);
    const safetyGainDb = SOUNDBOARD_TARGET_PEAK_DB - outputAnalysis.maxVolumeDb - 0.2;
    await runCommand('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      relative(ROOT_DIR, outputPath),
      '-vn',
      '-af',
      `volume=${safetyGainDb.toFixed(4)}dB`,
      ...codecArgsFor(path),
      safeOutputPath,
    ]);
    outputPath = safeOutputPath;
    outputAnalysis = await analyzeVolume(relative(ROOT_DIR, outputPath));
  }

  if (!dryRun && !verifyOnly) {
    const data = await readFile(outputPath);
    await writeFile(join(ROOT_DIR, path), data);
  }

  const after = dryRun || verifyOnly ? outputAnalysis : await analyzeVolume(path);
  return { path, kind, before, after, gainDb, changed: true };
}

function assertNormalized(result) {
  const targetPeak = result.kind === 'instrument' ? INSTRUMENT_TARGET_PEAK_DB : SOUNDBOARD_TARGET_PEAK_DB;
  if (result.after.maxVolumeDb > targetPeak + 0.6) {
    throw new Error(`${result.path} peaks at ${result.after.maxVolumeDb} dB after normalization`);
  }

  if (result.kind === 'instrument' && Math.abs(result.after.maxVolumeDb - INSTRUMENT_TARGET_PEAK_DB) > 0.7) {
    throw new Error(`${result.path} peak target missed: ${result.after.maxVolumeDb} dB`);
  }
}

function formatDb(value) {
  return `${value.toFixed(1)} dB`;
}

async function removeKnownInvalidUnreferencedFiles(runtimeSoundboardFiles) {
  const runtimeRefs = new Set(runtimeSoundboardFiles);
  for (const path of KNOWN_INVALID_UNREFERENCED_FILES) {
    const absPath = join(ROOT_DIR, path);
    if (runtimeRefs.has(path) || !(await pathExists(absPath))) {
      continue;
    }
    if (dryRun || verifyOnly) {
      console.log(`would remove invalid unreferenced file ${path}`);
      continue;
    }
    await rm(absPath);
    console.log(`removed invalid unreferenced file ${path}`);
  }
}

async function main() {
  await mkdir(TEMP_DIR, { recursive: true });
  const runtimeSoundboardFiles = await getRuntimeSoundboardFiles();
  const targets = [
    ...(await getInstrumentFiles()).map((path) => ({ path, kind: 'instrument' })),
    ...runtimeSoundboardFiles.map((path) => ({ path, kind: 'soundboard' })),
  ];

  const uniqueTargets = [...new Map(targets.map((target) => [target.path, target])).values()];
  const results = [];
  try {
    for (const target of uniqueTargets) {
      const result = await normalizeFile(target.path, target.kind);
      assertNormalized(result);
      results.push(result);
      const state = result.changed ? 'normalized' : 'ok';
      console.log(
        `${state} ${target.path} (${formatDb(result.before.meanVolumeDb)} mean, ${formatDb(result.before.maxVolumeDb)} peak -> ${formatDb(result.after.meanVolumeDb)} mean, ${formatDb(result.after.maxVolumeDb)} peak)`,
      );
    }

    await removeKnownInvalidUnreferencedFiles(runtimeSoundboardFiles);
  } finally {
    await rm(TEMP_DIR, { recursive: true, force: true });
  }

  const changed = results.filter((result) => result.changed).length;
  console.log(`${verifyOnly ? 'Verified' : dryRun ? 'Dry-run checked' : 'Processed'} ${results.length} files; ${changed} changed.`);
}

await main();
