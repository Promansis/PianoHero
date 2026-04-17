interface LoadingPanelProps {
  eyebrow?: string;
  title: string;
  message?: string;
  className?: string;
}

export function LoadingPanel({ eyebrow, title, message, className = '' }: LoadingPanelProps) {
  return (
    <main className={`app-shell ${className}`}>
      <section className="panel library-header">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {message && <p className="song-title">{message}</p>}
        </div>
      </section>
      <section className="panel empty-state-panel">
        <div className="loading-spinner" />
      </section>
    </main>
  );
}
