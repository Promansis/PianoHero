import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MainMenuScreen } from './MainMenuScreen';

describe('MainMenuScreen', () => {
  it('keeps all destination buttons accessible and wired to the same handlers', async () => {
    const user = userEvent.setup();
    const handlers = {
      onOpenLibrary: vi.fn(),
      onOpenLearn: vi.fn(),
      onOpenFreePlay: vi.fn(),
      onOpenSoundboard: vi.fn(),
      onOpenTheory: vi.fn(),
      onOpenProgress: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenSetup: vi.fn(),
    };

    render(<MainMenuScreen {...handlers} />);

    expect(screen.getByRole('heading', { name: 'Piano Hero' })).toBeInTheDocument();

    const primaryDestinations = screen.getByRole('region', { name: 'Primary destinations' });
    const moreDestinations = screen.getByRole('region', { name: 'More destinations' });

    const destinations = [
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Play. Open the song library and start a scored run.',
        }),
        handler: handlers.onOpenLibrary,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Learn. Continue lessons with a cleaner practice flow.',
        }),
        handler: handlers.onOpenLearn,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Free Play. Jam, record ideas, and explore without scoring.',
        }),
        handler: handlers.onOpenFreePlay,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Soundboard. Trigger quick hits and playful one-shots.',
        }),
        handler: handlers.onOpenSoundboard,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Theory. Train scales, intervals, and fast recall.',
        }),
        handler: handlers.onOpenTheory,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Progress. Review streaks, goals, and accuracy trends.',
        }),
        handler: handlers.onOpenProgress,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Settings. Tune audio, visuals, input, and accessibility.',
        }),
        handler: handlers.onOpenSettings,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Setup. Map keys, devices, and onboarding basics.',
        }),
        handler: handlers.onOpenSetup,
      },
    ];

    expect(within(primaryDestinations).queryByRole('button', { name: /Settings\\./ })).not.toBeInTheDocument();
    expect(within(moreDestinations).queryByRole('button', { name: /Play\\./ })).not.toBeInTheDocument();

    for (const destination of destinations) {
      expect(destination.button).toBeInTheDocument();
      await user.click(destination.button);
      expect(destination.handler).toHaveBeenCalledOnce();
    }
  });
});
