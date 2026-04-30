import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

function Rooms({ role = "student" }) {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const [semester, setSemester] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [slotDay, setSlotDay] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotVacantOnly, setSlotVacantOnly] = useState(false);
  const [data, setData] = useState(null);
  const [instituteSlots, setInstituteSlots] = useState([]);
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
      const isFaculty = role === "faculty";
      const [livePayload, timetablePayload] = await Promise.all([
        isFaculty
          ? PreferenceService.getFacultyRoomLiveStatus(semester || undefined)
          : PreferenceService.getStudentRoomLiveStatus(semester || undefined),
        isFaculty
          ? PreferenceService.getFacultyInstituteTimetable(semester || undefined)
          : PreferenceService.getStudentInstituteTimetable(semester || undefined),
      ]);
      setData(livePayload || null);
      setInstituteSlots(Array.isArray(timetablePayload) ? timetablePayload : []);
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

  const toMinutes = (value) => {
    if (!value || typeof value !== "string" || !value.includes(":")) return -1;
    const [h, m] = value.split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
    return h * 60 + m;
  };

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
    const byText = !q
      ? sorted
      : sorted.filter((room) => {
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

    return byText.filter((room) => {
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "running" && room.status === "running") ||
        (statusFilter === "upcoming" && room.status !== "running" && !!room.next_class) ||
        (statusFilter === "vacant" && room.status !== "running" && !room.next_class);

      const cap = Number(room.capacity || 0);
      const capacityMatch =
        capacityFilter === "all" ||
        (capacityFilter === "upto40" && cap > 0 && cap <= 40) ||
        (capacityFilter === "41to80" && cap >= 41 && cap <= 80) ||
        (capacityFilter === "81to120" && cap >= 81 && cap <= 120) ||
        (capacityFilter === "120plus" && cap > 120);

      let slotMatch = true;
      if (slotVacantOnly && slotDay && slotStart && slotEnd) {
        const requestedStart = toMinutes(slotStart);
        const requestedEnd = toMinutes(slotEnd);
        if (requestedStart >= 0 && requestedEnd > requestedStart) {
          const occupiedInSlot = instituteSlots.some((slot) => {
            const sameDay = String(slot?.day || "").toLowerCase() === slotDay.toLowerCase();
            const sameRoom = String(slot?.room || "").trim().toLowerCase() === String(room?.room || "").trim().toLowerCase();
            if (!sameDay || !sameRoom) return false;
            const slotStartMin = toMinutes(slot?.start_time);
            const slotEndMin = toMinutes(slot?.end_time);
            if (slotStartMin < 0 || slotEndMin < 0) return false;
            return requestedStart < slotEndMin && requestedEnd > slotStartMin;
          });
          slotMatch = !occupiedInSlot;
        }
      }

      return statusMatch && capacityMatch && slotMatch;
    });
  }, [rooms, search, statusFilter, capacityFilter, slotVacantOnly, slotDay, slotStart, slotEnd, instituteSlots]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
        <div className="bg-gradient-to-r from-slate-50 via-white to-sky-50/60 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Room Availability</h3>
              <p className="mt-1 text-sm text-slate-600">
                {role === "faculty"
                  ? "Live classroom status from published timetable. Faculty can monitor running and upcoming classes by room."
                  : "Live classroom status from published timetable. Students can see which class is running now in each room."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Semester (optional)"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={() => loadLiveStatus({ silent: true })}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                disabled={refreshing}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 pb-5 pt-4 md:grid-cols-4">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Running Classes</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{data?.running_classes_count ?? 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Rooms</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{rooms.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Next Slot Time</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{data?.next_slot_time || "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/80 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Today</p>
            <p className="mt-1 text-base font-semibold text-slate-800">
              {data?.day || "-"} {data?.current_time ? `• ${data.current_time}` : ""}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xl font-semibold tracking-tight text-slate-900">Classes Running Right Now</h4>
          <span className="text-xs text-slate-500">{runningRooms.length} live rooms</span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading live rooms...</p>
        ) : runningRooms.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No class is running right now.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {runningRooms.map((roomItem) => {
              const slot = roomItem.running_class;
              return (
                <div key={`${roomItem.room}-${slot.id || slot.start_time}`} className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Room {roomItem.room} • {slot.start_time} - {slot.end_time}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{slot.subject}</p>
                  <p className="mt-1 text-sm text-slate-700">{slot.faculty_name || "Faculty"}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Class: {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h4 className="text-xl font-semibold tracking-tight text-slate-900">All Rooms</h4>
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {filteredRooms.length} shown
            </span>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <select
              value={slotDay}
              onChange={(e) => setSlotDay(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Any Day</option>
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={slotStart}
              onChange={(e) => setSlotStart(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              title="Slot start"
            />
            <input
              type="time"
              value={slotEnd}
              onChange={(e) => setSlotEnd(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              title="Slot end"
            />
            <button
              type="button"
              onClick={() => setSlotVacantOnly((prev) => !prev)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                slotVacantOnly
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {slotVacantOnly ? "Vacant In Slot: ON" : "Vacant In Slot"}
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="upcoming">Upcoming</option>
              <option value="vacant">Vacant</option>
            </select>
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Capacity</option>
              <option value="upto40">Up to 40 students</option>
              <option value="41to80">41 - 80 students</option>
              <option value="81to120">81 - 120 students</option>
              <option value="120plus">120+ students</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room / subject / faculty / class..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-96"
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading room list...</p>
        ) : filteredRooms.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No rooms found for this filter.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">Room</th>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">Status</th>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">Current Class</th>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">Next Class</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const current = room.running_class;
                  const next = room.next_class;
                  return (
                    <tr key={room.room} className="border-t border-slate-200 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                      <td className="px-5 py-3 text-[1.2rem] font-semibold leading-none text-slate-900">
                        {room.room}
                        {room.capacity ? <span className="ml-2 text-sm font-medium text-slate-500">({room.capacity})</span> : null}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {room.status === "running" ? (
                          <span className="inline-flex rounded-full border border-blue-300 bg-blue-50 px-3 py-[5px] text-[12px] font-semibold text-blue-700">
                            Running
                          </span>
                        ) : next ? (
                          <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-[5px] text-[12px] font-semibold text-amber-700">
                            Upcoming
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-[5px] text-[12px] font-semibold text-emerald-700">
                            Vacant
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {current ? (
                          <div className="group relative inline-block">
                            <p className="text-sm font-semibold text-slate-800">{current.subject}</p>
                            <p className="text-[12px] text-slate-500">
                              {current.start_time} - {current.end_time} • {current.faculty_name || "Faculty"}
                            </p>
                            <p className="text-[12px] text-slate-500">
                              {current.department || "-"} / {current.year || "-"} / {current.section || "-"}
                            </p>
                            {room.status === "running" && (
                              <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl group-hover:block">
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Running Class Details</p>
                                <p className="mt-2 text-sm font-semibold text-slate-900">{current.subject || "-"}</p>
                                <p className="mt-1 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Teacher:</span> {current.faculty_name || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Branch:</span> {current.department || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Year/Section:</span> {current.year || "-"} / {current.section || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Slot:</span> {current.start_time || "-"} - {current.end_time || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Semester:</span> {current.semester || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Room:</span> {room.room || "-"}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[15px] text-slate-400">No class</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {next ? (
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{next.subject}</p>
                            <p className="text-[12px] text-slate-500">
                              {next.start_time} - {next.end_time} • {next.faculty_name || "Faculty"}
                            </p>
                            <p className="text-[12px] text-slate-500">
                              {next.department || "-"} / {next.year || "-"} / {next.section || "-"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[15px] text-slate-400">No class</span>
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
