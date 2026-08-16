export default function Loading() {
  return (
    <main className="route-skeleton" aria-busy="true" aria-label="화면을 불러오고 있어요">
      <section>
        <div className="skeleton-line route-skeleton-logo" />
        <div className="skeleton-line route-skeleton-title" />
        <div className="skeleton-line route-skeleton-copy" />
        <div className="route-skeleton-card">
          <div className="skeleton-line route-skeleton-photo" />
          <div>
            <div className="skeleton-line route-skeleton-row" />
            <div className="skeleton-line route-skeleton-row short" />
          </div>
        </div>
      </section>
    </main>
  );
}
