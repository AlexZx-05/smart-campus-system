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
    <div className="min-h-screen bg-slate-200 flex items-center justify-center px-4 sm:px-6 py-6">
      <div className="w-full max-w-6xl grid md:grid-cols-2 rounded-3xl shadow-2xl overflow-hidden bg-white">

        {/* LEFT PANEL - BRAND */}
        <div className="flex flex-col justify-between p-8 sm:p-10 lg:p-12 text-white relative min-h-[420px] md:min-h-full bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.3),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.24),transparent_50%)]" />
          <img
            src={loginCampusBg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-screen pointer-events-none"
          />
          <div className="relative z-10">
            <p className="inline-flex items-center rounded-full border border-sky-300/50 bg-sky-300/15 px-4 py-1.5 uppercase tracking-[0.28em] text-sky-100 text-xs font-semibold">
              Smart Campus ERP
            </p>

            <h1 className="text-4xl xl:text-[2.6rem] font-semibold mt-8 leading-tight max-w-lg">
              Run your institution from one control center.
            </h1>

            <p className="mt-5 text-slate-100 text-[1.02rem] leading-relaxed max-w-lg">
              Attendance, assignments, notices, and student data in one secure
              ERP workspace for administrators, faculty, and learners.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
              <div className="rounded-2xl border border-white/20 bg-slate-900/35 backdrop-blur-md p-4">
                <p className="text-sky-200 text-lg font-semibold">99.9%</p>
                <p className="mt-1 text-xs text-slate-100/90">Platform uptime</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/35 backdrop-blur-md p-4">
                <p className="text-sky-200 text-lg font-semibold">24/7</p>
                <p className="mt-1 text-xs text-slate-100/90">Portal access</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/35 backdrop-blur-md p-4">
                <p className="text-sky-200 text-lg font-semibold">Role-based</p>
                <p className="mt-1 text-xs text-slate-100/90">Secure login</p>
              </div>
            </div>

            <div className="mt-10 max-w-lg rounded-2xl border border-sky-100/25 bg-slate-900/60 px-5 py-4">
              <p className="text-sm text-slate-100 leading-relaxed">
                "This ERP reduced administrative follow-ups and gave us real-time
                visibility across departments."
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-sky-200">
                Registrar Office
              </p>
            </div>
          </div>

          <div className="text-sm text-slate-200 relative z-10 mt-8">
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
