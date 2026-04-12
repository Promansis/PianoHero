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

  it('does not reset learning progress when the confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    localStorage.setItem('pianohero-filter-presets', '{"demo":true}');

    render(
      <SettingsScreen
        inputMode="both"
        midiDevices={[]}
        midiError={false}
        onSettingChange={vi.fn()}
        onInputModeChange={vi.fn()}
        onRetryMidi={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText('Practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Learning Progress' }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledOnce();
      expect(resetLearningProgress).not.toHaveBeenCalled();
      expect(resetUserData).not.toHaveBeenCalled();
      expect(localStorage.getItem('pianohero-filter-presets')).toBe('{"demo":true}');
    });
  });
});
