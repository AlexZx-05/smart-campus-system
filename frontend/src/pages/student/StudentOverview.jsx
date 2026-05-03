import { useEffect, useState } from "react";
import Card from "../../components/Card";
import AnnouncementCarousel from "../../components/AnnouncementCarousel";

function StudentOverview({
  data,
  loading,
  announcements = [],
  loadingAnnouncements = false,
  announcementError = "",
  onRefreshAnnouncements,
  personalizedOverview = { todaySchedule: [], todayEvents: [], roomLiveStatus: null, upcomingDeadlines: [] },
  loadingPersonalizedOverview = false,
  onOpenNotifications,
  onOpenExams,
  onOpenAttendance,
  onOpenCredits,
  upcomingExamCount = 0,
  joinedClassrooms = [],
  courseEnrollments = [],
  unreadNotificationCount = 0,
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
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    let intervalId;
    const alignToNextSecond = () => {
      const nowMs = Date.now();
      const delay = 1000 - (nowMs % 1000);
      const timeoutId = setTimeout(() => {
        setNowTick(new Date());
        intervalId = setInterval(() => {
          setNowTick(new Date());
        }, 1000);
      }, delay);
      return timeoutId;
    };

    const timeoutId = alignToNextSecond();
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const toMinutes = (value) => {
    if (!value || typeof value !== "string" || !value.includes(":")) return -1;
    const [h, m] = value.split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
    return h * 60 + m;
  };

  const now = nowTick;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySchedule = personalizedOverview?.todaySchedule || [];
  const todayEvents = personalizedOverview?.todayEvents || [];
  const roomLiveStatus = personalizedOverview?.roomLiveStatus || null;
  const liveRooms = (roomLiveStatus?.rooms || []).filter((room) => room?.status === "running" && room?.running_class);
  const upcomingDeadlines = settings.assignmentReminders
    ? personalizedOverview?.upcomingDeadlines || []
    : [];
  const runningSlot = todaySchedule.find(
    (slot) => toMinutes(slot.start_time) <= nowMinutes && nowMinutes < toMinutes(slot.end_time)
  );
  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const nowTimeLabel = now.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const densityClass = settings.dashboardDensity === "compact" ? "space-y-3" : "space-y-5";
  const cardGap = settings.dashboardDensity === "compact" ? "gap-3" : "gap-4";
  const cardPadding = settings.dashboardDensity === "compact" ? "p-4" : "p-5";
  const effectiveAnnouncementCount = settings.emailNotifications ? unreadNotificationCount : 0;
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
            className="border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-teal-100/70 shadow-[0_18px_36px_-26px_rgba(5,150,105,0.45)]"
          />
        )}
        <Card
          title="Credits Completed"
          value={String(computedCredits)}
          subtitle="Out of 160 (click for semester-wise details)"
          onClick={onOpenCredits}
          className="border-lime-200 bg-gradient-to-br from-white via-lime-50 to-emerald-100/70 shadow-[0_18px_36px_-26px_rgba(101,163,13,0.42)]"
        />
        <Card
          title="Classes Today"
          value={String(todaySchedule.length || 0)}
          subtitle="From your timetable"
          className="border-amber-200 bg-gradient-to-br from-white via-amber-50 to-orange-100/70 shadow-[0_18px_36px_-26px_rgba(202,138,4,0.4)]"
        />
        <Card
          title="Unread Notifications"
          value={String(effectiveAnnouncementCount)}
          subtitle={settings.emailNotifications ? "In your inbox" : "Disabled by settings"}
          onClick={onOpenNotifications}
          className="border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-100/70 shadow-[0_18px_36px_-26px_rgba(14,116,144,0.4)]"
        />
      </div>

      <div className={`grid grid-cols-1 xl:grid-cols-3 ${cardGap}`}>
        <div className={`xl:col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.32)] ${cardPadding} transition-colors`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Today&apos;s Schedule</h3>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              {todayLabel} | {nowTimeLabel}
            </span>
          </div>
          {loadingPersonalizedOverview ? (
            <p className="text-sm text-slate-500 mt-4">Loading your schedule...</p>
          ) : (
            <>
              {todayEvents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {todayEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5">
                      <p className="text-sm font-semibold text-amber-900">{event.title}</p>
                      {event.description ? <p className="mt-1 text-xs text-amber-800">{event.description}</p> : null}
                    </div>
                  ))}
                </div>
              )}

              {todaySchedule.length === 0 ? (
                <p className="text-sm text-slate-500 mt-4">
                  {todayEvents.length > 0 ? "No classes today. Holiday/event schedule is shown above." : "No classes scheduled for today."}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {todaySchedule.map((slot, idx) => {
                    const isRunning = (runningSlot?.id || `${runningSlot?.start_time}-${runningSlot?.subject}`) ===
                      (slot.id || `${slot.start_time}-${slot.subject}`);
                    return (
                      <div
                        key={`${slot.id || idx}-${slot.start_time}`}
                        className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                          isRunning
                            ? "border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-900/50 dark:bg-blue-950/35"
                            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60"
                        }`}
                      >
                        <div className={`min-w-[92px] rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${
                          isRunning ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          <p>{slot.start_time}</p>
                          <p className="text-[11px] font-medium text-slate-500">to {slot.end_time}</p>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${isRunning ? "text-blue-900 dark:text-blue-200" : "text-slate-800 dark:text-slate-100"}`}>
                            {slot.subject || "Subject"}
                          </p>
                          <p className={`mt-1 text-xs ${isRunning ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-400"}`}>
                            Room {slot.room || "-"}{slot.faculty_name ? ` | ${slot.faculty_name}` : ""}{isRunning ? " | Running now" : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>

        <div className={settings.dashboardDensity === "compact" ? "space-y-3" : "space-y-4"}>
          <Card
            title="Upcoming Exams"
            value={String(settings.examAlerts ? upcomingExamCount : 0)}
            subtitle={settings.examAlerts ? "From teacher calendar events" : "Disabled by settings"}
            onClick={onOpenExams}
            className={`border-violet-200 bg-gradient-to-br from-white via-violet-50 to-fuchsia-100/60 shadow-[0_18px_36px_-26px_rgba(124,58,237,0.38)] ${cardPadding}`}
          />
          <div className={`rounded-2xl border border-rose-200 bg-gradient-to-br from-white via-rose-50 to-orange-100/55 shadow-[0_18px_36px_-26px_rgba(225,29,72,0.32)] ${cardPadding} transition-colors`}>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Assignment Deadlines</h3>
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

      <div className={`rounded-2xl border border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-100/65 shadow-[0_20px_42px_-28px_rgba(8,145,178,0.4)] ${cardPadding} transition-colors`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Rooms Live</h3>
          <span className="rounded-full border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 shadow-sm">
            Running: {roomLiveStatus?.running_classes_count ?? 0}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {roomLiveStatus?.day || "-"} {roomLiveStatus?.current_time ? `| ${roomLiveStatus.current_time}` : ""}
          {roomLiveStatus?.next_slot_time ? ` | Next slot: ${roomLiveStatus.next_slot_time}` : ""}
        </p>

        {liveRooms.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No classroom is live right now.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {liveRooms.slice(0, 6).map((room) => (
              <div key={`${room.room}-${room.running_class?.id || room.running_class?.start_time}`} className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Room {room.room} | {room.running_class?.start_time} - {room.running_class?.end_time}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{room.running_class?.subject || "Live Class"}</p>
                <p className="mt-0.5 text-xs text-slate-600">{room.running_class?.faculty_name || "Faculty"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentOverview;
