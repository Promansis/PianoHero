import { describe, expect, it } from 'vitest';
import { resolvePublicAssetUrl } from './publicAssetUrl';

describe('resolvePublicAssetUrl', () => {
  it('resolves public paths from the loaded renderer document', () => {
    expect(resolvePublicAssetUrl('/soundboard/classic/clip.ogg')).toBe(
      new URL('soundboard/classic/clip.ogg', document.baseURI).toString(),
    );
  });
});
