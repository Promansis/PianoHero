import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TagChips } from './TagChips';

describe('TagChips', () => {
  it('adds tags from keyboard input and removes them', () => {
    const onChange = vi.fn();

    render(
      <TagChips
        tags={['classical']}
        editable
        removable
        suggestions={['exercise', 'warmup']}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Add tag'), {
      target: { value: 'warmup' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Add tag'), {
      key: 'Enter',
    });

    expect(onChange).toHaveBeenCalledWith(['classical', 'warmup']);

    fireEvent.click(screen.getByLabelText('Remove classical'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('emits tag clicks for filtering', () => {
    const onTagClick = vi.fn();

    render(<TagChips tags={['beginner']} onTagClick={onTagClick} />);

    fireEvent.click(screen.getByText('beginner'));

    expect(onTagClick).toHaveBeenCalledWith('beginner');
  });
});
