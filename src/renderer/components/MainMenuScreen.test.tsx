import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainMenuScreen } from './MainMenuScreen';

describe('MainMenuScreen', () => {
  afterEach(() => {
    cleanup();
  });

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
        name: 'Play Songs',
        description: 'Open the song library and start a scored run.',
        actionLabel: 'Choose Song',
        handler: handlers.onOpenLibrary,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Guided Lessons',
        }),
        name: 'Guided Lessons',
        description: 'Continue lessons with a cleaner practice flow.',
        actionLabel: 'Resume Lesson',
        handler: handlers.onOpenLearn,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Free Play',
        }),
        name: 'Free Play',
        description: 'Jam, record ideas, and explore without scoring.',
        actionLabel: 'Open Keys',
        handler: handlers.onOpenFreePlay,
      },
      {
        button: within(primaryDestinations).getByRole('button', {
          name: 'Soundboard',
        }),
        name: 'Soundboard',
        description: 'Trigger quick hits and playful one-shots.',
        actionLabel: 'Load Pads',
        handler: handlers.onOpenSoundboard,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Theory Trainer',
        }),
        name: 'Theory Trainer',
        description: 'Train scales, intervals, and fast recall.',
        actionLabel: 'Train Recall',
        handler: handlers.onOpenTheory,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Progress',
        }),
        name: 'Progress',
        description: 'Review streaks, goals, and accuracy trends.',
        actionLabel: 'Review Streak',
        handler: handlers.onOpenProgress,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Settings',
        }),
        name: 'Settings',
        description: 'Tune audio, visuals, input, and accessibility.',
        actionLabel: 'Tune Setup',
        handler: handlers.onOpenSettings,
      },
      {
        button: within(moreDestinations).getByRole('button', {
          name: 'Keyboard Setup',
        }),
        name: 'Keyboard Setup',
        description: 'Map keys, devices, and onboarding basics.',
        actionLabel: 'Map Keys',
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
      expect(destination.button).toHaveAccessibleName(destination.name);
      expect(within(destination.button).getByText(destination.actionLabel)).toHaveAttribute('aria-hidden', 'true');
      await user.click(destination.button);
      expect(destination.handler).toHaveBeenCalledOnce();
    }
  });

  it('reacts to focused destinations with matching stage variables', async () => {
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

    const mainMenu = screen.getByRole('main');
    const primaryDestinations = screen.getByRole('region', { name: 'Primary destinations' });
    const freePlayButton = within(primaryDestinations).getByRole('button', { name: 'Free Play' });

    await user.tab();
    await user.tab();
    await user.tab();

    expect(freePlayButton).toHaveFocus();
    expect(mainMenu).toHaveAttribute('data-active-card', 'free-play');
    expect(mainMenu).toHaveStyle({
      '--active-card-color': 'var(--menu-neon-cyan)',
      '--sequencer-column': '2',
      '--sequencer-lane': '2',
      '--sequencer-position': '25%',
    });

    await user.tab();

    expect(mainMenu).toHaveAttribute('data-active-card', 'soundboard');
    expect(mainMenu).toHaveStyle({
      '--active-card-color': 'var(--menu-neon-blue)',
      '--sequencer-column': '3',
      '--sequencer-lane': '3',
      '--sequencer-position': '31.25%',
    });
  });
});
