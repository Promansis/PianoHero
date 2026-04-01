import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackAssignmentPanel } from './TrackAssignmentPanel';

describe('TrackAssignmentPanel', () => {
  it('emits assignment changes', () => {
    const onAssignmentChange = vi.fn();

    render(
      <TrackAssignmentPanel
        tracks={[
          {
            id: 'track-0',
            name: 'Piano',
            sourceTrackIndex: 0,
            defaultAssignment: 'both',
            assignment: 'both',
          },
        ]}
        onAssignmentChange={onAssignmentChange}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Both Hands'), {
      target: { value: 'left' },
    });

    expect(onAssignmentChange).toHaveBeenCalledWith('track-0', 'left');
  });
});
