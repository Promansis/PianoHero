export interface LibraryAdvancedFilters {
  durationMin: string;
  durationMax: string;
  scoreMin: string;
  scoreMax: string;
  playedState: 'all' | 'played' | 'unplayed';
  dateAddedFrom: string;
  dateAddedTo: string;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  filters: LibraryAdvancedFilters;
  onToggle: () => void;
  onChange: (filters: LibraryAdvancedFilters) => void;
  onClear: () => void;
}

export function AdvancedFilters({ isOpen, filters, onToggle, onChange, onClear }: AdvancedFiltersProps) {
  const contentId = 'library-advanced-filters-content';

  return (
    <section className="panel advanced-filters">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Filters</p>
          <h2>Advanced Filters</h2>
        </div>
        <div className="transport-buttons">
          <button className="secondary-button" onClick={onClear}>
            Clear
          </button>
          <button
            className="secondary-button"
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={onToggle}
          >
            {isOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="advanced-filters-grid" id={contentId}>
          <label>
            <span>Duration Min (sec)</span>
            <input
              type="number"
              min={0}
              value={filters.durationMin}
              onChange={(event) => onChange({ ...filters, durationMin: event.target.value })}
            />
          </label>
          <label>
            <span>Duration Max (sec)</span>
            <input
              type="number"
              min={0}
              value={filters.durationMax}
              onChange={(event) => onChange({ ...filters, durationMax: event.target.value })}
            />
          </label>
          <label>
            <span>Best Score Min</span>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.scoreMin}
              onChange={(event) => onChange({ ...filters, scoreMin: event.target.value })}
            />
          </label>
          <label>
            <span>Best Score Max</span>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.scoreMax}
              onChange={(event) => onChange({ ...filters, scoreMax: event.target.value })}
            />
          </label>
          <label>
            <span>Played State</span>
            <select
              value={filters.playedState}
              onChange={(event) =>
                onChange({ ...filters, playedState: event.target.value as LibraryAdvancedFilters['playedState'] })
              }
            >
              <option value="all">All</option>
              <option value="played">Played</option>
              <option value="unplayed">Unplayed</option>
            </select>
          </label>
          <label>
            <span>Date Added From</span>
            <input
              type="date"
              value={filters.dateAddedFrom}
              onChange={(event) => onChange({ ...filters, dateAddedFrom: event.target.value })}
            />
          </label>
          <label>
            <span>Date Added To</span>
            <input
              type="date"
              value={filters.dateAddedTo}
              onChange={(event) => onChange({ ...filters, dateAddedTo: event.target.value })}
            />
          </label>
        </div>
      )}
    </section>
  );
}
