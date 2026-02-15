const iconClass = "h-5 w-5 flex-shrink-0";

function DashboardIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-10h8V3h-8v8Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 2v4M8 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 0 1 10 0v3.2a2 2 0 0 0 .6 1.4L19 17h-4Z" />
      <path d="M9 19a3 3 0 0 0 6 0" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 4h6l1 2h3v14H5V6h3l1-2Z" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3v18h18" />
      <path d="M8 16V9M12 16V6M16 16v-4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 9h10M7 13h6" />
      <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="m19.4 15 .6 1.1-1.8 3.1-1.3-.2a7.9 7.9 0 0 1-1.4.8l-.4 1.2h-3.6l-.4-1.2a7.9 7.9 0 0 1-1.4-.8l-1.3.2L4 16.1 4.6 15a8.4 8.4 0 0 1 0-1.9L4 12l1.8-3.1 1.3.2c.4-.3.9-.6 1.4-.8l.4-1.2h3.6l.4 1.2c.5.2 1 .5 1.4.8l1.3-.2L20 12l-.6 1.1a8.4 8.4 0 0 1 0 1.9Z" />
    </svg>
  );
}

const icons = {
  dashboard: DashboardIcon,
  timetable: CalendarIcon,
  rooms: BuildingIcon,
  notifications: BellIcon,
  assignments: ClipboardIcon,
  progress: ChartIcon,
  queries: ChatIcon,
  calendar: CalendarIcon,
  profile: UserIcon,
  settings: SettingsIcon,
};

function Sidebar({ items, activePage, onPageChange, portalLabel = "Student ERP Portal" }) {
  return (
    <aside className="w-[250px] h-screen bg-slate-950 text-slate-200 p-4 hidden md:block shrink-0 overflow-y-auto">
      <div className="px-2 py-4">
        <h2 className="text-xl font-bold">Smart Campus</h2>
        <p className="text-xs text-slate-400 mt-1">{portalLabel}</p>
      </div>

      <nav className="mt-3 space-y-1">
        {items.map((item) => {
          const Icon = icons[item.key] || DashboardIcon;
          const isActive = activePage === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onPageChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
