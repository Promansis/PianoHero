import { describe, expect, it, vi } from 'vitest';
import { saveSetting } from './saveSetting';

describe('saveSetting', () => {
  it('returns durable success only after the bridge resolves', async () => {
    const values = new Map([['input:mode', 'both']]);
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    window.appBridge = {
      getSetting: vi.fn(async (category: string, key: string) => values.get(`${category}:${key}`) ?? null),
      setSetting: vi.fn(async (category: string, key: string, value: string) => {
        await write;
        values.set(`${category}:${key}`, value);
      }),
    } as unknown as typeof window.appBridge;

    const resultPromise = saveSetting('input', 'mode', 'midi');
    expect(await Promise.race([resultPromise, Promise.resolve(null)])).toBe(null);

    resolveWrite();
    await expect(resultPromise).resolves.toEqual({ saved: true });
    await expect(window.appBridge!.getSetting('input', 'mode')).resolves.toBe('midi');
  });

  it('catches rejected writes without changing restart read-back', async () => {
    const getSetting = vi.fn().mockResolvedValue('both');
    window.appBridge = {
      getSetting,
      setSetting: vi.fn().mockRejectedValue(new Error('write failed')),
    } as unknown as typeof window.appBridge;

    await expect(saveSetting('input', 'mode', 'midi')).resolves.toEqual({ saved: false });
    await expect(window.appBridge!.getSetting('input', 'mode')).resolves.toBe('both');
  });
});
