import { useEffect, useMemo, useState } from "react";

function AnnouncementCarousel({
  messages = [],
  loading = false,
  error = "",
  title = "Announcements",
  subtitle = "Latest updates from admin",
  emptyMessage = "No announcements available right now.",
  onRefresh,
  autoRotateMs = 6000,
}) {
  const announcementItems = useMemo(() => messages.slice(0, 8), [messages]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [announcementItems.length]);

  useEffect(() => {
    if (announcementItems.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % announcementItems.length);
    }, autoRotateMs);
    return () => clearInterval(timer);
  }, [announcementItems.length, autoRotateMs]);

  const goPrev = () => {
    if (announcementItems.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + announcementItems.length) % announcementItems.length);
  };

  const goNext = () => {
    if (announcementItems.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % announcementItems.length);
  };

  const current = announcementItems[activeIndex];

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading announcements...</p>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : !current ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm md:text-base font-semibold text-slate-900">{current.subject}</p>
            <span className="text-xs rounded-full px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200">
              {current.recipient_role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            By {current.sender_name} | {new Date(current.created_at).toLocaleString()}
          </p>
          <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{current.body}</p>

          {announcementItems.length > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
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
