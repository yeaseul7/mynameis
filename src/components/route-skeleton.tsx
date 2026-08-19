export function RouteSkeleton({ label = "페이지를 불러오고 있어요", variant = "form" }: { label?: string; variant?: "form" | "share" }) {
  if (variant === "share") {
    return (
      <div className="basic-shared-page" aria-busy="true" aria-label={label}>
        <section className="basic-share-profile share-page-skeleton">
          <div className="basic-share-hero skeleton-card share-skeleton-hero">
            <div className="basic-share-overlay">
              <div className="skeleton-line route-skeleton-logo" />
              <div className="share-skeleton-copy">
                <div className="skeleton-line share-skeleton-name" />
                <div className="share-skeleton-stats">{[0, 1, 2, 3].map((item) => <div className="skeleton-line" key={item} />)}</div>
              </div>
            </div>
          </div>
          <div className="basic-share-body share-skeleton-body">
            <div className="share-skeleton-tabs"><div className="skeleton-pill" /><div className="skeleton-pill" /></div>
            <div className="skeleton-line share-skeleton-heading" />
            {[0, 1, 2, 3].map((item) => <div className="share-skeleton-row" key={item}><div className="skeleton-line" /><div className="skeleton-line" /></div>)}
            <div className="basic-photo-grid"><div className="skeleton-card basic-photo-card" /><div className="skeleton-card basic-photo-card" /></div>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="route-skeleton" aria-busy="true" aria-label={label}>
      <section>
        <div className="skeleton-line route-skeleton-logo" />
        <div className="skeleton-line route-skeleton-title" />
        <div className="skeleton-line route-skeleton-copy" />
        <div className="route-skeleton-card">
          <div className="skeleton-card route-skeleton-photo" />
          <div>
            <div className="skeleton-line route-skeleton-row" />
            <div className="skeleton-line route-skeleton-row short" />
          </div>
        </div>
      </section>
    </div>
  );
}
