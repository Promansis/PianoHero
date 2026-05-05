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

  it('keeps tab and action button accessible names after adding decorative icons', async () => {
    const { container } = render(
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

    for (const tabName of ['Audio', 'Visual', 'Gameplay', 'Input', 'Practice']) {
      expect(await screen.findByRole('tab', { name: tabName })).toBeInTheDocument();
    }

    expect(container.querySelector('.settings-panel')).toContainElement(screen.getByRole('tablist', { name: 'Settings sections' }));
    expect(container.querySelector('#settings-panel-audio')).toHaveClass('settings-content-grid-audio');
    expect(screen.getByRole('button', { name: 'Calibrate…' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Input' }));
    expect(screen.getByRole('button', { name: 'Open Keyboard Mapping' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Practice' }));
    expect(screen.getByRole('button', { name: 'Reset Learning Progress' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Learning Progress' }));
    expect(screen.getByRole('button', { name: 'Yes, Reset Progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
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

  it('persists audio controls through the bridge after the layout simplification', async () => {
    const onSettingChange = vi.fn();

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
        onSettingChange={onSettingChange}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onUserDataReset={onUserDataReset}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.change(await screen.findByRole('slider', { name: 'Master Volume' }), { target: { value: '55' } });

    await waitFor(() => {
      expect(onSettingChange).toHaveBeenCalledWith('audio', 'masterVolume', '55');
      expect(window.appBridge?.setSetting).toHaveBeenCalledWith('audio', 'masterVolume', '55');
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
