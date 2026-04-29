import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Timetable({ defaultView = "my" }) {
  const [view, setView] = useState(defaultView);
  const [semester, setSemester] = useState("");
  const [myInfo, setMyInfo] = useState({ department: "", year: "", section: "" });
  const [myTimetable, setMyTimetable] = useState([]);
  const [instituteTimetable, setInstituteTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [myRes, instituteRes] = await Promise.allSettled([
      PreferenceService.getStudentMyTimetable(semester),
      PreferenceService.getStudentInstituteTimetable(semester),
    ]);

    const messages = [];

    if (myRes.status === "fulfilled") {
      setMyInfo(myRes.value?.student || { department: "", year: "", section: "" });
      setMyTimetable(myRes.value?.timetable || []);
    } else {
      setMyInfo({ department: "", year: "", section: "" });
      setMyTimetable([]);
      const msg = myRes.reason?.response?.data?.message || "Failed to load your timetable.";
      messages.push(msg);
    }

    if (instituteRes.status === "fulfilled") {
      setInstituteTimetable(instituteRes.value || []);
    } else {
      setInstituteTimetable([]);
      const msg = instituteRes.reason?.response?.data?.message || "Failed to load institute timetable.";
      messages.push(msg);
    }

    if (messages.length > 0) {
      setError(messages.join(" "));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [semester]);

  const currentData = useMemo(() => (view === "my" ? myTimetable : instituteTimetable), [view, myTimetable, instituteTimetable]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-5 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Timetable</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                View your branch timetable or complete institute timetable.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 2v4M16 2v4M3 10h18" />
                  <rect x="3" y="5" width="18" height="17" rx="2" />
                </svg>
                <input
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="Semester (e.g. Odd 2026)"
                  className="rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>
              <button
                onClick={loadData}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
            <button
              onClick={() => setView("my")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                view === "my"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              My Timetable
            </button>
            <button
              onClick={() => setView("institute")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                view === "institute"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Institute Timetable
            </button>
          </div>

          {view === "my" && (
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <span className="font-medium text-slate-700 dark:text-slate-200">Department:</span> {myInfo.department || "-"}
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">Year:</span> {myInfo.year || "-"}
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">Section:</span> {myInfo.section || "-"}
            </div>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading timetable...</p>
        ) : currentData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">No timetable published for this filter.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try another semester or switch the timetable view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Day</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Faculty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Class</th>
                </tr>
              </thead>
              <tbody>
                {currentData
                  .slice()
                  .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start_time.localeCompare(b.start_time))
                  .map((slot, idx) => (
                    <tr key={`${slot.id || slot.source_preference_id}-${idx}`} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{slot.day}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {slot.start_time} - {slot.end_time}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium">{slot.subject}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{slot.faculty_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{slot.room}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Timetable;
