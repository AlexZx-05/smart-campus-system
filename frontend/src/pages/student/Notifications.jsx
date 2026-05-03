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

const renderTextWithLinks = (text = "", onLinkClick) => {
  const value = String(text || "");
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const parts = value.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={`lnk-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          onClick={() => onLinkClick?.()}
          className="font-medium text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-800"
        >
          {part}
        </a>
      );
    }
    return <span key={`txt-${index}`}>{part}</span>;
  });
};

function Notifications({ onJoinClassroomRequested }) {
  const [messages, setMessages] = useState([]);
  const [assignmentReminders, setAssignmentReminders] = useState([]);
  const [joinedClassrooms, setJoinedClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [pendingJoinInvite, setPendingJoinInvite] = useState(null);
  const [joiningClassroom, setJoiningClassroom] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

  const loadMessages = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, reminders, joined] = await Promise.all([
        PreferenceService.getInboxMessages(),
        PreferenceService.getStudentAssignmentReminders(),
        PreferenceService.getStudentJoinedClassrooms(),
      ]);
      setMessages(data || []);
      setAssignmentReminders(reminders || []);
      setJoinedClassrooms(joined || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
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

    const inboxItems = (messages || []).map((msg) => {
      if (msg?.kind === "classroom_invite") {
        return {
          id: `msg-${msg.id}`,
          actorName: msg.sender_name || "Faculty",
          actionText: "invited you to a classroom",
          bodyText: msg.body || msg.subject || "",
          createdAt: msg.created_at,
          kind: "classroom_invite",
          typeLabel: "Classroom Invite",
          subject: msg.subject || "",
          classroomId: msg.classroom_id,
          joinLink: msg.join_link || "",
        };
      }
      return {
        id: `msg-${msg.id}`,
        actorName: msg.sender_name || "Admin",
        actionText: "sent an announcement",
        bodyText: msg.body || msg.subject || "",
        createdAt: msg.created_at,
        kind: "admin",
        typeLabel: "Admin Announcement",
        subject: msg.subject || "",
      };
    });

    return [...inboxItems, ...reminderItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [messages, assignmentReminders, nowMs]);

  const counts = useMemo(() => {
    const admin = feedItems.filter((item) => item.kind === "admin").length;
    const teacher = feedItems.filter((item) => item.kind === "teacher" || item.kind === "classroom_invite").length;
    return {
      all: feedItems.length,
      admin,
      teacher,
    };
  }, [feedItems]);

  const visibleItems = useMemo(() => {
    if (activeFilter === "admin") return feedItems.filter((item) => item.kind === "admin");
    if (activeFilter === "teacher") return feedItems.filter((item) => item.kind === "teacher" || item.kind === "classroom_invite");
    return feedItems;
  }, [feedItems, activeFilter]);

  const joinedClassroomIdSet = useMemo(
    () => new Set((joinedClassrooms || []).map((row) => String(row?.id))),
    [joinedClassrooms]
  );

  const confirmJoinClassroom = async () => {
    if (!pendingJoinInvite?.classroomId) return;
    setJoiningClassroom(true);
    setJoinError("");
    setJoinMessage("");
    try {
      const res = await PreferenceService.joinStudentClassroom(pendingJoinInvite.classroomId);
      setJoinMessage(res?.message || "Joined classroom successfully.");
      setPendingJoinInvite(null);
      if (typeof onJoinClassroomRequested === "function") {
        onJoinClassroomRequested(pendingJoinInvite.classroomId);
      }
    } catch (err) {
      setJoinError(err.response?.data?.message || "Failed to join classroom.");
    } finally {
      setJoiningClassroom(false);
    }
  };

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
                              : item.kind === "classroom_invite"
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {item.typeLabel}
                        </span>
                        <span
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-500"
                          title={item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                        >
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 max-w-[1360px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                      <p className="line-clamp-2 break-words text-[13.5px] leading-5.5 text-slate-800">
                        {renderTextWithLinks(item.bodyText, () => {
                          if (item.kind === "classroom_invite" && item.classroomId) {
                            onJoinClassroomRequested?.(item.classroomId);
                          }
                        })}
                      </p>
                    </div>
                    {item.kind === "classroom_invite" && item.classroomId && (
                      <div className="mt-2 flex items-center gap-2">
                        {joinedClassroomIdSet.has(String(item.classroomId)) ? (
                          <button
                            type="button"
                            onClick={() => onJoinClassroomRequested?.(item.classroomId)}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Open Classroom
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setJoinMessage("");
                              setJoinError("");
                              setPendingJoinInvite(item);
                            }}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                          >
                            Join Classroom
                          </button>
                        )}
                        {item.joinLink && (
                          <a
                            href={item.joinLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => onJoinClassroomRequested?.(item.classroomId)}
                            className="text-xs font-medium text-indigo-700 underline-offset-2 hover:underline"
                          >
                            Open Join Link
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {joinMessage && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {joinMessage}
        </div>
      )}
      {joinError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {joinError}
        </div>
      )}

      {pendingJoinInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-semibold text-slate-900">Join Classroom</h4>
            <p className="mt-2 text-sm text-slate-700">
              Do you want to join this classroom now? Once joined, it will appear in your Classrooms section.
            </p>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {pendingJoinInvite.subject || "Classroom Invite"}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingJoinInvite(null)}
                disabled={joiningClassroom}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmJoinClassroom}
                disabled={joiningClassroom}
                className={`rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 ${
                  joiningClassroom ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {joiningClassroom ? "Joining..." : "Join Classroom"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;
