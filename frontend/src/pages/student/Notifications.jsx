import { useEffect, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

function Notifications() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMessages = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await PreferenceService.getInboxMessages();
      setMessages(data || []);
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
          <p className="text-sm text-slate-500 mt-2">Admin announcements for students.</p>
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
        <p className="text-sm text-slate-500 mt-4">No notifications yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
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
