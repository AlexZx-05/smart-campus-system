function ExamSchedule({ examEvents = [], onBack }) {
  const sortedExams = [...examEvents].sort((a, b) => {
    const aMs = new Date(`${a?.date || ""}T00:00:00`).getTime();
    const bMs = new Date(`${b?.date || ""}T00:00:00`).getTime();
    return aMs - bMs;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-lime-100 bg-gradient-to-br from-white via-lime-50/50 to-emerald-50/40 p-5 shadow-[0_8px_24px_-20px_rgba(101,163,13,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">My Upcoming Exams</h3>
            <p className="mt-1 text-sm text-slate-600">All exam entries marked by faculty/admin in calendar.</p>
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
        {sortedExams.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming exams found.</p>
        ) : (
          <div className="space-y-3">
            {sortedExams.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{event.title || "Exam"}</p>
                  <span className="rounded-full border border-lime-200 bg-lime-50 px-2 py-0.5 text-[11px] font-medium text-lime-700">
                    {new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  By {event.creator_name || "Faculty"} ({event.creator_role || "faculty"})
                </p>
                {event.description ? <p className="mt-2 text-sm text-slate-700">{event.description}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamSchedule;
