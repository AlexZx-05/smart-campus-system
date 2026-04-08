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
      actionText: `Assignment reminder in ${item.subject || "your course"}`,
      bodyText: `${item.title} is due ${new Date(item.due_at).toLocaleString()}.`,
      createdAt: item.due_at,
      kind: "reminder",
    }));

    const inboxItems = (messages || []).map((msg) => ({
      id: `msg-${msg.id}`,
      actorName: msg.sender_name || "Admin",
      actionText: "sent an announcement",
      bodyText: msg.body || msg.subject || "",
      createdAt: msg.created_at,
      kind: "message",
      subject: msg.subject || "",
    }));

    return [...inboxItems, ...reminderItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [messages, assignmentReminders]);

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Notifications</h3>
            <p className="mt-1 text-sm text-slate-500">Real-time updates, reminders, and institute announcements.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Total: {feedItems.length}
            </span>
            <button
              type="button"
              onClick={loadMessages}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading notifications...</p>
        ) : error ? (
          <div className="m-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : feedItems.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {feedItems.map((item, index) => (
              <article key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/70">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                    avatarPalette[index % avatarPalette.length]
                  } text-sm font-semibold text-white`}
                >
                  {initialsFrom(item.actorName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-cyan-600">{item.actorName}</p>
                      <p className="truncate text-sm text-slate-400">
                        {item.subject ? `${item.subject} · ` : ""}
                        {item.actionText}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium italic text-slate-400">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-base leading-6 text-slate-700">{item.bodyText}</p>
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
