import { useEffect, useState } from "react";
import DashboardService from "../../services/DashboardService";
import DashboardLayout from "../../layouts/DashboardLayout";
import StudentOverview from "./StudentOverview";
import Timetable from "./Timetable";
import Rooms from "./Rooms";
import Notifications from "./Notifications";
import Assignments from "./Assignments";
import AcademicProgress from "./AcademicProgress";
import Queries from "./Queries";
import CalendarPage from "./CalendarPage";
import Profile from "./Profile";
import Settings from "./Settings";
import ExamSchedule from "./ExamSchedule";
import AttendanceDetails from "./AttendanceDetails";
import CreditsDetails from "./CreditsDetails";
import StudentService from "../../services/StudentService";
import PreferenceService from "../../services/PreferenceService";
import EventService from "../../services/EventService";

const defaultStudentSettings = {
  emailNotifications: true,
  examAlerts: true,
  assignmentReminders: true,
  showAttendanceWidget: true,
  dashboardDensity: "comfortable",
  language: "English",
  weekStart: "Monday",
};

const mapSettingsFromApi = (apiSettings = {}) => ({
  emailNotifications: apiSettings.email_notifications ?? defaultStudentSettings.emailNotifications,
  examAlerts: apiSettings.exam_alerts ?? defaultStudentSettings.examAlerts,
  assignmentReminders: apiSettings.assignment_reminders ?? defaultStudentSettings.assignmentReminders,
  showAttendanceWidget: apiSettings.show_attendance_widget ?? defaultStudentSettings.showAttendanceWidget,
  dashboardDensity: apiSettings.dashboard_density ?? defaultStudentSettings.dashboardDensity,
  language: apiSettings.language ?? defaultStudentSettings.language,
  weekStart: apiSettings.week_start ?? defaultStudentSettings.weekStart,
});

function StudentDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentProfile, setStudentProfile] = useState({
    name: "",
    profile_image_url: "",
  });
  const [dashboardAnnouncements, setDashboardAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const [personalizedOverview, setPersonalizedOverview] = useState({
    todaySchedule: [],
    todayEvents: [],
    roomLiveStatus: null,
    upcomingDeadlines: [],
  });
  const [loadingPersonalizedOverview, setLoadingPersonalizedOverview] = useState(false);
  const [studentSettings, setStudentSettings] = useState(defaultStudentSettings);
  const [upcomingExamCount, setUpcomingExamCount] = useState(0);
  const [upcomingExamEvents, setUpcomingExamEvents] = useState([]);
  const [joinedClassrooms, setJoinedClassrooms] = useState([]);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [pendingJoinClassroomId, setPendingJoinClassroomId] = useState(null);

  const normalizeTextKey = (value) => (value || "").trim().toLowerCase();
  const normalizeDay = (value) => (value || "").trim().toLowerCase();

  const isExamCalendarEvent = (event) => {
    const text = `${event?.title || ""} ${event?.description || ""}`.toLowerCase();
    return /\b(exam|mid\s*term|midterm|end\s*term|endterm|quiz|test|viva|practical)\b/.test(text);
  };

  const loadDashboardAnnouncements = async () => {
    setLoadingAnnouncements(true);
    setAnnouncementError("");
    try {
      const items = await PreferenceService.getInboxMessages();
      setDashboardAnnouncements(items || []);
      return items || [];
    } catch (err) {
      setAnnouncementError(err.response?.data?.message || "Failed to load announcements.");
      return [];
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const loadPersonalizedOverview = async () => {
    setLoadingPersonalizedOverview(true);
    try {
      const [myTimetableRes, instituteTimetableRes, assignmentsRes, calendarEvents, joinedClassroomsRes, courseEnrollmentsRes, roomLiveStatusRes] = await Promise.all([
        PreferenceService.getStudentMyTimetable(),
        PreferenceService.getStudentInstituteTimetable(),
        PreferenceService.getStudentAssignments(),
        EventService.getEvents(),
        PreferenceService.getStudentJoinedClassrooms(),
        PreferenceService.getStudentCourseEnrollments(),
        PreferenceService.getStudentRoomLiveStatus(),
      ]);

      const studentClass = {
        department: normalizeTextKey(myTimetableRes?.student?.department),
        year: String(myTimetableRes?.student?.year || ""),
        section: normalizeTextKey(myTimetableRes?.student?.section),
      };
      const mySlots = Array.isArray(myTimetableRes?.timetable) ? myTimetableRes.timetable : [];
      const instituteSlots = Array.isArray(instituteTimetableRes) ? instituteTimetableRes : [];
      const filteredInstituteSlots = instituteSlots.filter((slot) => {
        const deptOk = normalizeTextKey(slot?.department) === studentClass.department;
        const yearOk = String(slot?.year || "") === studentClass.year;
        const sectionOk = normalizeTextKey(slot?.section) === studentClass.section;
        return deptOk && yearOk && sectionOk;
      });
      const effectiveSlots = mySlots.length > 0 ? mySlots : filteredInstituteSlots;

      const today = normalizeDay(new Date().toLocaleDateString("en-US", { weekday: "long" }));
      const todayIso = new Date().toISOString().slice(0, 10);
      const todaySchedule = effectiveSlots
        .filter((slot) => normalizeDay(slot?.day) === today)
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
      const todayEvents = (Array.isArray(calendarEvents) ? calendarEvents : [])
        .filter((event) => String(event?.date || "") === todayIso)
        .map((event) => ({
          id: event.id || `${event.date}-${event.title}`,
          title: event.title || "Calendar Event",
          description: event.description || "",
          creator_name: event.creator_name || "",
          creator_role: event.creator_role || "",
        }));

      const joinedClassroomRows = Array.isArray(joinedClassroomsRes) ? joinedClassroomsRes : [];
      setJoinedClassrooms(joinedClassroomRows);
      setCourseEnrollments(Array.isArray(courseEnrollmentsRes) ? courseEnrollmentsRes : []);
      const joinedClassroomKeys = new Set(
        joinedClassroomRows.map((row) =>
          [
            String(row?.faculty_id || ""),
            normalizeTextKey(row?.subject),
            String(row?.semester || ""),
          ].join("|")
        )
      );
      const joinedSubjects = new Set(joinedClassroomRows.map((row) => normalizeTextKey(row?.subject)).filter(Boolean));
      const joinedSemesters = new Set(joinedClassroomRows.map((row) => String(row?.semester || "")).filter(Boolean));

      const now = Date.now();
      const upcomingDeadlines = (assignmentsRes || [])
        .filter((row) => {
          const key = [
            String(row?.created_by || ""),
            normalizeTextKey(row?.subject),
            String(row?.semester || ""),
          ].join("|");
          if (joinedClassroomKeys.has(key)) return true;
          const subjectMatch = joinedSubjects.has(normalizeTextKey(row?.subject));
          const semester = String(row?.semester || "");
          const semesterMatch = joinedSemesters.size === 0 || joinedSemesters.has(semester);
          return subjectMatch && semesterMatch;
        })
        .filter((row) => row?.due_at)
        .map((row) => ({ ...row, dueMs: new Date(row.due_at).getTime() }))
        .filter((row) => Number.isFinite(row.dueMs) && row.dueMs >= now)
        .sort((a, b) => a.dueMs - b.dueMs);

      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const todayMs = todayDate.getTime();
      const examCount = (Array.isArray(calendarEvents) ? calendarEvents : [])
        .filter((event) => {
          const creatorRole = (event?.creator_role || "").toLowerCase();
          if (!["faculty", "admin"].includes(creatorRole)) return false;
          if (!isExamCalendarEvent(event)) return false;
          const eventMs = new Date(`${event?.date || ""}T00:00:00`).getTime();
          return Number.isFinite(eventMs) && eventMs >= todayMs;
        });
      setUpcomingExamCount(examCount.length);
      setUpcomingExamEvents(examCount);

      setPersonalizedOverview({
        todaySchedule,
        todayEvents,
        roomLiveStatus: roomLiveStatusRes || null,
        upcomingDeadlines,
      });
    } catch (err) {
      setPersonalizedOverview({
        todaySchedule: [],
        todayEvents: [],
        roomLiveStatus: null,
        upcomingDeadlines: [],
      });
      setUpcomingExamCount(0);
      setUpcomingExamEvents([]);
      setJoinedClassrooms([]);
      setCourseEnrollments([]);
    } finally {
      setLoadingPersonalizedOverview(false);
    }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const joinClassroomId = (params.get("joinClassroomId") || "").trim();
      if (joinClassroomId) {
        setPendingJoinClassroomId(joinClassroomId);
        setActivePage("assignments");
      }
    } catch (_) {}

    Promise.all([
      DashboardService.getDashboardData(),
      StudentService.getProfile(),
      StudentService.getSettings(),
    ])
      .then(([dashboardData, profileData, settingsData]) => {
        setData(dashboardData);
        setStudentProfile({
          name: profileData?.name || dashboardData?.user?.name || "",
          profile_image_url: profileData?.profile_image_url || "",
        });
        setStudentSettings(mapSettingsFromApi(settingsData?.settings || {}));
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
    loadDashboardAnnouncements();
    loadPersonalizedOverview();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500">{error}</div>
        <button onClick={onLogout} className="ml-4 text-indigo-600 underline">Logout</button>
      </div>
    );
  }

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "timetable", label: "Timetable" },
    { key: "rooms", label: "Room Availability" },
    { key: "notifications", label: "Notifications" },
    { key: "assignments", label: "Classrooms" },
    { key: "progress", label: "Academic Progress" },
    { key: "queries", label: "Doubts / Queries" },
    { key: "calendar", label: "Calendar" },
    { key: "profile", label: "Profile" },
    { key: "settings", label: "Settings" },
  ];

  const pageTitleMap = {
    dashboard: "Student Dashboard",
    timetable: "Timetable",
    "institute-timetable": "Institute Timetable",
    rooms: "Room Availability",
    notifications: "Notifications",
    assignments: "Classrooms",
    progress: "Academic Progress",
    queries: "Doubts / Queries",
    "attendance-details": "Attendance Details",
    "credits-details": "Credits Details",
    "my-exams": "My Exams",
    calendar: "Calendar",
    profile: "Profile",
    settings: "Settings",
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <StudentOverview
            data={data}
            loading={loading}
            announcements={dashboardAnnouncements}
            loadingAnnouncements={loadingAnnouncements}
            announcementError={announcementError}
            onRefreshAnnouncements={loadDashboardAnnouncements}
            personalizedOverview={personalizedOverview}
            loadingPersonalizedOverview={loadingPersonalizedOverview}
            onOpenNotifications={() => setActivePage("notifications")}
            onOpenExams={() => setActivePage("my-exams")}
            onOpenAttendance={() => setActivePage("attendance-details")}
            onOpenCredits={() => setActivePage("credits-details")}
            upcomingExamCount={upcomingExamCount}
            joinedClassrooms={joinedClassrooms}
            courseEnrollments={courseEnrollments}
            settings={studentSettings}
          />
        );
      case "timetable":
        return <Timetable defaultView="my" />;
      case "institute-timetable":
        return <Timetable defaultView="institute" />;
      case "rooms":
        return <Rooms />;
      case "notifications":
        return <Notifications />;
      case "assignments":
        return (
          <Assignments
            pendingJoinClassroomId={pendingJoinClassroomId}
            onHandledJoinLink={() => {
              setPendingJoinClassroomId(null);
              const params = new URLSearchParams(window.location.search);
              if (params.has("joinClassroomId")) {
                params.delete("joinClassroomId");
                const query = params.toString();
                const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
                window.history.replaceState({}, "", nextUrl);
              }
            }}
          />
        );
      case "progress":
        return (
          <AcademicProgress
            onOpenAttendance={() => setActivePage("attendance-details")}
            onOpenCredits={() => setActivePage("credits-details")}
          />
        );
      case "queries":
        return <Queries />;
      case "my-exams":
        return <ExamSchedule examEvents={upcomingExamEvents} onBack={() => setActivePage("dashboard")} />;
      case "attendance-details":
        return (
          <AttendanceDetails
            joinedClassrooms={joinedClassrooms}
            attendancePercentage={data?.attendance_percentage ?? 0}
            onBack={() => setActivePage("dashboard")}
          />
        );
      case "credits-details":
        return <CreditsDetails enrollments={courseEnrollments} onBack={() => setActivePage("dashboard")} />;
      case "calendar":
        return <CalendarPage />;
      case "profile":
        return (
          <Profile
            onProfileUpdated={(profile) => {
              setStudentProfile({
                name: profile?.name || studentProfile.name || data?.user?.name || "",
                profile_image_url: profile?.profile_image_url || studentProfile.profile_image_url || "",
              });
            }}
          />
        );
      case "settings":
        return <Settings onSettingsUpdated={setStudentSettings} />;
      default:
        return (
          <StudentOverview
            data={data}
            loading={loading}
            announcements={dashboardAnnouncements}
            loadingAnnouncements={loadingAnnouncements}
            announcementError={announcementError}
            onRefreshAnnouncements={loadDashboardAnnouncements}
            personalizedOverview={personalizedOverview}
            loadingPersonalizedOverview={loadingPersonalizedOverview}
            onOpenNotifications={() => setActivePage("notifications")}
            onOpenExams={() => setActivePage("my-exams")}
            onOpenAttendance={() => setActivePage("attendance-details")}
            onOpenCredits={() => setActivePage("credits-details")}
            upcomingExamCount={upcomingExamCount}
            joinedClassrooms={joinedClassrooms}
            courseEnrollments={courseEnrollments}
            settings={studentSettings}
          />
        );
    }
  };

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activePage={activePage}
      onPageChange={setActivePage}
      pageTitle={pageTitleMap[activePage] || "Student Dashboard"}
      userName={studentProfile.name || data?.user?.name}
      userAvatarUrl={studentProfile.profile_image_url}
      onProfileClick={() => setActivePage("profile")}
      onLogout={onLogout}
    >
      <div className="animate-[fadein_0.2s_ease]">{renderContent()}</div>
    </DashboardLayout>
  );
}

export default StudentDashboard;
