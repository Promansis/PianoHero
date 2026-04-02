import { afterEach, describe, expect, it } from 'vitest';
import { ComputerKeyboardInputService } from './computerKeyboardInputService';
import { MAX_OCTAVE_SHIFT } from './settings';

function dispatch(type: 'keydown' | 'keyup', code: string, repeat = false): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, repeat, bubbles: true }));
}

describe('ComputerKeyboardInputService', () => {
  const services: ComputerKeyboardInputService[] = [];

  afterEach(() => {
    for (const service of services) {
      service.dispose();
    }
    services.length = 0;
  });

  it('emits noteon and noteoff for default note bindings', () => {
    const service = new ComputerKeyboardInputService();
    services.push(service);
    service.init();

    const events: string[] = [];
    const unsub = service.subscribe((event) => {
      if (event.type === 'noteon' || event.type === 'noteoff') {
        events.push(`${event.type}:${event.note}`);
      }
    });

    dispatch('keydown', 'KeyZ');
    dispatch('keyup', 'KeyZ');

    unsub();
    expect(events).toEqual(['noteon:48', 'noteoff:48']);
  });

  it('ignores repeated keydown for the same key', () => {
    const service = new ComputerKeyboardInputService();
    services.push(service);
    service.init();

    const events: string[] = [];
    service.subscribe((event) => {
      if (event.type === 'noteon') {
        events.push(`noteon:${event.note}`);
      }
    });

    dispatch('keydown', 'KeyZ');
    dispatch('keydown', 'KeyZ', true);
    dispatch('keyup', 'KeyZ');

    expect(events).toEqual(['noteon:48']);
  });

  it('applies octave shift and clamps to max range', () => {
    const service = new ComputerKeyboardInputService();
    services.push(service);
    service.init();

    for (let i = 0; i < 12; i += 1) {
      dispatch('keydown', 'BracketRight');
      dispatch('keyup', 'BracketRight');
    }

    expect(service.getState().octaveShift).toBe(MAX_OCTAVE_SHIFT);

    const events: number[] = [];
    service.subscribe((event) => {
      if (event.type === 'noteon' && typeof event.note === 'number') {
        events.push(event.note);
      }
    });

    dispatch('keydown', 'KeyU');
    dispatch('keyup', 'KeyU');

    expect(events.at(0)).toBe(107);
  });

  it('releases held notes and sustain on blur', () => {
    const service = new ComputerKeyboardInputService();
    services.push(service);
    service.init();

    const events: string[] = [];
    service.subscribe((event) => {
      if (event.type === 'sustain') {
        events.push(`sustain:${event.sustainValue}`);
      }
      if (event.type === 'noteoff') {
        events.push(`noteoff:${event.note}`);
      }
    });

    dispatch('keydown', 'Space');
    dispatch('keydown', 'KeyZ');
    window.dispatchEvent(new Event('blur'));

    expect(events).toContain('noteoff:48');
    expect(events).toContain('sustain:0');
  });
});
