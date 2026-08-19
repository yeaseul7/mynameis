export function RouteSkeleton({ label = "페이지를 불러오고 있어요", variant = "form" }: { label?: string; variant?: "form" | "share" | "pet-form" | "pet-edit" }) {
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
  if (variant === "pet-form" || variant === "pet-edit") {
    const isEdit = variant === "pet-edit";
    return (
      <div className={`pet-registration-page pet-form-skeleton${isEdit ? " pet-edit-skeleton" : ""}`} aria-busy="true" aria-label={label}>
        <section className={`pet-registration-form${isEdit ? " pet-edit-form" : ""}`}>
          <div className="pet-skeleton-progress"><div className="skeleton-pill" /><div>{[0, 1, 2].map((item) => <i className="skeleton-pill" key={item} />)}</div></div>
          <div className="skeleton-line pet-skeleton-title" />
          <div className="skeleton-line pet-skeleton-photo-copy" />
          <div className="pet-skeleton-photos">{Array.from({ length: isEdit ? 4 : 3 }, (_, item) => <div className="skeleton-card" key={item} />)}</div>
          {[0, 1].map((item) => <div className="pet-skeleton-field" key={item}><div className="skeleton-line" /><div className="skeleton-card" /></div>)}
          <div className="pet-skeleton-birth"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
          {isEdit ? <div className="pet-skeleton-field"><div className="skeleton-line" /><div className="skeleton-card" /></div> : null}
          <div className="pet-skeleton-option-grid"><div className="skeleton-card" /><div className="skeleton-card" /></div>
          {isEdit ? <div className="pet-skeleton-option-grid three"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div> : null}
          <div className="skeleton-pill pet-skeleton-button" />
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
