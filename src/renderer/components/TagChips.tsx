import { useMemo, useState } from 'react';

interface TagChipsProps {
  tags: string[];
  suggestions?: string[];
  placeholder?: string;
  editable?: boolean;
  removable?: boolean;
  onChange?: (tags: string[]) => void;
  onTagClick?: (tag: string) => void;
}

function normalizeTag(tag: string): string {
  return tag.trim();
}

export function TagChips({
  tags,
  suggestions = [],
  placeholder = 'Add tag',
  editable = false,
  removable = false,
  onChange,
  onTagClick,
}: TagChipsProps) {
  const [draft, setDraft] = useState('');

  const filteredSuggestions = useMemo(() => {
    const normalizedDraft = normalizeTag(draft).toLowerCase();
    return suggestions
      .filter((suggestion) => !tags.includes(suggestion))
      .filter((suggestion) => !normalizedDraft || suggestion.toLowerCase().includes(normalizedDraft))
      .slice(0, 6);
  }, [draft, suggestions, tags]);

  const commitTag = (value: string) => {
    const nextTag = normalizeTag(value);
    if (!nextTag || tags.includes(nextTag) || !onChange) {
      setDraft('');
      return;
    }

    onChange([...tags, nextTag]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    if (!onChange) {
      return;
    }
    onChange(tags.filter((entry) => entry !== tag));
  };

  return (
    <div className="tag-chips-shell">
      <div className="tag-chip-row">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`tag-chip ${onTagClick ? 'clickable' : ''}`}
          >
            {onTagClick ? (
              <button type="button" className="tag-chip-label" onClick={() => onTagClick(tag)}>
                {tag}
              </button>
            ) : (
              <span>{tag}</span>
            )}
            {removable && (
              <button
                type="button"
                className="tag-chip-remove"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {editable && (
        <div className="tag-chip-editor">
          <input
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                commitTag(draft);
              }
              if (event.key === 'Backspace' && !draft && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
              }
            }}
          />
          {filteredSuggestions.length > 0 && (
            <div className="tag-chip-suggestions">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="secondary-button"
                  onClick={() => commitTag(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
