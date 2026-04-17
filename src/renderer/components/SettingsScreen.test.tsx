import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';

describe('SettingsScreen', () => {
  const resetUserData = vi.fn().mockResolvedValue(undefined);
  const resetLearningProgress = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    window.appBridge = {
      getSetting: vi.fn().mockResolvedValue(null),
      setSetting: vi.fn().mockResolvedValue(undefined),
      listAudioFiles: vi.fn().mockResolvedValue([]),
      resetLearningProgress,
      resetUserData,
    } as unknown as typeof window.appBridge;
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    resetLearningProgress.mockClear();
    resetUserData.mockClear();
  });

  it('does not reset learning progress when modal confirmation is cancelled', async () => {
    localStorage.setItem('pianohero-filter-presets', '{"demo":true}');

    render(
      <SettingsScreen
        audioEngine={{ playMetronomeClick: vi.fn().mockResolvedValue(undefined), prepareForPlayback: vi.fn().mockResolvedValue(undefined) } as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        inputMode="both"
        midiDevices={[]}
        midiError={false}
        pitchBendEnabled
        onSettingChange={vi.fn()}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText('Practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Learning Progress' }));

    expect(screen.getByRole('button', { name: 'Yes, Reset Progress' })).toBeInTheDocument();

    // Click cancel — reset should NOT fire
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(resetLearningProgress).not.toHaveBeenCalled();
      expect(resetUserData).not.toHaveBeenCalled();
      expect(localStorage.getItem('pianohero-filter-presets')).toBe('{"demo":true}');
    });
  });

  it('resets learning progress when modal confirmation is confirmed', async () => {
    render(
      <SettingsScreen
        audioEngine={{ playMetronomeClick: vi.fn().mockResolvedValue(undefined), prepareForPlayback: vi.fn().mockResolvedValue(undefined) } as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        inputMode="both"
        midiDevices={[]}
        midiError={false}
        pitchBendEnabled
        onSettingChange={vi.fn()}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText('Practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Learning Progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset Progress' }));

    await waitFor(() => {
      expect(resetLearningProgress).toHaveBeenCalledOnce();
    });
  });
});
