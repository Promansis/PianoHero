import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';

describe('SettingsScreen', () => {
  const resetUserData = vi.fn().mockResolvedValue(undefined);
  const resetLearningProgress = vi.fn().mockResolvedValue(undefined);
  const developerUnlockAll = vi.fn().mockResolvedValue(undefined);
  const onLearningProgressReset = vi.fn();
  const onUserDataReset = vi.fn();

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
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    resetLearningProgress.mockClear();
    resetUserData.mockClear();
    developerUnlockAll.mockClear();
    onLearningProgressReset.mockClear();
    onUserDataReset.mockClear();
  });

  it('does not reset learning progress when modal confirmation is cancelled', async () => {
    localStorage.setItem('pianohero-filter-presets', '{"demo":true}');

    render(
      <SettingsScreen
        audioEngine={{ playMetronomeClick: vi.fn().mockResolvedValue(undefined), prepareForPlayback: vi.fn().mockResolvedValue(undefined) } as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        inputMode="both"
        midiDevices={[]}
        midiError={false}
        instrumentSamplePackStatuses={{}}
        pitchBendEnabled
        onInstallInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onRemoveInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onDeveloperUnlockAll={developerUnlockAll}
        onLearningProgressReset={onLearningProgressReset}
        onSettingChange={vi.fn()}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onUserDataReset={onUserDataReset}
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
        instrumentSamplePackStatuses={{}}
        pitchBendEnabled
        onInstallInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onRemoveInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onDeveloperUnlockAll={developerUnlockAll}
        onLearningProgressReset={onLearningProgressReset}
        onSettingChange={vi.fn()}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onUserDataReset={onUserDataReset}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText('Practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Learning Progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset Progress' }));

    await waitFor(() => {
      expect(resetLearningProgress).toHaveBeenCalledOnce();
      expect(onLearningProgressReset).toHaveBeenCalledOnce();
    });
  });

  it('persists per-instrument reverb overrides when the Music Theorist reward is unlocked', async () => {
    const onSettingChange = vi.fn();
    const appBridge = window.appBridge!;
    appBridge.getSetting = vi.fn(async (category: string, key: string) => {
      if (category === 'audio' && key === 'instrumentId') {
        return 'acoustic-piano';
      }
      return null;
    }) as typeof appBridge.getSetting;

    render(
      <SettingsScreen
        audioEngine={{ playMetronomeClick: vi.fn().mockResolvedValue(undefined), prepareForPlayback: vi.fn().mockResolvedValue(undefined) } as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        inputMode="both"
        midiDevices={[]}
        midiError={false}
        instrumentSamplePackStatuses={{}}
        pitchBendEnabled
        unlockedRewardIds={new Set(['audio:reverb-customization'])}
        onInstallInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onRemoveInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onDeveloperUnlockAll={developerUnlockAll}
        onLearningProgressReset={onLearningProgressReset}
        onSettingChange={onSettingChange}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onUserDataReset={onUserDataReset}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.change(await screen.findByLabelText('Acoustic Piano Reverb'), { target: { value: 'hall' } });

    await waitFor(() => {
      expect(onSettingChange).toHaveBeenCalledWith(
        'audio',
        'instrumentReverbPresets',
        JSON.stringify({ 'acoustic-piano': 'hall' }),
      );
    });
  });

  it('shows saxophone as an available instrument option', async () => {
    render(
      <SettingsScreen
        audioEngine={{ playMetronomeClick: vi.fn().mockResolvedValue(undefined), prepareForPlayback: vi.fn().mockResolvedValue(undefined) } as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        inputMode="both"
        midiDevices={[]}
        midiError={false}
        instrumentSamplePackStatuses={{}}
        pitchBendEnabled
        onInstallInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onRemoveInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onDeveloperUnlockAll={developerUnlockAll}
        onLearningProgressReset={onLearningProgressReset}
        onSettingChange={vi.fn()}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onUserDataReset={onUserDataReset}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    const instrumentSelect = await screen.findByRole('combobox', { name: 'Instrument' });
    expect(screen.getByRole('option', { name: 'Saxophone' })).toBeEnabled();
    expect(instrumentSelect).toContainElement(screen.getByRole('option', { name: 'Saxophone' }));
  });

  it('unlocks developer content only after confirmation', async () => {
    render(
      <SettingsScreen
        audioEngine={{ playMetronomeClick: vi.fn().mockResolvedValue(undefined), prepareForPlayback: vi.fn().mockResolvedValue(undefined) } as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        inputMode="both"
        midiDevices={[]}
        midiError={false}
        instrumentSamplePackStatuses={{}}
        pitchBendEnabled
        onInstallInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onRemoveInstrumentSamplePack={vi.fn().mockResolvedValue(undefined)}
        onDeveloperUnlockAll={developerUnlockAll}
        onLearningProgressReset={onLearningProgressReset}
        onSettingChange={vi.fn()}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onUserDataReset={onUserDataReset}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText('Practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock All Developer Content' }));

    expect(screen.getByRole('button', { name: 'Yes, Unlock Everything' })).toBeInTheDocument();
    expect(developerUnlockAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, Unlock Everything' }));

    await waitFor(() => {
      expect(developerUnlockAll).toHaveBeenCalledOnce();
    });
  });
});
