import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import TopNavbar from "../components/TopNavbar";

function DashboardLayout({
  sidebarItems,
  activePage,
  onPageChange,
  pageTitle,
  portalLabel,
  userName,
  userAvatarUrl,
  onProfileClick,
  onLogout,
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const stored = localStorage.getItem("erp_theme");
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = stored === "dark" || stored === "light" ? stored : preferredDark ? "dark" : "light";
    setTheme(resolvedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("erp_theme", theme);
  }, [theme]);

  return (
    <div className="h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex overflow-hidden transition-colors">
      <Sidebar
        items={sidebarItems}
        activePage={activePage}
        onPageChange={onPageChange}
        portalLabel={portalLabel}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        <TopNavbar
          title={pageTitle}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          onProfileClick={onProfileClick}
          theme={theme}
          onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
