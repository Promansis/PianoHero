import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainMenuScreen } from './MainMenuScreen';

describe('MainMenuScreen', () => {
  it('splits the primary and secondary destinations into separate sections', () => {
    const onOpenLibrary = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <MainMenuScreen
        onOpenLibrary={onOpenLibrary}
        onOpenLearn={vi.fn()}
        onOpenFreePlay={vi.fn()}
        onOpenSoundboard={vi.fn()}
        onOpenTheory={vi.fn()}
        onOpenProgress={vi.fn()}
        onOpenSettings={onOpenSettings}
        onOpenSetup={vi.fn()}
      />,
    );

    const primaryDestinations = screen.getByRole('region', { name: 'Primary destinations' });
    const moreDestinations = screen.getByRole('region', { name: 'More destinations' });

    expect(
      within(primaryDestinations).getByRole('button', {
        name: /Play Start a scored run\./,
      }),
    ).toBeInTheDocument();
    expect(
      within(primaryDestinations).getByRole('button', {
        name: /Learn Continue lessons\./,
      }),
    ).toBeInTheDocument();
    expect(
      within(primaryDestinations).getByRole('button', {
        name: /Free Play Jam, record, explore\./,
      }),
    ).toBeInTheDocument();
    expect(within(primaryDestinations).queryByRole('button', { name: /Settings/ })).not.toBeInTheDocument();

    expect(within(moreDestinations).getByRole('button', { name: /Theory/ })).toBeInTheDocument();
    expect(within(moreDestinations).getByRole('button', { name: /Progress/ })).toBeInTheDocument();
    expect(within(moreDestinations).getByRole('button', { name: /Soundboard/ })).toBeInTheDocument();
    expect(within(moreDestinations).getByRole('button', { name: /Settings/ })).toBeInTheDocument();
    expect(within(moreDestinations).getByRole('button', { name: /Setup/ })).toBeInTheDocument();
    expect(
      within(moreDestinations).queryByRole('button', {
        name: /Play Start a scored run\./,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(primaryDestinations).getByRole('button', {
        name: /Play Start a scored run\./,
      }),
    );
    fireEvent.click(
      within(moreDestinations).getByRole('button', {
        name: /Settings Tune controls and audio\./,
      }),
    );

    expect(onOpenLibrary).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
