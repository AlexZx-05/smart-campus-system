import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

const DEFAULT_CREDITS_PER_COURSE = 4;

function CreditsDetails({ enrollments = [], onBack }) {
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [latestGradeByCourseKey, setLatestGradeByCourseKey] = useState({});

  const extractSemesterNumber = (value) => {
    const text = String(value || "").toLowerCase();
    const match = text.match(/\b(\d{1,2})\b/);
    return match ? match[1] : null;
  };

  const semesterFilterOptions = useMemo(() => {
    const set = new Set();
    enrollments.forEach((row) => {
      const n = extractSemesterNumber(row?.semester);
      if (n) set.add(n);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [enrollments]);

  const filteredEnrollments = useMemo(() => {
    if (selectedSemester === "all") return enrollments;
    return enrollments.filter((row) => extractSemesterNumber(row?.semester) === selectedSemester);
  }, [enrollments, selectedSemester]);

  const grouped = filteredEnrollments.reduce((acc, row) => {
    const sem = row?.semester || "Unspecified";
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(row);
    return acc;
  }, {});

  const semesters = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const overallCredits = filteredEnrollments.length * DEFAULT_CREDITS_PER_COURSE;

  useEffect(() => {
    let cancelled = false;
    const norm = (value) => String(value || "").trim().toLowerCase();
    const loadGrades = async () => {
      try {
        const assignments = await PreferenceService.getStudentAssignments();
        const map = {};
        (assignments || []).forEach((assignment) => {
          const submission = assignment?.my_submission;
          if (!submission?.grade_visible_to_student || !submission?.grade) return;
          const key = `${norm(assignment.subject)}|${norm(assignment.created_by_name)}|${norm(assignment.semester)}`;
          const at = new Date(submission.updated_at || submission.submitted_at || assignment.updated_at || assignment.created_at || 0).getTime();
          if (!map[key] || at > map[key].at) {
            map[key] = { grade: submission.grade, at };
          }
        });
        if (!cancelled) setLatestGradeByCourseKey(map);
      } catch {
        if (!cancelled) setLatestGradeByCourseKey({});
      }
    };
    loadGrades();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-lime-100 bg-gradient-to-br from-white via-lime-50/55 to-green-50/45 p-5 shadow-[0_8px_24px_-20px_rgba(101,163,13,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Credits by Semester</h3>
            <p className="mt-1 text-sm text-slate-600">All courses you have taken, grouped semester-wise.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-lime-200 bg-lime-50/70 p-1">
              <button
                type="button"
                onClick={() => setSelectedSemester("all")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  selectedSemester === "all" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
                }`}
              >
                All
              </button>
              {semesterFilterOptions.map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    selectedSemester === sem ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
            <span className="rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
              Total Courses: {filteredEnrollments.length}
            </span>
            <span className="rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
              Total Credits: {overallCredits}
            </span>
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {semesters.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No enrolled courses found.
        </div>
      ) : (
        semesters.map((semester) => {
          const rows = grouped[semester] || [];
          const semCredits = rows.length * DEFAULT_CREDITS_PER_COURSE;
          return (
            <div key={semester} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base font-semibold text-slate-900">{semester}</h4>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Credits: {semCredits}
                </span>
              </div>

              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Course</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Faculty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Grade</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const key = `${String(row.subject || "").trim().toLowerCase()}|${String(row.faculty_name || "").trim().toLowerCase()}|${String(row.semester || "").trim().toLowerCase()}`;
                      const latest = latestGradeByCourseKey[key]?.grade || null;
                      return (
                      <tr key={row.id} className="border-t border-slate-200">
                        <td className="px-3 py-2 text-sm text-slate-800">{row.subject || "-"}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{row.faculty_name || "Faculty"}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">
                          {latest ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {latest}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-slate-800">{DEFAULT_CREDITS_PER_COURSE}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default CreditsDetails;
