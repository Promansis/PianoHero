import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImmersiveInstrumentControl } from './ImmersiveInstrumentControl';

describe('ImmersiveInstrumentControl', () => {
  afterEach(() => {
    cleanup();
  });

  it('pins the instrument popout on click after hover and closes it on a second click', () => {
    render(<ImmersiveInstrumentControl instrumentId="acoustic-piano" onInstrumentChange={vi.fn()} />);

    const toggleButton = screen.getByRole('button', { name: 'Show instrument controls' });
    const popout = screen.getByTestId('immersive-instrument-popout');

    fireEvent.mouseEnter(toggleButton);
    expect(popout).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(toggleButton);
    fireEvent.mouseLeave(toggleButton);
    expect(popout).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(toggleButton);
    expect(popout).toHaveAttribute('aria-hidden', 'true');
  });

  it('calls through with the selected instrument and closes the popout', () => {
    const onInstrumentChange = vi.fn();

    render(<ImmersiveInstrumentControl instrumentId="acoustic-piano" onInstrumentChange={onInstrumentChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show instrument controls' }));
    fireEvent.click(screen.getByRole('button', { name: /Organ/ }));

    expect(onInstrumentChange).toHaveBeenCalledWith('organ');
    expect(screen.getByTestId('immersive-instrument-popout')).toHaveAttribute('aria-hidden', 'true');
  });
});
