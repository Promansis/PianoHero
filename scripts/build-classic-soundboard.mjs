import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const OUTPUT_DIR = join(REPO_ROOT, 'public/soundboard/classic');
const MANIFEST_PATH = join(REPO_ROOT, 'src/lib/audio/classicSoundboardManifest.json');
const WORK_DIR = join(tmpdir(), 'pianohero-classic-soundboard');

const SOURCE = {
  title: 'Mixkit Sound Effects',
  page: 'https://mixkit.co/free-sound-effects/',
  author: 'Mixkit',
  license: 'Mixkit Free License',
};

const CLIPS = [
  [616, 'toy-whistle', 'Toy Whistle', 'Whistle', 'toy', '🪈', '#ffc857', -2],
  [2882, 'cartoon-laugh', 'Cartoon Laugh', 'Laugh', 'voice', '😆', '#ff7ab6', -2],
  [414, 'creature-laugh', 'Creature Laugh', 'Creature', 'voice', '👾', '#8f7cff', -2],
  [2364, 'hard-pop', 'Hard Pop', 'Pop', 'toy', '🫧', '#7bdff2', -1],
  [744, 'sad-trombone', 'Sad Trombone', 'Trombone', 'music', '📯', '#f9c74f', -3],
  [92, 'kitty-meow', 'Kitty Meow', 'Kitty', 'pet', '🐱', '#ffb3c1', -1],
  [2194, 'kiss-pop', 'Kiss Pop', 'Kiss', 'voice', '💋', '#ff5d8f', -2],
  [391, 'falling-scream', 'Falling Scream', 'Scream', 'voice', '😱', '#f94144', -3],
  [2209, 'tiny-sneeze', 'Tiny Sneeze', 'Sneeze', 'voice', '🤧', '#90be6d', -1],
  [343, 'quick-laugh', 'Quick Laugh', 'Laugh2', 'voice', '😂', '#ffafcc', -1],
  [746, 'dazzle-birds', 'Dazzle Birds', 'Birds', 'toy', '🐦', '#70d6ff', -2],
  [2891, 'whoopee-pop', 'Whoopee Pop', 'Whoop', 'voice', '💨', '#adb5bd', -2],
  [2889, 'fast-splat', 'Fast Splat', 'Splat', 'impact', '🍅', '#ef476f', -1],
  [2894, 'boing-hit', 'Boing Hit', 'Boing', 'toy', '🪀', '#06d6a0', -1],
  [2886, 'clown-horn', 'Clown Horn', 'Horn', 'toy', '🤡', '#ff006e', -2],
  [395, 'falling-whistle', 'Falling Whistle', 'Fall', 'toy', '🕳️', '#343a40', -2],
  [2885, 'giggle-burst', 'Giggle Burst', 'Giggle', 'voice', '🤭', '#ff99c8', -1],
  [110, 'door-bell', 'Door Bell', 'Bell', 'object', '🔔', '#ffd166', -2],
  [2151, 'quick-punch', 'Quick Punch', 'Punch', 'impact', '👊', '#e63946', -1],
  [738, 'cartoon-whistle', 'Cartoon Whistle', 'Whistl', 'voice', '😗', '#f1fa8c', -1],
  [2880, 'circus-blip', 'Circus Blip', 'Circus', 'toy', '🎪', '#fb5607', -2],
  [527, 'party-horn', 'Party Horn', 'Party', 'toy', '🎺', '#ffbe0b', -2],
  [2890, 'quick-splash', 'Quick Splash', 'Splash', 'impact', '💦', '#00b4d8', -1],
  [528, 'clown-nose', 'Clown Nose', 'Nose', 'toy', '🔴', '#d00000', -1],
  [2813, 'toy-squeak', 'Toy Squeak', 'Squeak', 'toy', '🧸', '#f28482', -1],
  [2214, 'baby-sneeze', 'Baby Sneeze', 'Baby', 'voice', '👶', '#ffd6a5', -1],
  [2265, 'kid-laugh', 'Kid Laugh', 'Kid', 'voice', '🧒', '#caffbf', -1],
  [2244, 'crunchy-bite', 'Crunchy Bite', 'Crunch', 'object', '🥨', '#bc6c25', -1],
  [2768, 'pain-scream', 'Pain Scream', 'Pain', 'voice', '🥴', '#c1121f', -2],
  [2204, 'ow-yelp', 'Ow Yelp', 'Ow', 'voice', '🤕', '#ff6b6b', -1],
  [2659, 'mouth-blow', 'Mouth Blow', 'Blow', 'voice', '🌬️', '#caf0f8', -1],
  [2278, 'sleepy-yawn', 'Sleepy Yawn', 'Yawn', 'voice', '🥱', '#bde0fe', -1],
  [2478, 'snore-pop', 'Snore Pop', 'Snore', 'voice', '😴', '#b8c0ff', -1],
  [1133, 'camera-click', 'Camera Click', 'Camera', 'object', '📸', '#adb5bd', -1],
  [1438, 'vintage-shutter', 'Vintage Shutter', 'Shutter', 'object', '🎞️', '#6c757d', -1],
  [2841, 'cash-key', 'Cash Key', 'ATM', 'object', '🏧', '#2a9d8f', -1],
  [1999, 'prize-coin', 'Prize Coin', 'Coin', 'object', '🥇', '#ffd60a', -1],
  [1989, 'money-bag', 'Money Bag', 'Money', 'object', '💰', '#52b788', -1],
  [195, 'creaky-door', 'Creaky Door', 'Door', 'object', '🚪', '#8d6e63', -2],
  [197, 'wood-knock', 'Wood Knock', 'Knock', 'object', '✊', '#a47148', -1],
  [2842, 'key-lock', 'Key Lock', 'Lock', 'object', '🗝️', '#b08968', -1],
  [759, 'glass-break', 'Glass Break', 'Glass', 'impact', '🪟', '#90e0ef', -3],
  [2836, 'glasses-clink', 'Glasses Clink', 'Clink', 'object', '🥂', '#f1faee', -1],
  [2936, 'wine-clink', 'Wine Clink', 'Wine', 'object', '🍷', '#9d0208', -1],
  [2834, 'ice-drop', 'Ice Drop', 'Ice', 'object', '🧊', '#ade8f4', -1],
  [275, 'mouse-click', 'Mouse Click', 'Click', 'object', '🖱️', '#ced4da', -1],
  [2995, 'stapler-snap', 'Stapler Snap', 'Staple', 'object', '📎', '#adb5bd', -1],
  [2533, 'key-type', 'Key Type', 'Key', 'object', '⌨️', '#495057', -1],
  [1061, 'clock-tick', 'Clock Tick', 'Tick', 'object', '⏱️', '#ffba08', -1],
  [1064, 'watch-spin', 'Watch Spin', 'Watch', 'object', '⌚', '#dee2e6', -1],
  [1565, 'car-horn', 'Car Horn', 'Car', 'vehicle', '🚗', '#e63946', -2],
  [719, 'double-horn', 'Double Horn', 'Horn2', 'vehicle', '🚙', '#f77f00', -2],
  [1564, 'car-door', 'Car Door', 'CarDr', 'vehicle', '🚘', '#457b9d', -1],
  [1555, 'toy-car-crash', 'Toy Car Crash', 'Crash', 'vehicle', '🏎️', '#d62828', -1],
  [1631, 'toy-train', 'Toy Train', 'Train', 'vehicle', '🚂', '#6c757d', -2],
  [1643, 'police-siren', 'Police Siren', 'Siren', 'alert', '🚨', '#ef233c', -3],
  [614, 'police-whistle', 'Police Whistle', 'Police', 'alert', '🚓', '#0077b6', -1],
  [1180, 'water-jump', 'Water Jump', 'Jump', 'weather', '🏊', '#00b4d8', -2],
  [1311, 'water-splash', 'Water Splash', 'Water', 'weather', '🌊', '#0096c7', -1],
  [2839, 'keys-drop', 'Keys Drop', 'Keys', 'object', '🔑', '#f4a261', -1],
  [1513, 'lasso-whip', 'Lasso Whip', 'Whip', 'impact', '🤠', '#dda15e', -2],
].map(([mixkitId, id, label, shortLabel, category, emoji, accent, gainDb]) => ({
  mixkitId,
  id,
  label,
  shortLabel,
  category,
  emoji,
  accent,
  gainDb,
}));

