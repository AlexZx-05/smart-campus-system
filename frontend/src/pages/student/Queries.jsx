import { useEffect, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

const defaultForm = {
  subject: "",
  body: "",
  category: "general",
  priority: "normal",
};

function Queries() {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [queries, setQueries] = useState([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const loadQueries = async () => {
    setLoadingQueries(true);
    setError("");
    try {
      const data = await PreferenceService.getMySupportQueries();
      setQueries(data || []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404 || status >= 500) {
        setError("Unable to load queries right now. Please restart backend and refresh this page.");
      } else {
        setError(err.response?.data?.message || "Failed to load your queries.");
      }
    } finally {
      setLoadingQueries(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(""), 1800);
    return () => clearTimeout(timer);
  }, [success]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess("");
    setError("");
    try {
      const res = await PreferenceService.createSupportQuery(form);
      setSuccess(res.message || "Your query has been sent to admin.");
      setForm(defaultForm);
      await loadQueries();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit your query.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusClasses = {
    open: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-lg font-semibold text-slate-800">Contact Admin</h3>
        <p className="text-sm text-slate-500 mt-2">
          Raise an academic or technical query. Admin can review and update the ticket status.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            name="subject"
            value={form.subject}
            onChange={handleFormChange}
            placeholder="Subject"
            className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2.5"
            required
          />
          <select
            name="category"
            value={form.category}
            onChange={handleFormChange}
            className="rounded-lg border border-slate-300 px-3 py-2.5"
          >
            <option value="general">General</option>
            <option value="academic">Academic</option>
            <option value="technical">Technical</option>
            <option value="administrative">Administrative</option>
          </select>
          <select
            name="priority"
            value={form.priority}
            onChange={handleFormChange}
            className="rounded-lg border border-slate-300 px-3 py-2.5"
          >
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
          </select>
          <textarea
            name="body"
            rows={4}
            value={form.body}
            onChange={handleFormChange}
            placeholder="Describe your query clearly..."
            className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2.5"
            required
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Query"}
            </button>
          </div>
        </form>

        {success && (
          <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-base font-semibold text-slate-800">My Query History</h4>
          <button
            type="button"
            onClick={loadQueries}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loadingQueries ? (
          <p className="text-sm text-slate-500 mt-4">Loading your queries...</p>
        ) : queries.length === 0 ? (
          <p className="text-sm text-slate-500 mt-4">No queries submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {queries.map((query) => (
              <div key={query.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{query.subject}</p>
                  <span className={`text-xs rounded-full px-2.5 py-1 border ${statusClasses[query.status] || statusClasses.open}`}>
                    {query.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {query.category} | {query.priority} priority | {new Date(query.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{query.body}</p>
                {query.admin_note && (
                  <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Admin Note</p>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{query.admin_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Queries;
