import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import loginCampusBg from "../assets/login-campus-bg.svg";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: "",
    role: "student",
    roll_number: "",
    department: "",
    year: "",
    section: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const toFriendlyError = (err) => {
    const raw =
      err?.response?.data?.message ||
      (err?.response?.status === 404
        ? "Backend API endpoint not found. Check backend port and API URL."
        : "Unable to create account right now.");

    if (!raw) return "Unable to create account right now.";
    if (raw.length > 220) return "Unable to create account. Please verify details and try again.";
    return raw;
  };

  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await API.post("/register", form);
      setSuccess("Account created successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-200 flex items-center justify-center px-4 sm:px-6 py-4 md:py-6 overflow-hidden">
      <div className="w-full max-w-6xl h-full max-h-[920px] grid md:grid-cols-2 rounded-3xl shadow-2xl overflow-hidden bg-white">
        <div className="hidden md:flex flex-col justify-between p-8 sm:p-10 lg:p-12 text-white relative min-h-[420px] bg-slate-900">
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
              Build your campus profile in under a minute.
            </h1>

            <p className="mt-5 text-slate-100 text-[1.02rem] leading-relaxed max-w-lg">
              One secure account gives you access to timetable tools, notifications,
              assignments, and campus workflows.
            </p>
          </div>

          <div className="text-sm text-slate-200 relative z-10 mt-8">
            {new Date().getFullYear()} Smart Campus ERP
          </div>
        </div>

        <div className="p-6 md:p-10 lg:p-12 bg-white flex flex-col overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900">Create your account</h2>
            <p className="text-slate-500 mt-2 text-sm">
              Register with your institutional details to continue.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 break-words">
              {success}
            </div>
          )}

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
              <input
                name="name"
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                name="email"
                type="email"
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
              <input
                name="phone_number"
                type="tel"
                placeholder="+91XXXXXXXXXX"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  name="password"
                  placeholder="Create password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                  onChange={handleChange}
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

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Roll / Employee No</label>
              <input
                name="roll_number"
                placeholder="e.g. STU12345"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
              <input
                name="department"
                placeholder="e.g. CSE"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                onChange={handleChange}
                required
              />
            </div>

            {form.role === "student" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                  <input
                    name="year"
                    placeholder="e.g. 2"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Section</label>
                  <input
                    name="section"
                    placeholder="e.g. A"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 mt-1">
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 transition shadow-md ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-sm text-center text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-700 hover:text-blue-800 font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
