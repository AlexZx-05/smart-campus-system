import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [devToken, setDevToken] = useState("");
  const [noticeType, setNoticeType] = useState("success");

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => {
      setMessage("");
      setSentTo("");
      setDevToken("");
      setNoticeType("success");
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setSentTo("");
    setDevToken("");
    setNoticeType("success");

    try {
      const res = await API.post("/forgot-password", { email });
      if (res.data?.delivery_mode === "dev_token" && res.data?.reset_token) {
        setMessage(res.data.message || "Development reset token generated.");
        setSentTo(res.data.recipient || "");
        setDevToken(res.data.reset_token);
        setNoticeType("dev");
      } else if (res.data?.email_sent === false) {
        setError(res.data.message || "Reset email could not be sent.");
        setSentTo("");
      } else {
        setMessage(res.data.message || "Reset token sent to your email.");
        setSentTo(res.data.recipient || "");
        setNoticeType("success");
      }
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.request ? "Backend service is not reachable. Start backend on http://127.0.0.1:5001 and try again." : "Unable to process request.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 px-4 py-10 sm:py-16">
      <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl" />

      <div className="mx-auto w-full max-w-lg rounded-2xl border border-orange-100 bg-white/95 p-8 shadow-[0_20px_60px_-30px_rgba(180,83,9,0.45)] backdrop-blur">
        <div className="mb-6 flex items-start gap-4">
          <div className="mt-1 rounded-xl bg-orange-100 p-3 text-orange-700">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V8a4 4 0 1 1 8 0v2" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Forgot Password</h1>
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              Enter your account email to receive a secure reset token in your inbox.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Security note</p>
          <p className="mt-1 text-sm text-slate-600">
            In production, the token is sent only to the registered email and is not displayed on screen.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {message && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              noticeType === "dev"
                ? "border border-amber-200 bg-amber-50 text-amber-800"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <p>{message}</p>
            {sentTo && (
              <p className="mt-1 font-medium">
                {noticeType === "dev" ? `Account: ${sentTo}` : `Mail delivered to: ${sentTo}`}
              </p>
            )}
            {devToken && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-amber-900">
                <p className="text-xs font-semibold uppercase tracking-wide">Development Reset Token</p>
                <p className="mt-1 font-mono text-sm break-all">{devToken}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3.5 text-base font-bold text-white transition hover:from-amber-700 hover:to-orange-700 ${loading ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {loading ? "Sending..." : "Send Reset Token"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Have a token already?{" "}
          <Link to="/reset-password" className="font-semibold text-orange-700 hover:text-orange-800">
            Reset password
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
