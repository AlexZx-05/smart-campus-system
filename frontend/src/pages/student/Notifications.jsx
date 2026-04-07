import { useEffect, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Notifications</h3>
          <p className="text-sm text-slate-500 mt-2">Assignment reminders and admin announcements for students.</p>
        </div>
        <button
          type="button"
          onClick={loadMessages}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 mt-4">Loading notifications...</p>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : messages.length === 0 ? (
        <div className="mt-4 space-y-3">
          {assignmentReminders.length > 0 ? (
            assignmentReminders.map((item) => (
              <div key={`reminder-${item.id}`} className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-amber-800">Assignment Reminder: {item.title}</p>
                  <span className="text-xs rounded-full px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200">
                    reminder
                  </span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Subject: {item.subject} | Due: {new Date(item.due_at).toLocaleString()} | By {item.created_by_name}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {assignmentReminders.map((item) => (
            <div key={`reminder-${item.id}`} className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-amber-800">Assignment Reminder: {item.title}</p>
                <span className="text-xs rounded-full px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200">
                  reminder
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Subject: {item.subject} | Due: {new Date(item.due_at).toLocaleString()} | By {item.created_by_name}
              </p>
            </div>
          ))}
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{msg.subject}</p>
                <span className="text-xs rounded-full px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200">
                  {msg.recipient_role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                By {msg.sender_name} | {new Date(msg.created_at).toLocaleString()}
              </p>
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
