import Card from "../../components/Card";

function StudentOverview({ data, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Attendance" value={`${data?.attendance_percentage ?? 0}%`} subtitle="Current semester" />
        <Card title="Credits Completed" value="96" subtitle="Out of 160" />
        <Card title="Classes Today" value={String(data?.total_classes_today ?? 0)} subtitle="As per timetable" />
        <Card title="Unread Notifications" value="3" subtitle="Needs attention" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Today&apos;s Schedule</h3>
          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-900/50 transition-colors">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">09:00 - 10:00 | Data Structures</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Room B-204 | Running now</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 transition-colors">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">11:00 - 12:00 | DBMS</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Room C-102</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 transition-colors">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">14:00 - 15:00 | Operating Systems</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Lab A-12</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Upcoming Exams</h3>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{data?.upcoming_exams ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Next: Algorithms Mid-term</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Assignment Deadlines</h3>
            <ul className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <li>Physics Lab Report - Friday</li>
              <li>DBMS Mini Project - Monday</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentOverview;
