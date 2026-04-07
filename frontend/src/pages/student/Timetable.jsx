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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Timetable</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              View your branch timetable or complete institute timetable.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Semester (e.g. Odd 2026)"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm px-3 py-2"
            />
            <button
              onClick={loadData}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setView("my")}
            className={`px-3 py-2 text-sm rounded-lg border ${
              view === "my"
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            My Timetable
          </button>
          <button
            onClick={() => setView("institute")}
            className={`px-3 py-2 text-sm rounded-lg border ${
              view === "institute"
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            Institute Timetable
          </button>
        </div>

        {view === "my" && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Department: {myInfo.department || "-"} | Year: {myInfo.year || "-"} | Section: {myInfo.section || "-"}
          </p>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading timetable...</p>
        ) : currentData.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No timetable published for this filter.</p>
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
