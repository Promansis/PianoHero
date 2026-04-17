interface LoadingPanelProps {
  eyebrow?: string;
  title: string;
  message?: string;
  className?: string;
  inline?: boolean;
}

export function LoadingPanel({ eyebrow, title, message, className = '', inline = false }: LoadingPanelProps) {
  if (inline) {
    return (
      <section className={`panel empty-state-panel loading-panel-inline ${className}`}>
        <div className="loading-panel-inline-heading">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          {message && <p className="panel-copy">{message}</p>}
        </div>
        <div className="loading-spinner" />
      </section>
    );
  }

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
