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

    expect(screen.getByRole('heading', { name: 'LumaKeys' })).toBeInTheDocument();

    const primaryDestinations = screen.getByRole('region', { name: 'Primary destinations' });
    const moreDestinations = screen.getByRole('region', { name: 'More destinations' });

    const destinations = [
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Play Songs',
        }),
        description: 'Open the song library and start a scored run.',
        handler: handlers.onOpenLibrary,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Guided Lessons',
        }),
        description: 'Continue lessons with a cleaner practice flow.',
        handler: handlers.onOpenLearn,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Free Play',
        }),
        description: 'Jam, record ideas, and explore without scoring.',
        handler: handlers.onOpenFreePlay,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Soundboard',
        }),
        description: 'Trigger quick hits and playful one-shots.',
        handler: handlers.onOpenSoundboard,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Theory Trainer',
        }),
        description: 'Train scales, intervals, and fast recall.',
        handler: handlers.onOpenTheory,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Progress',
        }),
        description: 'Review streaks, goals, and accuracy trends.',
        handler: handlers.onOpenProgress,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Settings',
        }),
        description: 'Tune audio, visuals, input, and accessibility.',
        handler: handlers.onOpenSettings,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Keyboard Setup',
        }),
        description: 'Map keys, devices, and onboarding basics.',
        handler: handlers.onOpenSetup,
      },
    ];

    expect(within(primaryDestinations).getByRole('button', { name: 'Soundboard' })).toBeInTheDocument();
    expect(within(moreDestinations).queryByRole('button', { name: 'Soundboard' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Training and Setup' })).toBeInTheDocument();
    expect(within(primaryDestinations).getByRole('button', { name: 'Play Songs' })).toHaveStyle({
      '--entrance-delay': '220ms',
    });
    expect(within(primaryDestinations).getByRole('button', { name: 'Soundboard' })).toHaveStyle({
      '--entrance-delay': '430ms',
    });
    expect(within(moreDestinations).getByRole('button', { name: 'Theory Trainer' })).toHaveStyle({
      '--entrance-delay': '500ms',
    });
    expect(screen.getByRole('heading', { name: 'Training and Setup' }).closest('section')).toHaveStyle({
      '--entrance-delay': '450ms',
    });

    for (const destination of destinations) {
      expect(destination.button).toBeInTheDocument();
      expect(destination.button).toHaveAccessibleDescription(destination.description);
      await user.click(destination.button);
      expect(destination.handler).toHaveBeenCalledOnce();
    }
  });
});
