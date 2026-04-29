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

function TimetableIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 4v4M16 4v4M8 13h3M13 13h3M8 17h3M13 17h3" />
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

function ClassesIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <path d="M7 4v16M17 4v16" />
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

function PreferenceIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
      <path d="M9 3h6v3H9z" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 6.5c-1.5-1.4-3.4-2.1-5.8-2.1C4.4 4.4 3 4.8 3 4.8V19s1.4-.5 3.2-.5c2.4 0 4.3.7 5.8 2.1" />
      <path d="M12 6.5c1.5-1.4 3.4-2.1 5.8-2.1 1.8 0 3.2.4 3.2.4V19s-1.4-.5-3.2-.5c-2.4 0-4.3.7-5.8 2.1" />
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
      <path d="M10.4 2.9h3.2l.5 2.2c.5.2 1 .4 1.5.8l2.1-1 2.3 2.3-1 2.1c.3.5.6 1 .8 1.5l2.2.5v3.2l-2.2.5c-.2.5-.4 1-.8 1.5l1 2.1-2.3 2.3-2.1-1c-.5.3-1 .6-1.5.8l-.5 2.2h-3.2l-.5-2.2c-.5-.2-1-.4-1.5-.8l-2.1 1-2.3-2.3 1-2.1a8.4 8.4 0 0 1-.8-1.5l-2.2-.5v-3.2l2.2-.5c.2-.5.4-1 .8-1.5l-1-2.1 2.3-2.3 2.1 1c.5-.3 1-.6 1.5-.8l.5-2.2Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3.2" />
      <path d="M22 20a3.5 3.5 0 0 0-3-3.5" />
      <path d="M2 20a3.5 3.5 0 0 1 3-3.5" />
      <path d="M18.5 8.8a2.5 2.5 0 1 0-1.4-4.8" />
      <path d="M5.5 8.8a2.5 2.5 0 1 1 1.4-4.8" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-5 3v-3.5A2.5 2.5 0 0 1 4 14V6.5Z" />
      <path d="M7.5 8.5h9M7.5 12h6" />
    </svg>
  );
}

function ConflictIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 3.7 18a1.5 1.5 0 0 0 1.3 2.2h14a1.5 1.5 0 0 0 1.3-2.2L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  );
}

const icons = {
  dashboard: DashboardIcon,
  preferences: PreferenceIcon,
  timetable: TimetableIcon,
  "institute-timetable": CalendarIcon,
  "my-timetable": TimetableIcon,
  "all-classes": ClassesIcon,
  rooms: BuildingIcon,
  users: UsersIcon,
  messages: MessageIcon,
  conflicts: ConflictIcon,
  notifications: BellIcon,
  assignments: BookOpenIcon,
  progress: ChartIcon,
  queries: ChatIcon,
  teachers: UsersIcon,
  calendar: CalendarIcon,
  calender: CalendarIcon,
  "calendar-control": CalendarIcon,
  profile: UserIcon,
  settings: SettingsIcon,
};

function Sidebar({
  items,
  activePage,
  onPageChange,
  portalLabel = "Student ERP Portal",
  isOpen,
  onToggle,
}) {
  return (
    <aside
      className={`h-screen bg-slate-950 text-slate-200 px-2.5 py-2 md:px-3 md:py-2.5 shrink-0 overflow-hidden border-r border-slate-800 transition-all duration-300 flex flex-col ${
        isOpen ? "w-[272px]" : "w-[84px]"
      }`}
    >
      <div className={`px-1 py-1 ${isOpen ? "" : "flex flex-col items-center"}`}>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-colors ${
            isOpen ? "" : "mb-2"
          }`}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {isOpen ? (
          <div className="mt-2">
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Smart Campus</h2>
            <p className="text-xs text-slate-400 mt-1 tracking-wide">{portalLabel}</p>
          </div>
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      <nav className="scrollbar-hidden mt-2 flex-1 min-h-0 overflow-y-auto pr-0.5">
        {items.map((item) => {
          const Icon = icons[item.key] || DashboardIcon;
          const isActive = activePage === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onPageChange(item.key)}
              title={!isOpen ? item.label : undefined}
              className={`group w-full flex items-center rounded-xl text-[15px] transition-all ${
                isActive
                  ? "bg-slate-800 border border-slate-700 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              } ${isOpen ? "mb-1.5" : "mb-3.5"}`}
            >
              <span className={`inline-flex items-center ${isOpen ? "h-10 w-10 ml-1 justify-center" : "h-11 w-full justify-center"}`}>
                <Icon />
              </span>
              {isOpen && <span className="pr-3 truncate font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!isOpen && <div className="hidden md:block h-2" />}
    </aside>
  );
}

export default Sidebar;
