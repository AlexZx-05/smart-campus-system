import Card from "../../components/Card";
import AnnouncementCarousel from "../../components/AnnouncementCarousel";

function StudentOverview({
  data,
  loading,
  announcements = [],
  loadingAnnouncements = false,
  announcementError = "",
  onRefreshAnnouncements,
  personalizedOverview = { todaySchedule: [], upcomingDeadlines: [] },
  loadingPersonalizedOverview = false,
  onOpenNotifications,
  onOpenExams,
  onOpenAttendance,
  onOpenCredits,
  upcomingExamCount = 0,
  joinedClassrooms = [],
  courseEnrollments = [],
  settings = {
    emailNotifications: true,
    examAlerts: true,
    assignmentReminders: true,
    showAttendanceWidget: true,
    dashboardDensity: "comfortable",
    language: "English",
    weekStart: "Monday",
  },
}) {
  const toMinutes = (value) => {
    if (!value || typeof value !== "string" || !value.includes(":")) return -1;
    const [h, m] = value.split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
    return h * 60 + m;
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySchedule = personalizedOverview?.todaySchedule || [];
  const upcomingDeadlines = settings.assignmentReminders
    ? personalizedOverview?.upcomingDeadlines || []
    : [];
  const runningSlot = todaySchedule.find(
    (slot) => toMinutes(slot.start_time) <= nowMinutes && nowMinutes < toMinutes(slot.end_time)
  );
  const densityClass = settings.dashboardDensity === "compact" ? "space-y-3" : "space-y-5";
  const cardGap = settings.dashboardDensity === "compact" ? "gap-3" : "gap-4";
  const cardPadding = settings.dashboardDensity === "compact" ? "p-4" : "p-5";
  const effectiveAnnouncementCount = settings.emailNotifications ? announcements.length : 0;
  const computedCredits = (courseEnrollments?.length || 0) * 4;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/55 to-blue-50/70 shadow-[0_8px_24px_-20px_rgba(30,64,175,0.45)] p-5 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={densityClass}>
      <AnnouncementCarousel
        messages={announcements}
        loading={loadingAnnouncements}
        error={announcementError}
        title="Announcement"
        subtitle=""
        emptyMessage="No student announcements yet."
      />

      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${cardGap}`}>
        {settings.showAttendanceWidget && (
          <Card
            title="Attendance"
            value={`${data?.attendance_percentage ?? 0}%`}
            subtitle="Current semester (click for details)"
            onClick={onOpenAttendance}
            className="border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50 shadow-[0_8px_24px_-20px_rgba(5,150,105,0.4)]"
          />
        )}
        <Card
          title="Credits Completed"
          value={String(computedCredits)}
          subtitle="Out of 160 (click for semester-wise details)"
          onClick={onOpenCredits}
          className="border-lime-100 bg-gradient-to-br from-white via-lime-50/70 to-green-50 shadow-[0_8px_24px_-20px_rgba(101,163,13,0.35)]"
        />
        <Card
          title="Classes Today"
          value={String(todaySchedule.length || 0)}
          subtitle="From your timetable"
          className="border-yellow-100 bg-gradient-to-br from-white via-amber-50/70 to-yellow-50 shadow-[0_8px_24px_-20px_rgba(202,138,4,0.35)]"
        />
        <Card
          title="Unread Notifications"
          value={String(effectiveAnnouncementCount)}
          subtitle={settings.emailNotifications ? "In your inbox" : "Disabled by settings"}
          onClick={onOpenNotifications}
          className="border-teal-100 bg-gradient-to-br from-white via-teal-50/70 to-cyan-50 shadow-[0_8px_24px_-20px_rgba(13,148,136,0.35)]"
        />
      </div>

      <div className={`grid grid-cols-1 xl:grid-cols-3 ${cardGap}`}>
        <div className={`xl:col-span-2 rounded-xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/55 to-teal-50/60 shadow-[0_8px_24px_-20px_rgba(5,150,105,0.35)] ${cardPadding} transition-colors`}>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Today&apos;s Schedule</h3>
          {loadingPersonalizedOverview ? (
            <p className="text-sm text-slate-500 mt-4">Loading your schedule...</p>
          ) : todaySchedule.length === 0 ? (
            <p className="text-sm text-slate-500 mt-4">No classes scheduled for today.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {todaySchedule.map((slot, idx) => {
                const isRunning = (runningSlot?.id || `${runningSlot?.start_time}-${runningSlot?.subject}`) ===
                  (slot.id || `${slot.start_time}-${slot.subject}`);
                return (
                  <div
                    key={`${slot.id || idx}-${slot.start_time}`}
                    className={`p-3 rounded-lg border transition-colors ${
                      isRunning
                        ? "bg-blue-50 dark:bg-blue-950/35 border-blue-200 dark:border-blue-900/50"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isRunning ? "text-blue-900 dark:text-blue-200" : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {slot.start_time} - {slot.end_time} | {slot.subject}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isRunning ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Room {slot.room || "-"}{isRunning ? " | Running now" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={settings.dashboardDensity === "compact" ? "space-y-3" : "space-y-4"}>
          <Card
            title="Upcoming Exams"
            value={String(settings.examAlerts ? upcomingExamCount : 0)}
            subtitle={settings.examAlerts ? "From teacher calendar events" : "Disabled by settings"}
            onClick={onOpenExams}
            className={`border-lime-100 bg-gradient-to-br from-white via-lime-50/60 to-yellow-50/45 shadow-[0_8px_24px_-20px_rgba(101,163,13,0.35)] ${cardPadding}`}
          />
          <div className={`rounded-xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/55 to-emerald-50/50 shadow-[0_8px_24px_-20px_rgba(13,148,136,0.35)] ${cardPadding} transition-colors`}>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Assignment Deadlines</h3>
            {!settings.assignmentReminders ? (
              <p className="text-sm text-slate-500 mt-3">Disabled by settings.</p>
            ) : loadingPersonalizedOverview ? (
              <p className="text-sm text-slate-500 mt-3">Loading deadlines...</p>
            ) : upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No upcoming deadlines from joined classrooms.</p>
            ) : (
              <ul className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2">
                {upcomingDeadlines.map((item) => (
                  <li key={item.id}>
                    {item.title} -{" "}
                    {new Date(item.due_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentOverview;
