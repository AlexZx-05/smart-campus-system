import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";
import DashboardService from "../../services/DashboardService";
import Card from "../../components/Card";

function AcademicProgress({ onOpenAttendance, onOpenCredits }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendance, setAttendance] = useState(null);
  const [teacherRows, setTeacherRows] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [cgpaEstimate, setCgpaEstimate] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [semesterTrend, setSemesterTrend] = useState([]);

  const parseGradePoint = (grade) => {
    const text = String(grade || "").trim().toUpperCase();
    if (!text) return null;

    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      if (numeric >= 0 && numeric <= 10) return numeric;
      if (numeric > 10 && numeric <= 100) return numeric / 10;
      return null;
    }

    const letterMap = {
      "O": 10,
      "A+": 9.5,
      "A": 9,
      "B+": 8.5,
      "B": 8,
      "C+": 7.5,
      "C": 7,
      "D": 6,
      "E": 5,
      "F": 0,
    };
    return Object.prototype.hasOwnProperty.call(letterMap, text) ? letterMap[text] : null;
  };

  const loadProgress = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardRes, assignmentsRes, enrollmentsRes] = await Promise.allSettled([
        DashboardService.getDashboardData(),
        PreferenceService.getStudentAssignments(),
        PreferenceService.getStudentCourseEnrollments(),
      ]);

      if (dashboardRes.status === "fulfilled") {
        setAttendance(dashboardRes.value?.attendance_percentage ?? null);
      } else {
        setAttendance(null);
      }

      const assignments = assignmentsRes.status === "fulfilled" ? assignmentsRes.value || [] : [];
      const enrollments = enrollmentsRes.status === "fulfilled" ? enrollmentsRes.value || [] : [];

      const grouped = {};
      let reviewedItems = 0;
      const gradePoints = [];
      const history = [];
      const trendBucket = {};

      const ensureGroup = (facultyName, subject, semester) => {
        const key = `${facultyName || "Faculty"}|${subject || "Subject"}|${semester || ""}`;
        if (!grouped[key]) {
          grouped[key] = {
            key,
            faculty_name: facultyName || "Faculty",
            subject: subject || "-",
            semester: semester || "-",
            reviewed_count: 0,
            latest_grade: null,
            latest_feedback: null,
            updated_at: null,
          };
        }
        return grouped[key];
      };

      assignments.forEach((assignment) => {
        const row = ensureGroup(assignment.created_by_name, assignment.subject, assignment.semester);
        const submission = assignment.my_submission;
        if (!submission) return;

        const hasReview = submission.grade || submission.teacher_feedback || submission.status === "reviewed";
        if (!hasReview) return;

        reviewedItems += 1;
        row.reviewed_count += 1;
        const updated = submission.updated_at || submission.submitted_at || assignment.updated_at || assignment.created_at;

        history.push({
          id: assignment.id,
          title: assignment.title,
          subject: assignment.subject || "-",
          faculty_name: assignment.created_by_name || "Faculty",
          semester: assignment.semester || "-",
          grade: submission.grade || null,
          feedback: submission.teacher_feedback || null,
          reviewed_at: updated || null,
        });

        if (submission.grade) {
          row.latest_grade = submission.grade;
          const point = parseGradePoint(submission.grade);
          if (point !== null) {
            gradePoints.push(point);
            const semesterKey = assignment.semester || "Unspecified";
            if (!trendBucket[semesterKey]) {
              trendBucket[semesterKey] = { semester: semesterKey, grade_sum: 0, grade_count: 0, reviewed_count: 0 };
            }
            trendBucket[semesterKey].grade_sum += point;
            trendBucket[semesterKey].grade_count += 1;
          }
        }
        if (submission.teacher_feedback) {
          row.latest_feedback = submission.teacher_feedback;
        }
        if (updated && (!row.updated_at || new Date(updated).getTime() > new Date(row.updated_at).getTime())) {
          row.updated_at = updated;
        }
        const semesterKey = assignment.semester || "Unspecified";
        if (!trendBucket[semesterKey]) {
          trendBucket[semesterKey] = { semester: semesterKey, grade_sum: 0, grade_count: 0, reviewed_count: 0 };
        }
        trendBucket[semesterKey].reviewed_count += 1;
      });

      enrollments.forEach((enrollment) => {
        ensureGroup(enrollment.faculty_name, enrollment.subject, enrollment.semester);
      });

      const consolidated = Object.values(grouped).sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime() ||
          a.faculty_name.localeCompare(b.faculty_name)
      );

      const avgPoint = gradePoints.length
        ? Number((gradePoints.reduce((sum, p) => sum + p, 0) / gradePoints.length).toFixed(2))
        : null;
      const trendRows = Object.values(trendBucket)
        .map((row) => ({
          semester: row.semester,
          reviewed_count: row.reviewed_count,
          avg_grade_point: row.grade_count ? Number((row.grade_sum / row.grade_count).toFixed(2)) : null,
        }))
        .sort((a, b) => a.semester.localeCompare(b.semester));
      const historyRows = history.sort(
        (a, b) => new Date(b.reviewed_at || 0).getTime() - new Date(a.reviewed_at || 0).getTime()
      );

      setReviewCount(reviewedItems);
      setCgpaEstimate(avgPoint);
      setTeacherRows(consolidated);
      setReviewHistory(historyRows);
      setSemesterTrend(trendRows);

      if (assignmentsRes.status === "rejected") {
        setError(assignmentsRes.reason?.response?.data?.message || "Could not load teacher academic updates.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load academic progress.");
      setTeacherRows([]);
      setReviewCount(0);
      setCgpaEstimate(null);
      setAttendance(null);
      setReviewHistory([]);
      setSemesterTrend([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  const teachersWithUpdates = useMemo(
    () => teacherRows.filter((row) => row.reviewed_count > 0).length,
    [teacherRows]
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
        <div className="bg-gradient-to-r from-slate-50 via-white to-indigo-50/55 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Academic Progress</h3>
            <p className="mt-1 text-sm text-slate-600">
              Your details sent by different teachers: grades, feedback, attendance summary, and CGPA estimate.
            </p>
          </div>
          <button
            onClick={loadProgress}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card
          title="Attendance"
          value={attendance !== null ? `${attendance}%` : "-"}
          subtitle="Current semester"
          onClick={onOpenAttendance}
          className="border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-teal-100/70 shadow-[0_18px_36px_-26px_rgba(5,150,105,0.42)]"
        />
        <Card
          title="Estimated CGPA"
          value={cgpaEstimate !== null ? cgpaEstimate.toFixed(2) : "-"}
          subtitle="From reviewed grades"
          onClick={onOpenCredits}
          className="border-indigo-200 bg-gradient-to-br from-white via-indigo-50 to-blue-100/70 shadow-[0_18px_36px_-26px_rgba(79,70,229,0.35)]"
        />
        <Card title="Reviewed Items" value={String(reviewCount)} subtitle="Teacher-reviewed submissions" className="border-amber-200 bg-gradient-to-br from-white via-amber-50 to-orange-100/65 shadow-[0_18px_36px_-26px_rgba(217,119,6,0.35)]" />
        <Card title="Teachers Reporting" value={String(teachersWithUpdates)} subtitle="Distinct teachers with updates" className="border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-100/70 shadow-[0_18px_36px_-26px_rgba(14,116,144,0.35)]" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
        <h4 className="text-xl font-semibold tracking-tight text-slate-900">Teacher-wise Academic Details</h4>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading your academic details...</p>
        ) : teacherRows.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No academic details shared by teachers yet.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Teacher</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Semester</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Latest Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Reviewed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Teacher Feedback</th>
                </tr>
              </thead>
              <tbody>
                {teacherRows.map((row) => (
                  <tr key={row.key} className="border-t border-slate-200 odd:bg-white even:bg-slate-50/40 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-800">{row.faculty_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.subject}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.semester}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.latest_grade || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.reviewed_count}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-md">
                      <p className="line-clamp-2">{row.latest_feedback || "No feedback yet"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
          <h4 className="text-xl font-semibold tracking-tight text-slate-900">Past Performance Trend (Semester-wise)</h4>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading trend...</p>
          ) : semesterTrend.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No past trend available yet.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Semester</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Reviewed Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Avg Grade Point</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterTrend.map((row) => (
                    <tr key={row.semester} className="border-t border-slate-200 odd:bg-white even:bg-slate-50/40 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-800">{row.semester}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.reviewed_count}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.avg_grade_point !== null ? row.avg_grade_point.toFixed(2) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
          <h4 className="text-xl font-semibold tracking-tight text-slate-900">Past Performance History</h4>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading history...</p>
          ) : reviewHistory.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No reviewed history yet.
            </div>
          ) : (
            <div className="mt-3 space-y-3 max-h-[28rem] overflow-auto pr-1">
              {reviewHistory.map((row) => (
                <div key={`${row.id}-${row.reviewed_at || "no-date"}`} className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{row.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {row.subject} | {row.semester} | {row.faculty_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Reviewed: {row.reviewed_at ? new Date(row.reviewed_at).toLocaleString() : "-"}
                  </p>
                  <p className="text-sm text-slate-700 mt-2">Grade: {row.grade || "-"}</p>
                  {row.feedback && <p className="text-sm text-slate-700 mt-1">{row.feedback}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AcademicProgress;
