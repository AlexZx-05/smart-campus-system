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
  onLogout,
  children,
}) {
  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePage={activePage}
        onPageChange={onPageChange}
        portalLabel={portalLabel}
      />

      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        <TopNavbar
          title={pageTitle}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
