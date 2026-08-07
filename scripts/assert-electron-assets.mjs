import { access, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const sourceRoot = join(root, 'public');
const outputRoot = join(root, 'out', 'renderer');

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

const sourceFiles = await listFiles(sourceRoot);
await access(outputRoot);

for (const sourceFile of sourceFiles) {
  await access(join(outputRoot, relative(sourceRoot, sourceFile)));
}

console.log(`Electron asset inventory passed: ${sourceFiles.length} public files in out/renderer.`);
