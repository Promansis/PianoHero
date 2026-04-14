import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultKeyboardMapping } from '../../lib/input/settings';
import type { ComputerKeyboardInputService } from '../../lib/input/computerKeyboardInputService';
import type { InputEvent, KeyboardInputState, KeyboardMapping } from '../../lib/input/types';
import { KeyboardSetupScreen } from './KeyboardSetupScreen';

class MockKeyboardInputService {
  private mapping: KeyboardMapping = createDefaultKeyboardMapping();

  private octaveShift = 0;

  private inputListeners = new Set<(event: InputEvent) => void>();

  private stateListeners = new Set<(state: KeyboardInputState) => void>();

  suspended = false;

  subscribe(listener: (event: InputEvent) => void): () => void {
    this.inputListeners.add(listener);
    return () => {
      this.inputListeners.delete(listener);
    };
  }

  subscribeState(listener: (state: KeyboardInputState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  getMapping(): KeyboardMapping {
    return { ...this.mapping };
  }

  getState(): KeyboardInputState {
    return {
      octaveShift: this.octaveShift,
      mapping: { ...this.mapping },
    };
  }

  setMapping(mapping: KeyboardMapping): void {
    this.mapping = { ...mapping };
    const state = this.getState();
    this.stateListeners.forEach((listener) => listener(state));
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
  }
}

describe('KeyboardSetupScreen', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.appBridge = {
      getSetting: vi.fn().mockResolvedValue(null),
      setSetting: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof window.appBridge;
  });

  it('renders the real-piano computer keyboard bindings', async () => {
    render(
      <KeyboardSetupScreen
        keyboardInputService={new MockKeyboardInputService() as unknown as ComputerKeyboardInputService}
        inputMode="both"
        onInputModeChange={vi.fn()}
      />,
    );

    await screen.findByText('34-note piano layout');

    expect(screen.getByRole('button', { name: 'Bind C3 to Z' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bind C#4 to L' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bind D#4 to ;' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bind F4 to Q' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bind F#4 to 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bind G#5 to 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bind A5 to P' })).toBeInTheDocument();
  });

  it('enters capture mode when a mapped piano key is clicked', async () => {
    const service = new MockKeyboardInputService();

    render(
      <KeyboardSetupScreen
        keyboardInputService={service as unknown as ComputerKeyboardInputService}
        inputMode="both"
        onInputModeChange={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Bind C3 to Z' }));

    expect(screen.getByText('Press a key to bind C3. Press Escape to cancel.')).toBeInTheDocument();
    await waitFor(() => {
      expect(service.suspended).toBe(true);
    });
  });
});
