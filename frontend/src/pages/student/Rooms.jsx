import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

function Rooms() {
  const [semester, setSemester] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadLiveStatus = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const payload = await PreferenceService.getStudentRoomLiveStatus(semester || undefined);
      setData(payload || null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load room live status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLiveStatus();
  }, [semester]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadLiveStatus({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, [semester]);

  const rooms = data?.rooms || [];
  const runningRooms = useMemo(
    () =>
      rooms
        .filter((room) => room.status === "running" && room.running_class)
        .sort((a, b) => a.room.localeCompare(b.room)),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = rooms
      .slice()
      .sort((a, b) => {
        const rank = (room) => (room.status === "running" ? 0 : room.next_class ? 1 : 2);
        return rank(a) - rank(b) || a.room.localeCompare(b.room);
      });
    if (!q) return sorted;

    return sorted.filter((room) => {
      const running = room.running_class || {};
      const upcoming = room.next_class || {};
      const blob = [
        room.room,
        running.subject,
        running.faculty_name,
        running.department,
        running.year,
        running.section,
        upcoming.subject,
        upcoming.faculty_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rooms, search]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Room Availability</h3>
            <p className="text-sm text-slate-500 mt-1">
              Live classroom status from published timetable. Students can see which class is running now in each room.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Semester (optional)"
              className="rounded-lg border border-slate-300 text-sm px-3 py-2"
            />
            <button
              onClick={() => loadLiveStatus({ silent: true })}
              className="rounded-lg bg-blue-600 text-white text-sm px-3 py-2 hover:bg-blue-700 disabled:opacity-70"
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-700">Running Classes</p>
            <p className="mt-1 text-xl font-semibold text-blue-900">{data?.running_classes_count ?? 0}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Total Rooms</p>
            <p className="mt-1 text-xl font-semibold text-emerald-900">{rooms.length}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Next Slot Time</p>
            <p className="mt-1 text-xl font-semibold text-amber-900">{data?.next_slot_time || "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Today</p>
            <p className="mt-1 text-base font-semibold text-slate-800">
              {data?.day || "-"} {data?.current_time ? `• ${data.current_time}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-base font-semibold text-slate-800">Classes Running Right Now</h4>
          <span className="text-xs text-slate-500">{runningRooms.length} live rooms</span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading live rooms...</p>
        ) : runningRooms.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No class is running right now.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {runningRooms.map((roomItem) => {
              const slot = roomItem.running_class;
              return (
                <div key={`${roomItem.room}-${slot.id || slot.start_time}`} className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Room {roomItem.room} • {slot.start_time} - {slot.end_time}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{slot.subject}</p>
                  <p className="text-sm text-slate-700 mt-1">{slot.faculty_name || "Faculty"}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Class: {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-base font-semibold text-slate-800">All Rooms</h4>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room / subject / faculty / class..."
            className="w-full md:w-96 rounded-lg border border-slate-300 text-sm px-3 py-2"
          />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading room list...</p>
        ) : filteredRooms.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No rooms found for this filter.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Current Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Next Class</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const current = room.running_class;
                  const next = room.next_class;
                  return (
                    <tr key={room.room} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                        {room.room}
                        {room.capacity ? <span className="ml-2 text-xs text-slate-500">({room.capacity})</span> : null}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {room.status === "running" ? (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Running
                          </span>
                        ) : next ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Upcoming
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Vacant
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {current ? (
                          <div>
                            <p className="font-medium text-slate-800">{current.subject}</p>
                            <p className="text-xs text-slate-500">
                              {current.start_time} - {current.end_time} • {current.faculty_name || "Faculty"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {current.department || "-"} / {current.year || "-"} / {current.section || "-"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {next ? (
                          <div>
                            <p className="font-medium text-slate-800">{next.subject}</p>
                            <p className="text-xs text-slate-500">
                              {next.start_time} - {next.end_time} • {next.faculty_name || "Faculty"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {next.department || "-"} / {next.year || "-"} / {next.section || "-"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Rooms;
