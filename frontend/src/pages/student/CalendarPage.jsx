import { useEffect, useState } from "react";
import EventService from "../../services/EventService";

function CalendarPage() {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: todayIso,
    description: "",
  });

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await EventService.getEvents();
      setEvents(data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load calendar events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [message]);

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setMessage("");
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
      setEditingEventId(null);
      setEventForm({ title: "", date: selectedDate, description: "" });
      await loadEvents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title || "",
      date: event.date || selectedDate,
      description: event.description || "",
    });
    setMessage("");
    setError("");
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const res = await EventService.deleteEvent(eventId);
      setMessage(res.message || "Event deleted successfully.");
      if (editingEventId === eventId) {
        setEditingEventId(null);
        setEventForm({ title: "", date: selectedDate, description: "" });
      }
      await loadEvents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete event.");
    }
  };

  const eventsForDate = (isoDate) => events.filter((event) => event.date === isoDate);
  const selectedDayEvents = eventsForDate(selectedDate);

  const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const monthLabel = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const startDay = monthStart.getDay();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells = [];
  for (let i = 0; i < startDay; i += 1) cells.push({ key: `e-${i}`, isoDate: null, day: null, events: [] });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const isoDate = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    cells.push({ key: `d-${d}`, isoDate, day: d, events: eventsForDate(isoDate) });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800">Student Calendar</h3>
        <p className="text-sm text-slate-500 mt-1">
          Campus events are visible to everyone. Events you create are private and visible only to you.
        </p>

        {message && (
          <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleEventSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Event Title</label>
            <input
              name="title"
              value={eventForm.title}
              onChange={handleEventChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={eventForm.date}
              onChange={handleEventChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              name="description"
              rows={3}
              value={eventForm.description}
              onChange={handleEventChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 ${
                saving ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {saving ? "Saving..." : editingEventId ? "Update Private Event" : "Add Private Event"}
            </button>
            {editingEventId && (
              <button
                type="button"
                onClick={() => {
                  setEditingEventId(null);
                  setEventForm({ title: "", date: selectedDate, description: "" });
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold text-slate-800">{monthLabel}</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                className="px-2.5 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                className="px-2.5 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading events...</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((w) => (
                  <div key={w} className="text-xs font-semibold text-slate-500 text-center py-2">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {cells.map((cell) => (
                  <button
                    type="button"
                    key={cell.key}
                    disabled={!cell.isoDate}
                    onClick={() => {
                      if (cell.isoDate) {
                        setSelectedDate(cell.isoDate);
                        if (!editingEventId) setEventForm((prev) => ({ ...prev, date: cell.isoDate }));
                      }
                    }}
                    className={`min-h-20 rounded-lg border p-2 text-left ${
                      !cell.isoDate
                        ? "border-transparent bg-transparent cursor-default"
                        : cell.isoDate === selectedDate
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {cell.day && (
                      <>
                        <p className="text-xs font-semibold text-slate-700">{cell.day}</p>
                        <div className="mt-1 space-y-1">
                          {cell.events.slice(0, 2).map((event) => (
                            <p
                              key={event.id}
                              className={`truncate rounded px-1.5 py-0.5 text-[10px] ${
                                event.audience === "private"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {event.title}
                            </p>
                          ))}
                          {cell.events.length > 2 && (
                            <p className="text-[10px] text-slate-500">+{cell.events.length - 2} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-800">Events on {selectedDate}</h4>
            <button
              type="button"
              onClick={loadEvents}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 mt-3">Loading...</p>
          ) : selectedDayEvents.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">No events on this date.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {selectedDayEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full border ${
                        event.audience === "private"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {event.audience}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    By {event.creator_name} ({event.creator_role})
                  </p>
                  {event.description && <p className="text-sm text-slate-700 mt-2">{event.description}</p>}

                  {event.creator_role === "student" && event.audience === "private" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditEvent(event)}
                        className="px-2 py-1 text-xs rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
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
  );
}

export default CalendarPage;
