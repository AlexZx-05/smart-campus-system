function TopNavbar({ title, userName, userAvatarUrl, onLogout, theme, onThemeToggle, onProfileClick }) {
  const nameParts = (userName || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = nameParts[0] || "Student";
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0] || ""}${nameParts[1][0] || ""}`.toUpperCase()
    : (nameParts[0] || "U").slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search..."
          className="hidden lg:block w-56 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-none transition-colors"
        />
        <button
          type="button"
          onClick={onThemeToggle}
          className="inline-flex items-center gap-2 h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2.2M12 19.8V22M22 12h-2.2M4.2 12H2M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6M19.1 19.1l-1.6-1.6M6.5 6.5 4.9 4.9" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 1 0 11.5 11.5Z" />
            </svg>
          )}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
        <button
          type="button"
          onClick={onProfileClick}
          className="hidden sm:flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Open profile"
        >
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={`${userName || "User"} profile`}
              className="h-8 w-8 rounded-full object-cover border border-slate-300 dark:border-slate-700"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center">
              {initials}
            </div>
          )}
          <div className="text-sm text-slate-600 dark:text-slate-300">Hi, {firstName}</div>
        </button>
        <button
          onClick={onLogout}
          className="px-3 py-2 text-sm rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default TopNavbar;
