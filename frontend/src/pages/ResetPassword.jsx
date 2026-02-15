import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const tokenFromQuery = useMemo(
    () => new URLSearchParams(location.search).get("token") || "",
    [location.search]
  );

  const [token, setToken] = useState(tokenFromQuery);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/reset-password", {
        token,
        new_password: newPassword,
      });
      setSuccess(res.data.message || "Password reset successful.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h1>
        <p className="text-gray-500 mb-6">Enter the reset token and your new password.</p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">{error}</div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reset Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste reset token"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Back to{" "}
          <Link to="/login" className="text-pink-700 hover:text-pink-800 font-medium">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
