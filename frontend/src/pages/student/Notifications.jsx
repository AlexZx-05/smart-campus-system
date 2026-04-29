import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

const avatarPalette = [
  "from-cyan-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-400 to-pink-600",
  "from-orange-400 to-rose-600",
  "from-violet-400 to-indigo-600",
];

const initialsFrom = (name = "") =>
  name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "N";

const timeAgo = (iso) => {
  const value = new Date(iso).getTime();
  if (Number.isNaN(value)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

function Notifications() {
  const [messages, setMessages] = useState([]);
  const [assignmentReminders, setAssignmentReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const loadMessages = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, reminders] = await Promise.all([
        PreferenceService.getInboxMessages(),
        PreferenceService.getStudentAssignmentReminders(),
      ]);
      setMessages(data || []);
      setAssignmentReminders(reminders || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const feedItems = useMemo(() => {
    const reminderItems = (assignmentReminders || []).map((item) => ({
      id: `rem-${item.id}`,
      actorName: item.created_by_name || "Faculty",
      actionText: `${item.subject || "Teacher update"} | sent a reminder`,
      bodyText: `${item.title} is due ${new Date(item.due_at).toLocaleString()}.`,
      createdAt: item.due_at,
      kind: "teacher",
      typeLabel: "Teacher Message",
    }));

    const inboxItems = (messages || []).map((msg) => ({
      id: `msg-${msg.id}`,
      actorName: msg.sender_name || "Admin",
      actionText: "sent an announcement",
      bodyText: msg.body || msg.subject || "",
      createdAt: msg.created_at,
      kind: "admin",
      typeLabel: "Admin Announcement",
      subject: msg.subject || "",
    }));

    return [...inboxItems, ...reminderItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [messages, assignmentReminders]);

  const counts = useMemo(() => {
    const admin = feedItems.filter((item) => item.kind === "admin").length;
    const teacher = feedItems.filter((item) => item.kind === "teacher").length;
    return {
      all: feedItems.length,
      admin,
      teacher,
    };
  }, [feedItems]);

  const visibleItems = useMemo(() => {
    if (activeFilter === "admin") return feedItems.filter((item) => item.kind === "admin");
    if (activeFilter === "teacher") return feedItems.filter((item) => item.kind === "teacher");
    return feedItems;
  }, [feedItems, activeFilter]);

  return (
    <div className="w-full space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="currentColor" aria-hidden="true">
                <path d="M12 2a6 6 0 0 0-6 6v2.35c0 .78-.3 1.52-.84 2.08l-1.08 1.12A1 1 0 0 0 4.8 15h14.4a1 1 0 0 0 .72-1.69l-1.08-1.12A3 3 0 0 1 18 10.35V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.83-2H9.17A3 3 0 0 0 12 22Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-xl">Notifications</h3>
              <p className="mt-0.5 text-[14px] text-slate-600">Real-time updates from admin announcements and teacher messages.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              Total: {counts.all}
            </span>
            <div className="flex items-center gap-1 rounded-2xl border border-slate-300 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-xl px-3 py-1 text-sm transition ${
                  activeFilter === "all" ? "bg-slate-900 font-semibold text-white" : "text-slate-700 hover:bg-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("admin")}
                className={`rounded-xl px-3 py-1 text-sm transition ${
                  activeFilter === "admin" ? "bg-slate-900 font-semibold text-white" : "text-slate-700 hover:bg-white"
                }`}
              >
                Admin ({counts.admin})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("teacher")}
                className={`rounded-xl px-3 py-1 text-sm transition ${
                  activeFilter === "teacher" ? "bg-slate-900 font-semibold text-white" : "text-slate-700 hover:bg-white"
                }`}
              >
                Teacher ({counts.teacher})
              </button>
            </div>
            <button
              type="button"
              onClick={loadMessages}
              className="rounded-2xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Refresh notifications"
              title="Refresh notifications"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                <path d="M20 4v6h-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading notifications...</p>
        ) : error ? (
          <div className="m-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : visibleItems.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <div className="p-3">
            {visibleItems.map((item, index) => (
              <article key={item.id} className="mb-1 p-1.5 last:mb-0">
                <div className="flex items-start gap-2">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br shadow-sm ${
                      avatarPalette[index % avatarPalette.length]
                    } text-[17px] font-semibold text-white`}
                  >
                    {initialsFrom(item.actorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[1.2rem] leading-none font-semibold text-slate-900 md:text-[15px]">{item.actorName}</p>
                        <p className="truncate text-[13px] text-slate-600">
                          {item.subject ? `${item.subject} | ` : ""}
                          {item.actionText}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
                            item.kind === "admin"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {item.typeLabel}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-500">{timeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="mt-1 max-w-[1360px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                      <p className="line-clamp-2 text-[13.5px] leading-5.5 text-slate-800">{item.bodyText}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
