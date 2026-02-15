import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import loginCampusBg from "../assets/login-campus-bg.svg";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/login", {
        email: email.trim(),
        password,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", res.data.role);

      onLoginSuccess(res.data.role);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to sign in. Please check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center px-6">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 rounded-3xl shadow-2xl overflow-hidden bg-white">

        {/* LEFT PANEL - BRAND */}
        <div
          className="hidden lg:flex flex-col justify-between p-12 text-white relative"
          style={{
            backgroundImage: `
              radial-gradient(900px 500px at 8% -5%, rgba(56,189,248,0.18), transparent 58%),
              radial-gradient(700px 380px at 95% 105%, rgba(37,99,235,0.22), transparent 56%),
              linear-gradient(145deg, rgba(2,12,35,0.96), rgba(8,35,86,0.96)),
              url(${loginCampusBg})
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div>
            <p className="uppercase tracking-[0.28em] text-cyan-200 text-xs font-semibold">
              Smart Campus ERP
            </p>

            <h1 className="text-4xl font-semibold mt-8 leading-tight">
              Unified Academic Platform
            </h1>

            <p className="mt-6 text-slate-200/95 text-base leading-relaxed max-w-md">
              Manage attendance, assignments, schedules, and academic
              communication securely from one centralized dashboard.
            </p>

          </div>

          <div className="text-sm text-slate-300/95">
            © {new Date().getFullYear()} Smart Campus ERP
          </div>
        </div>

        {/* RIGHT PANEL - FORM */}
        <div className="p-8 md:p-12 lg:p-16 bg-white flex flex-col justify-center">

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              Sign in to your account
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Use your institutional credentials to continue.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <input
                type="email"
                placeholder="student@university.edu"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-600 hover:text-slate-900 font-medium"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 transition shadow-md ${
                loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-sm text-center text-slate-600">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="text-blue-700 hover:text-blue-800 font-semibold"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
