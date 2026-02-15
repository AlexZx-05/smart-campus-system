function TopNavbar({ title, userName, userAvatarUrl, onLogout }) {
  const initials = (userName || "User")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search..."
          className="hidden md:block w-56 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        />
        <div className="flex items-center gap-2">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={`${userName || "User"} profile`}
              className="h-8 w-8 rounded-full object-cover border border-slate-300"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center">
              {initials}
            </div>
          )}
          <div className="text-sm text-slate-600">Hi, {userName || "Student"}</div>
        </div>
        <button
          onClick={onLogout}
          className="px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default TopNavbar;
