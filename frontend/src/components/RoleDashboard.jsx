function RoleDashboard({ title, subtitle, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">{title}</h1>
        <button
          onClick={onLogout}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
        >
          Logout
        </button>
      </nav>
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500 mt-2">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default RoleDashboard;
