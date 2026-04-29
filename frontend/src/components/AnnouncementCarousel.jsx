import { useEffect, useMemo, useState } from "react";

function AnnouncementCarousel({
  messages = [],
  loading = false,
  error = "",
  title = "Announcement",
  subtitle = "Latest updates from admin",
  emptyMessage = "No announcements available right now.",
  autoRotateMs = 6000,
}) {
  const announcementItems = useMemo(() => messages.slice(0, 8), [messages]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTickerPaused, setIsTickerPaused] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [announcementItems.length]);

  useEffect(() => {
    if (announcementItems.length <= 1) return undefined;
    if (isTickerPaused) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % announcementItems.length);
    }, autoRotateMs);
    return () => clearInterval(timer);
  }, [announcementItems.length, autoRotateMs, isTickerPaused]);

  const goPrev = () => {
    if (announcementItems.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + announcementItems.length) % announcementItems.length);
  };

  const goNext = () => {
    if (announcementItems.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % announcementItems.length);
  };

  const current = announcementItems[activeIndex];
  const tickerText = current
    ? `${current.subject} | By ${current.sender_name} | ${new Date(current.created_at).toLocaleString()} | ${current.body}`
    : "";

  return (
    <div className="announcement-shell rounded-2xl border px-4 pt-2.5 pb-1.5">
      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-2">
        <div className="announcement-label lg:w-32 lg:flex-shrink-0">
          <h3 className="m-0 text-sm md:text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          {subtitle ? <p className="m-0 mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>

        {!loading && !error && current ? (
          <div
            className="announcement-ticker flex-1"
            onMouseEnter={() => setIsTickerPaused(true)}
            onMouseLeave={() => setIsTickerPaused(false)}
          >
            <div className={`announcement-ticker__track ${isTickerPaused ? "is-paused" : ""}`}>
              <p className="announcement-ticker__content m-0 text-sm text-slate-700">{tickerText}</p>
              <p className="announcement-ticker__content m-0 text-sm text-slate-700" aria-hidden="true">
                {tickerText}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading announcements...</p>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : !current ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-3">
          {announcementItems.length > 1 && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded-md border border-slate-300 bg-white/80 px-2.5 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-md border border-slate-300 bg-white/80 px-2.5 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  Next
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {activeIndex + 1} / {announcementItems.length}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnnouncementCarousel;