if (CLIPS.length !== 61) {
  throw new Error(`Expected 61 classic clips, found ${CLIPS.length}.`);
}

for (const key of ['id', 'emoji', 'mixkitId']) {
  const uniqueCount = new Set(CLIPS.map((clip) => clip[key])).size;
  if (uniqueCount !== CLIPS.length) {
    throw new Error(`Classic clips must have unique ${key} values.`);
  }
}

function downloadUrl(clip) {
  return `https://assets.mixkit.co/active_storage/sfx/${clip.mixkitId}/${clip.mixkitId}.wav`;
}

function outputFileName(index, clip) {
  return `${String(index + 1).padStart(2, '0')}-${clip.id}.ogg`;
}

async function downloadClip(clip, outputPath) {
  const response = await fetch(downloadUrl(clip));
  if (!response.ok) {
    throw new Error(`Failed to download ${clip.label}: ${response.status} ${response.statusText}`);
  }

  const wavPath = join(WORK_DIR, `${clip.mixkitId}.wav`);
  await writeFile(wavPath, Buffer.from(await response.arrayBuffer()));
  await execFileAsync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    wavPath,
    '-c:a',
    'libvorbis',
    '-q:a',
    '5',
    outputPath,
  ]);
}

await execFileAsync('chmod', ['-R', 'u+w', WORK_DIR]).catch(() => undefined);
await rm(WORK_DIR, { recursive: true, force: true });
await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(WORK_DIR, { recursive: true });
await mkdir(OUTPUT_DIR, { recursive: true });

const manifest = [];
for (const [index, clip] of CLIPS.entries()) {
  const outputName = outputFileName(index, clip);
  await downloadClip(clip, join(OUTPUT_DIR, outputName));

  manifest.push({
    id: clip.id,
    label: clip.label,
    shortLabel: clip.shortLabel,
    category: clip.category,
    emoji: clip.emoji,
    accent: clip.accent,
    midi: 36 + index,
    src: `/soundboard/classic/${outputName}`,
    gainDb: clip.gainDb,
    source: SOURCE.title,
    sourcePage: SOURCE.page,
    sourceTitle: `${clip.label} (${clip.mixkitId})`,
    license: SOURCE.license,
    author: SOURCE.author,
    attribution: `${clip.label} from ${SOURCE.title} (${SOURCE.license})`,
  });
}

await writeFile(
  join(OUTPUT_DIR, 'SOURCE-mixkit.txt'),
  [
    'Classic soundboard samples sourced from Mixkit Sound Effects.',
    SOURCE.page,
    'Individual source IDs are recorded in src/lib/audio/classicSoundboardManifest.json.',
    '',
  ].join('\n'),
);
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
await execFileAsync('chmod', ['-R', 'u+w', WORK_DIR]).catch(() => undefined);
await rm(WORK_DIR, { recursive: true, force: true });

console.log(`Built ${manifest.length} Classic soundboard clips from Mixkit sample downloads.`);
