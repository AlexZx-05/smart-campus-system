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

function StudentDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    DashboardService.getDashboardData()
      .then(setData)
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
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
        return <StudentOverview data={data} loading={loading} />;
      case "timetable":
        return <Timetable />;
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
        return <Profile />;
      case "settings":
        return <Settings />;
      default:
        return <StudentOverview data={data} loading={loading} />;
    }
  };

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activePage={activePage}
      onPageChange={setActivePage}
      pageTitle={pageTitleMap[activePage] || "Student Dashboard"}
      userName={data?.user?.name}
      onLogout={onLogout}
    >
      <div className="animate-[fadein_0.2s_ease]">{renderContent()}</div>
    </DashboardLayout>
  );
}

export default StudentDashboard;
