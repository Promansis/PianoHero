import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImmersiveHud, type ImmersiveHudNavigationItem } from './ImmersiveHud';

const buildNavigation = (onLibrary = vi.fn()): ImmersiveHudNavigationItem[] => [
  {
    key: 'main-menu',
    label: 'Main',
    title: 'Go to main menu',
    onSelect: vi.fn(),
  },
  {
    key: 'library',
    label: 'Play',
    title: 'Open library',
    onSelect: onLibrary,
  },
  {
    key: 'free-play',
    label: 'Free Play',
    title: 'Open free play',
    onSelect: vi.fn(),
  },
];

describe('ImmersiveHud', () => {
  afterEach(() => {
    cleanup();
  });

  it('reveals the drawer from the edge tab and marks the current destination', () => {
    render(
      <ImmersiveHud
        currentDestination="free-play"
        navigationItems={buildNavigation()}
        stats={<div className="immersive-hud-stats">Session stats</div>}
        actions={<div className="immersive-hud-actions">Session actions</div>}
      />,
    );

    const shell = screen.getByTestId('immersive-hud-shell');
    const tab = screen.getByRole('button', { name: 'Show play HUD' });

    expect(shell).not.toHaveClass('open');
    expect(tab).toHaveAttribute('aria-expanded', 'false');

    fireEvent.pointerEnter(shell);

    expect(shell).toHaveClass('open');
    expect(tab).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Free Play' })).toHaveAttribute('aria-current', 'page');
  });

  it('routes non-current navigation buttons and ignores the active destination', () => {
    const onLibrary = vi.fn();

    render(
      <ImmersiveHud
        currentDestination="free-play"
        navigationItems={buildNavigation(onLibrary)}
        stats={<div className="immersive-hud-stats">Session stats</div>}
        actions={<div className="immersive-hud-actions">Session actions</div>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Free Play' }));
    expect(onLibrary).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onLibrary).toHaveBeenCalledTimes(1);
  });
});
