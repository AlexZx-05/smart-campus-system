import { useEffect, useMemo, useState } from "react";
import EventService from "../../services/EventService";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOLIDAY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const getIsoDate = (dateObj) =>
  `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(
    2,
    "0"
  )}`;

const formatDateLabel = (isoDate) => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
};

function CalendarPage({ viewerRole = "student" }) {
  const today = useMemo(() => new Date(), []);
  const todayIso = getIsoDate(today);

  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const [monthEvents, setMonthEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [governmentHolidays, setGovernmentHolidays] = useState([]);

  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: todayIso,
    description: "",
  });

  const calendarMonth = calendarDate.getMonth() + 1;
  const calendarYear = calendarDate.getFullYear();

  const loadMonthEvents = async () => {
    setLoadingCalendar(true);
    try {
      const data = await EventService.getEvents({ month: calendarMonth, year: calendarYear });
      setMonthEvents(data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load calendar events.");
    } finally {
      setLoadingCalendar(false);
    }
  };

  const loadSidebarEvents = async () => {
    setLoadingSidebar(true);
    try {
      const data = await EventService.getEvents();
      setAllEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load upcoming holidays.");
    } finally {
      setLoadingSidebar(false);
    }
  };

  const loadHolidays = async ({ force = false } = {}) => {
    setLoadingHolidays(true);
    const baseYear = today.getFullYear();
    const cacheKey = `india_holidays_${baseYear}_${baseYear + 1}`;
    let hasUsableCache = false;

    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const cachedEvents = Array.isArray(cached?.events) ? cached.events : [];
        const isFresh = Number(cached?.saved_at) > 0 && Date.now() - Number(cached.saved_at) < HOLIDAY_CACHE_TTL_MS;
        if (cachedEvents.length > 0) {
          setGovernmentHolidays(cachedEvents);
          hasUsableCache = true;
          if (isFresh && !force) return;
        }
      }
    } catch (_) {
      // Ignore cache parse failures and continue with network fetch.
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Holiday service timeout")), 4000)
      );
      const data = await Promise.race([
        EventService.getIndiaHolidays({ start_year: baseYear, end_year: baseYear + 1 }),
        timeoutPromise,
      ]);
      const normalized = Array.isArray(data) ? data : [];
      setGovernmentHolidays(normalized);
      localStorage.setItem(cacheKey, JSON.stringify({ saved_at: Date.now(), events: normalized }));
    } catch (err) {
      if (!hasUsableCache) {
        setError(err.response?.data?.message || "Holiday service is slow right now. Showing calendar events only.");
      }
    } finally {
      setLoadingHolidays(false);
    }
  };

  const refreshCalendarData = async () => {
    await Promise.all([loadMonthEvents(), loadSidebarEvents()]);
  };

  useEffect(() => {
    loadMonthEvents();
  }, [calendarMonth, calendarYear]);

  useEffect(() => {
    loadSidebarEvents();
    loadHolidays();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const monthEventsByDate = useMemo(() => {
    const map = {};
    monthEvents.forEach((event) => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }, [monthEvents]);

  const holidayEventsByDate = useMemo(() => {
    const map = {};
    governmentHolidays.forEach((event) => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }, [governmentHolidays]);

  const mergedEvents = useMemo(() => {
    const byKey = new Map();
    const addEvent = (event) => {
      const key = `${event.date}|${(event.title || "").trim().toLowerCase()}|${event.audience || "unknown"}`;
      if (!byKey.has(key)) {
        byKey.set(key, event);
      }
    };

    allEvents.forEach(addEvent);
    monthEvents.forEach(addEvent);
    governmentHolidays.forEach(addEvent);

    return Array.from(byKey.values());
  }, [allEvents, monthEvents, governmentHolidays]);

  const selectedDayEvents = useMemo(
    () => mergedEvents.filter((event) => event.date === selectedDate),
    [mergedEvents, selectedDate]
  );

  const upcomingHolidays = useMemo(() => {
    const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
    return mergedEvents
      .map((event) => ({
        ...event,
        eventMs: new Date(`${event.date}T00:00:00`).getTime(),
      }))
      .filter(
        (event) =>
          Number.isFinite(event.eventMs) &&
          event.eventMs >= todayMs &&
          (event.audience === "campus" || event.audience === "government")
      )
      .sort((a, b) => a.eventMs - b.eventMs);
  }, [mergedEvents, todayIso]);

  const gridCells = useMemo(() => {
    const firstOfMonth = new Date(calendarYear, calendarMonth - 1, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - startOffset);

    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const cellDate = new Date(gridStartDate);
      cellDate.setDate(gridStartDate.getDate() + index);
      const isoDate = getIsoDate(cellDate);
      cells.push({
        key: isoDate,
        isoDate,
        day: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() + 1 === calendarMonth,
        isToday: isoDate === todayIso,
        events: [
          ...(monthEventsByDate[isoDate] || []),
          ...((holidayEventsByDate[isoDate] || []).filter(
            (holiday) =>
              !(monthEventsByDate[isoDate] || []).some(
                (event) =>
                  (event.title || "").trim().toLowerCase() === (holiday.title || "").trim().toLowerCase() &&
                  event.date === holiday.date
              )
          )),
        ],
      });
    }
    return cells;
  }, [calendarMonth, calendarYear, monthEventsByDate, holidayEventsByDate, todayIso]);

  const monthLabel = new Date(calendarYear, calendarMonth - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const moveMonth = (delta) => {
    setCalendarDate(new Date(calendarYear, calendarMonth - 1 + delta, 1));
  };

  const openCreateModal = () => {
    setEditingEventId(null);
    setEventForm({
      title: "",
      date: selectedDate,
      description: "",
    });
    setShowEventModal(true);
    setError("");
  };

  const openEditModal = (event) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title || "",
      date: event.date || selectedDate,
      description: event.description || "",
    });
    setShowEventModal(true);
    setError("");
  };

  const closeModal = () => {
    if (saving) return;
    setShowEventModal(false);
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editingEventId) {
        const res = await EventService.updateEvent(editingEventId, eventForm);
        setMessage(res.message || "Event updated successfully.");
      } else {
        const res = await EventService.createEvent(eventForm);
        setMessage(res.message || "Event created successfully.");
      }
      setShowEventModal(false);
      setEditingEventId(null);
      await Promise.all([loadMonthEvents(), loadSidebarEvents()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setError("");
    try {
      const res = await EventService.deleteEvent(eventId);
      setMessage(res.message || "Event deleted successfully.");
      if (editingEventId === eventId) {
        setEditingEventId(null);
        setShowEventModal(false);
      }
      await Promise.all([loadMonthEvents(), loadSidebarEvents()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete event.");
    }
  };

  const normalizedViewerRole = (viewerRole || "").toLowerCase();

  return (
    <div className="space-y-4">
      {(message || error) && (
        <div className="space-y-2">
          {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{monthLabel}</h3>
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                &#8249;
              </button>
              <span className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white">{calendarYear}</span>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
              >
                &#8250;
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Add Event
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const nowIso = getIsoDate(now);
                  setCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(nowIso);
                }}
                className="rounded-full border border-dashed border-slate-300 p-2 text-slate-600 hover:border-sky-500 hover:text-sky-600"
                aria-label="Go to today"
                title="Go to today"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v3m0 12v3m9-9h-3M6 12H3" />
                  <circle cx="12" cy="12" r="6.5" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-full bg-sky-600 text-center text-xs font-medium text-white">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="py-2.5">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            {loadingCalendar ? (
              <p className="py-8 text-sm text-slate-500">Loading calendar...</p>
            ) : (
              <div className="min-w-[650px] border border-slate-200">
                <div className="grid grid-cols-7">
                  {gridCells.map((cell) => {
                    const isSelected = cell.isoDate === selectedDate;
                    const celebrationEvent = cell.events.find((event) => event.audience === "government");
                    const previewEvent = celebrationEvent || cell.events[0];
                    return (
                      <button
                        type="button"
                        key={cell.key}
                        onClick={() => setSelectedDate(cell.isoDate)}
                        className={`min-h-[92px] border-r border-b border-slate-200 p-2.5 text-left transition ${
                          cell.inCurrentMonth ? "bg-white" : "bg-slate-50"
                        } ${isSelected ? "bg-sky-100/70" : "hover:bg-sky-50/70"}`}
                      >
                        <p className={`text-sm ${cell.inCurrentMonth ? "text-slate-900" : "text-slate-400"}`}>{cell.day}</p>
                        {cell.isToday && <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />}
                        {previewEvent && (
                          <div
                            className={`mt-1 rounded-r border-l-[3px] px-1.5 py-1 ${
                              celebrationEvent
                                ? "border-blue-500 bg-blue-50"
                                : "border-sky-500 bg-sky-50"
                            }`}
                          >
                            {celebrationEvent && <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-700">Celebration</p>}
                            <p className={`truncate text-[10px] font-semibold ${celebrationEvent ? "text-blue-800" : "text-sky-800"}`}>
                              {previewEvent.title}
                            </p>
                            {cell.events.length > 1 && <p className="text-[10px] text-sky-700">+{cell.events.length - 1} more</p>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 xl:col-span-4 xl:h-[760px]">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex basis-[65%] min-h-0 flex-col">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-900">Upcoming Holidays</h4>
                <button
                  type="button"
                  onClick={refreshCalendarData}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                {loadingSidebar ? (
                  <p className="text-sm text-slate-500">Loading upcoming holidays...</p>
                ) : upcomingHolidays.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {loadingHolidays ? "Loading government holidays..." : "No upcoming holidays available."}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingHolidays.map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => {
                          setSelectedDate(event.date);
                          const target = new Date(`${event.date}T00:00:00`);
                          if (!Number.isNaN(target.getTime())) {
                            setCalendarDate(new Date(target.getFullYear(), target.getMonth(), 1));
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:border-sky-300 hover:bg-sky-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                              event.audience === "government"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {event.audience === "government" ? "Govt" : "Campus"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDateLabel(event.date)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex basis-[35%] min-h-0 flex-col border-t border-slate-200 pt-4">
              <h4 className="text-base font-semibold text-slate-900">Events on {formatDateLabel(selectedDate)}</h4>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                {loadingSidebar ? (
                  <p className="text-sm text-slate-500">Loading...</p>
                ) : selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">No events on this day.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                              event.audience === "private"
                                ? "border-violet-200 bg-violet-50 text-violet-700"
                                : event.audience === "government"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {event.audience}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          By {event.creator_name} ({event.creator_role})
                        </p>
                        {event.description && <p className="mt-2 text-sm text-slate-700">{event.description}</p>}
                        {(event.creator_role || "").toLowerCase() === normalizedViewerRole && event.audience === "private" && (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(event)}
                              className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700 hover:bg-amber-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(event.id)}
                              className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700 hover:bg-rose-200"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{editingEventId ? "Edit Private Event" : "Create Private Event"}</h4>
                <p className="mt-1 text-sm text-slate-500">Private events are visible only to you.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleEventSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Event Title</label>
                <input
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={eventForm.date}
                  onChange={handleEventChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  value={eventForm.description}
                  onChange={handleEventChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 ${
                    saving ? "cursor-not-allowed opacity-70" : ""
                  }`}
                >
                  {saving ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
