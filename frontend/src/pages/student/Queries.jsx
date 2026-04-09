import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

const defaultForm = {
  subject: "",
  body: "",
  category: "general",
  priority: "normal",
  attachment: null,
};

const statusClasses = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-700 border-slate-300",
};

const statusAccentClasses = {
  open: "border-l-amber-400",
  in_progress: "border-l-blue-400",
  resolved: "border-l-emerald-400",
  closed: "border-l-slate-400",
};

const labelMap = {
  general: "General",
  academic: "Academic",
  technical: "Technical",
  administrative: "Administrative",
  low: "Low",
  normal: "Normal",
  high: "High",
};

const formatStatus = (status = "open") => status.replace("_", " ");

function QueryAttachmentPreview({ query }) {
  if (!query?.attachment_url) return null;
  const isImage = (query.attachment_mime || "").startsWith("image/");

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-white p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Attachment</p>
      {isImage && (
        <a href={query.attachment_url} target="_blank" rel="noreferrer">
          <img
            src={query.attachment_url}
            alt={query.attachment_name || "query attachment"}
            className="mt-2 max-h-40 w-auto rounded-md border border-slate-200 object-cover"
          />
        </a>
      )}
      <a
        href={query.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-xs font-medium text-blue-700 hover:text-blue-800"
      >
        Open {query.attachment_name || "attachment"}
      </a>
    </div>
  );
}

function Queries() {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [queries, setQueries] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");

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
    const timer = setTimeout(() => setSuccess(""), 2200);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 3200);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!form.attachment) {
      setAttachmentPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(form.attachment);
    setAttachmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.attachment]);

  const repliedQueries = useMemo(
    () =>
      queries
        .filter((query) => (query.admin_note || "").trim().length > 0)
        .sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        }),
    [queries]
  );

  const openCount = useMemo(
    () => queries.filter((query) => query.status === "open" || query.status === "in_progress").length,
    [queries]
  );
  const resolvedCount = useMemo(
    () => queries.filter((query) => query.status === "resolved" || query.status === "closed").length,
    [queries]
  );
  const filteredHistoryQueries = useMemo(() => {
    const keyword = historySearch.trim().toLowerCase();
    return queries.filter((query) => {
      if (historyStatusFilter !== "all" && query.status !== historyStatusFilter) return false;
      if (!keyword) return true;
      const searchableText = [
        query.subject,
        query.body,
        query.admin_note,
        labelMap[query.category] || query.category,
        labelMap[query.priority] || query.priority,
        formatStatus(query.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [queries, historySearch, historyStatusFilter]);

  const handleFormChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === "file") {
      const file = files?.[0] || null;
      setForm((prev) => ({ ...prev, attachment: file }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess("");
    setError("");
    try {
      let payload;
      if (form.attachment) {
        payload = new FormData();
        payload.append("subject", form.subject);
        payload.append("body", form.body);
        payload.append("category", form.category);
        payload.append("priority", form.priority);
        payload.append("attachment", form.attachment);
      } else {
        payload = {
          subject: form.subject,
          body: form.body,
          category: form.category,
          priority: form.priority,
        };
      }

      const res = await PreferenceService.createSupportQuery(payload);
      setSuccess(res.message || "Your query has been sent to admin.");
      setForm(defaultForm);
      await loadQueries();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit your query.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {(success || error) && (
        <div className="space-y-2">
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8 xl:h-[540px]">
          <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Contact Admin</h3>
              <p className="mt-1 text-sm text-slate-500">Raise a ticket and track admin response.</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                Open: {openCount}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                Closed: {resolvedCount}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Subject</label>
              <input
                name="subject"
                value={form.subject}
                onChange={handleFormChange}
                placeholder="Short summary of your issue"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="technical">Technical</option>
                <option value="administrative">Administrative</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Details</label>
              <textarea
                name="body"
                rows={4}
                value={form.body}
                onChange={handleFormChange}
                placeholder="Describe your query clearly with relevant details."
                className="h-28 w-full resize-none overflow-y-auto rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">Screenshot (Optional)</label>
              <input
                id="query-attachment-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFormChange}
                className="hidden"
              />
              <label
                htmlFor="query-attachment-input"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <rect x="4" y="18" width="16" height="3" rx="1.5" />
                </svg>
                <span>{form.attachment ? "Change screenshot" : "Upload screenshot"}</span>
              </label>
              <p className="mt-1 text-xs text-slate-500">PNG/JPG/WEBP up to 5MB</p>
              {form.attachment && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-700">
                      Selected: <span className="font-medium">{form.attachment.name}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, attachment: null }))}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  </div>
                  {attachmentPreviewUrl && (
                    <img
                      src={attachmentPreviewUrl}
                      alt="Attachment preview"
                      className="mt-2 max-h-44 w-auto rounded-md border border-slate-200 object-cover"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-2 -mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Query"}
              </button>
            </div>
          </form>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4 xl:h-[540px]">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-800">My Query Replies</h4>
                <p className="mt-1 text-xs text-slate-500">Latest admin responses on your tickets.</p>
              </div>
              <button
                type="button"
                onClick={loadQueries}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
              {loadingQueries ? (
                <p className="text-sm text-slate-500">Loading replies...</p>
              ) : repliedQueries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>No replies yet</span>
                  </div>
                </div>
              ) : (
                repliedQueries.map((query) => (
                  <div
                    key={`reply-${query.id}`}
                    className={`rounded-lg border border-slate-200 border-l-4 bg-slate-50 p-3 ${
                      statusAccentClasses[query.status] || statusAccentClasses.open
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{query.subject}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          statusClasses[query.status] || statusClasses.open
                        }`}
                      >
                        {formatStatus(query.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {new Date(query.updated_at || query.created_at).toLocaleString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{query.admin_note}</p>
                    <QueryAttachmentPreview query={query} />
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-800">My Query History</h4>
            <p className="mt-1 text-xs text-slate-500">Complete timeline of all submitted queries.</p>
          </div>
          <button
            type="button"
            onClick={loadQueries}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {!loadingQueries && queries.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by subject, query text, admin note, category, priority..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="sm:col-span-1">
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setHistorySearch("");
                  setHistoryStatusFilter("all");
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {loadingQueries ? (
          <p className="mt-4 text-sm text-slate-500">Loading your queries...</p>
        ) : queries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No queries submitted yet.</p>
        ) : filteredHistoryQueries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No queries match your search/filter.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredHistoryQueries.map((query) => (
              <div
                key={query.id}
                className={`rounded-lg border border-slate-200 border-l-4 p-4 ${
                  statusAccentClasses[query.status] || statusAccentClasses.open
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{query.subject}</p>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      statusClasses[query.status] || statusClasses.open
                    }`}
                  >
                    {formatStatus(query.status)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{labelMap[query.category] || query.category}</span>
                  <span>&bull;</span>
                  <span>{labelMap[query.priority] || query.priority} priority</span>
                  <span>&bull;</span>
                  <span>{new Date(query.created_at).toLocaleString()}</span>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{query.body}</p>
                <QueryAttachmentPreview query={query} />

                {query.admin_note && (
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Admin Note</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{query.admin_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Queries;
