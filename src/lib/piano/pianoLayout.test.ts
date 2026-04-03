import { describe, expect, it } from 'vitest';
import { BLACK_KEY_WIDTH, KEY_LAYOUT, WHITE_KEY_WIDTH } from './pianoLayout';

describe('pianoLayout', () => {
  it('places A#0 between A0 and B0 at the start of the keyboard', () => {
    const aSharp0 = KEY_LAYOUT.find((key) => key.midi === 22);

    expect(aSharp0).toMatchObject({
      note: 'A#0',
      isBlack: true,
    });
    expect(aSharp0?.left).toBeCloseTo((1 - BLACK_KEY_WIDTH / 2) * WHITE_KEY_WIDTH, 6);
  });

  it('places black keys between the surrounding white-key boundaries', () => {
    const cSharp1 = KEY_LAYOUT.find((key) => key.midi === 25);
    const dSharp1 = KEY_LAYOUT.find((key) => key.midi === 27);
    const fSharp1 = KEY_LAYOUT.find((key) => key.midi === 30);

    expect(cSharp1?.left).toBeCloseTo((3 - BLACK_KEY_WIDTH / 2) * WHITE_KEY_WIDTH, 6);
    expect(dSharp1?.left).toBeCloseTo((4 - BLACK_KEY_WIDTH / 2) * WHITE_KEY_WIDTH, 6);
    expect(fSharp1?.left).toBeCloseTo((6 - BLACK_KEY_WIDTH / 2) * WHITE_KEY_WIDTH, 6);
  });
});
