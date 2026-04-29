function AttendanceDetails({ joinedClassrooms = [], attendancePercentage = 0, onBack }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/45 to-teal-50/45 p-5 shadow-[0_8px_24px_-20px_rgba(5,150,105,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Attendance by Joined Classroom</h3>
            <p className="mt-1 text-sm text-slate-600">Classroom-wise attendance details with faculty information.</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {joinedClassrooms.length === 0 ? (
          <p className="text-sm text-slate-500">You have not joined any classroom yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-emerald-100">
            <table className="min-w-full">
              <thead className="bg-emerald-50/60">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Classroom</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Subject</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Faculty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {joinedClassrooms.map((room) => (
                  <tr key={room.id} className="border-t border-emerald-100">
                    <td className="px-3 py-2 text-sm text-slate-800">{room.title || room.subject || "Classroom"}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{room.subject || "-"}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{room.faculty_name || "Faculty"}</td>
                    <td className="px-3 py-2 text-sm font-medium text-emerald-700">{attendancePercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceDetails;
