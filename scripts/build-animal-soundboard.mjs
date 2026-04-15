import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const SOURCES_PATH = join(__dirname, 'animal-soundboard-sources.json');
const AUDIO_DIR = join(ROOT_DIR, 'public', 'soundboard', 'animals');
const SPRITE_DIR = join(ROOT_DIR, 'public', 'soundboard', 'animals-sprites');
const MANIFEST_OUT = join(ROOT_DIR, 'src', 'lib', 'audio', 'animalSoundboardManifest.json');
const CREDITS_OUT = join(ROOT_DIR, 'public', 'soundboard', 'animals-attribution.json');
const DIRECTORY_AUDIO_BASE_URL = 'https://directory.audio';

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function sanitizeText(value) {
  return decodeHtml(value.replace(/\s+/g, ' ').trim());
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extract(pattern, html, description) {
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`Unable to find ${description}`);
  }
  return match[1];
}

function buildSprite({ emoji, label, accent }) {
  const accentSoft = `${accent}22`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <radialGradient id="bubble" cx="50%" cy="34%" r="70%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="58%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="${accentSoft}"/>
    </filter>
  </defs>
  <circle cx="80" cy="74" r="54" fill="url(#bubble)" filter="url(#shadow)"/>
  <circle cx="57" cy="52" r="11" fill="#ffffff" opacity="0.5"/>
  <text x="80" y="94" font-size="68" text-anchor="middle">${escapeXml(emoji)}</text>
  <text x="80" y="136" font-family="Sora, 'Segoe UI', sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#2f241b">${escapeXml(label)}</text>
</svg>
`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function fetchBuffer(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
    });
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    if (response.status !== 429 || attempt === 3) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1200 * (attempt + 1));
    });
  }
}

async function resolveDirectoryAudioSource(entry) {
  const pageUrl = `${DIRECTORY_AUDIO_BASE_URL}${entry.pagePath}`;
  const html = await fetchText(pageUrl);
  const previewPath = extract(/data-filename="([^"]+)"/, html, `${entry.id} preview path`);
  const previewUrl = `${DIRECTORY_AUDIO_BASE_URL}/media/fc_local_media/${previewPath}`;

  return {
    downloadUrl: previewUrl,
    fileExtension: '.mp3',
    source: 'Directory.Audio',
    sourcePage: pageUrl,
    sourceTitle: sanitizeText(extract(/<title>([^<]+)<\/title>/, html, `${entry.id} title`)),
    description: sanitizeText(extract(/<meta name="description" content="([^"]+)"/, html, `${entry.id} description`)),
    author: sanitizeText(extract(/<meta name="author" content="([^"]+)">/, html, `${entry.id} author`)),
    license: sanitizeText(
      extract(/This sound effect licensed under the <a [^>]+>([^<]+)<\/a> License\./, html, `${entry.id} license`),
    ),
  };
}

async function resolveExplicitSource(entry) {
  const source = entry.audio;
  const sourcePage = source.pageUrl;
  let description = source.description;
  let sourceTitle = source.sourceTitle;
  let author = source.author;
  let license = source.license;

  if (source.type === 'deadsounds') {
    const html = await fetchText(source.pageUrl);
    description =
      description ??
      sanitizeText(extract(/<meta name="description" content="([^"]+)"/, html, `${entry.id} deadsounds description`));
    sourceTitle =
      sourceTitle ?? sanitizeText(extract(/<title>([^<]+)<\/title>/, html, `${entry.id} deadsounds title`));
    author =
      author ??
      sanitizeText(extract(/"author": \{ "name": "([^"]+)"/, html, `${entry.id} deadsounds author`));
    license = license ?? 'Site free download';
  }

  return {
    downloadUrl: source.url,
    fileExtension: source.fileExtension ?? (extname(new URL(source.url).pathname) || '.mp3'),
    source: source.source,
    sourcePage,
    sourceTitle,
    description,
    author,
    license,
  };
}

function buildAttribution(entry) {
  const parts = [entry.label];
  if (entry.author) {
    parts.push(`by ${entry.author}`);
  }
  if (entry.source) {
    parts.push(`via ${entry.source}`);
  }
  if (entry.license) {
    parts.push(`(${entry.license})`);
  }
  return parts.join(' ');
}

const sourceEntries = JSON.parse(await readFile(SOURCES_PATH, 'utf8'));
await mkdir(AUDIO_DIR, { recursive: true });
await mkdir(SPRITE_DIR, { recursive: true });

const manifest = [];

for (const entry of sourceEntries) {
  const spriteDest = join(SPRITE_DIR, `${entry.id}.svg`);
  await writeFile(spriteDest, buildSprite(entry));

  const resolvedSource = entry.pagePath ? await resolveDirectoryAudioSource(entry) : await resolveExplicitSource(entry);
  const audioBuffer = await fetchBuffer(resolvedSource.downloadUrl);
  const extension = resolvedSource.fileExtension || '.mp3';
  const audioFileName = `${entry.id}${extension}`;
  const audioDest = join(AUDIO_DIR, audioFileName);
  await writeFile(audioDest, audioBuffer);

  const manifestEntry = {
    id: entry.id,
    label: entry.label,
    shortLabel: entry.shortLabel,
    category: entry.category,
    emoji: entry.emoji,
    accent: entry.accent,
    midi: 36 + manifest.length,
    src: `/soundboard/animals/${audioFileName}`,
    visualSrc: `/soundboard/animals-sprites/${entry.id}.svg`,
    gainDb: entry.category === 'bug' ? -7 : entry.category === 'bird' ? -5 : -4,
    source: resolvedSource.source,
    sourcePage: resolvedSource.sourcePage,
    sourceTitle: resolvedSource.sourceTitle,
    description: resolvedSource.description,
    license: resolvedSource.license,
    author: resolvedSource.author,
    attribution: buildAttribution({
      ...entry,
      ...resolvedSource,
    }),
  };

  manifest.push(manifestEntry);
  process.stdout.write(`+ ${entry.id}\n`);
}

await writeFile(MANIFEST_OUT, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(CREDITS_OUT, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ${manifest.length} animal soundboard entries.`);
