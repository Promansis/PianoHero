import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('renderer index.html', () => {
  it('includes explicit favicon links for svg and ico assets', () => {
    const html = readFileSync(resolve(process.cwd(), 'src/renderer/index.html'), 'utf8');

    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="./favicon.svg" />');
    expect(html).toContain('<link rel="icon" type="image/x-icon" href="./favicon.ico" sizes="any" />');
  });
});
