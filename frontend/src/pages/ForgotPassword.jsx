import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetToken("");

    try {
      const res = await API.post("/forgot-password", { email });
      setMessage(res.data.message || "Reset token generated.");
      setResetToken(res.data.reset_token || "");
    } catch (err) {
      const msg = err.response?.data?.message || "Unable to process request.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password</h1>
        <p className="text-gray-500 mb-6">Enter your account email to generate a reset token.</p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">{error}</div>
        )}

        {message && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
            <p>{message}</p>
            {resetToken && (
              <p className="mt-2">
                Token: <span className="font-semibold break-all">{resetToken}</span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Generating..." : "Generate Reset Token"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Have a token already?{" "}
          <Link to="/reset-password" className="text-amber-700 hover:text-amber-800 font-medium">
            Reset password
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
