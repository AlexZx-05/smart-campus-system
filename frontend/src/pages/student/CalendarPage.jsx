import { useEffect, useState } from "react";
import EventService from "../../services/EventService";

function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    EventService.getEvents()
      .then(setEvents)
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to load calendar events.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-lg font-semibold text-slate-800">Calendar</h3>
      <p className="text-sm text-slate-500 mt-2">
        Academic events created by faculty/admin are visible here. Students cannot edit them.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 mt-4">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-500 mt-4">No events published yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">{event.title}</p>
              <p className="text-xs text-slate-500 mt-1">
                {event.date} | Created by {event.creator_name} ({event.creator_role})
              </p>
              {event.description && <p className="text-sm text-slate-600 mt-2">{event.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
