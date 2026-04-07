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
import StudentService from "../../services/StudentService";
import PreferenceService from "../../services/PreferenceService";

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
    upcomingDeadlines: [],
  });
  const [loadingPersonalizedOverview, setLoadingPersonalizedOverview] = useState(false);
  const [studentSettings, setStudentSettings] = useState(defaultStudentSettings);

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
      const [myTimetableRes, assignmentsRes] = await Promise.all([
        PreferenceService.getStudentMyTimetable(),
        PreferenceService.getStudentAssignments(),
      ]);

      const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
      const todaySchedule = (myTimetableRes?.timetable || [])
        .filter((slot) => slot.day === today)
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

      const now = Date.now();
      const upcomingDeadlines = (assignmentsRes || [])
        .filter((row) => row?.due_at)
        .map((row) => ({ ...row, dueMs: new Date(row.due_at).getTime() }))
        .filter((row) => Number.isFinite(row.dueMs) && row.dueMs >= now)
        .sort((a, b) => a.dueMs - b.dueMs)
        .slice(0, 4);

      setPersonalizedOverview({
        todaySchedule,
        upcomingDeadlines,
      });
    } catch (err) {
      setPersonalizedOverview({
        todaySchedule: [],
        upcomingDeadlines: [],
      });
    } finally {
      setLoadingPersonalizedOverview(false);
    }
  };

  useEffect(() => {
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
    { key: "institute-timetable", label: "Institute Timetable" },
    { key: "rooms", label: "Room Availability" },
    { key: "notifications", label: "Notifications" },
    { key: "assignments", label: "Assignments" },
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
    assignments: "Assignments",
    progress: "Academic Progress",
    queries: "Doubts / Queries",
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
        return <Assignments />;
      case "progress":
        return <AcademicProgress />;
      case "queries":
        return <Queries />;
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
