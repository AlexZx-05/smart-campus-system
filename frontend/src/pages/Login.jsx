import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import loginCampusBg from "../assets/login-campus-bg.svg";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState("password");
  const [otpRequested, setOtpRequested] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const toFriendlyError = (err, fallback) => {
    const raw = err?.response?.data?.message || fallback;
    if (!raw) return "Something went wrong. Please try again.";
    if (raw.includes("Twilio Verify request failed")) {
      if (raw.includes("Invalid parameter `To`")) {
        return "Enter a valid mobile number with country code, for example +916203513658.";
      }
      return "Unable to send OTP right now. Please verify your phone number and try again.";
    }
    if (raw.length > 220) {
      return "Request failed. Please verify details and try again.";
    }
    return raw;
  };

  const handleLoginSuccess = (res) => {
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("role", res.data.role);
    onLoginSuccess(res.data.role);
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

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
      handleLoginSuccess(res);
    } catch (err) {
      const message = toFriendlyError(
        err,
        "Unable to sign in. Please check your credentials."
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Please enter your registered email.");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/login/otp/request", {
        email: email.trim(),
        phone_number: phoneNumber.trim(),
      });
      setOtpRequested(true);
      setInfo(res.data?.message || "OTP sent successfully.");
    } catch (err) {
      const message = toFriendlyError(err, "Unable to send OTP.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.trim() || !otpCode.trim()) {
      setError("Please enter your registered email and OTP.");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/login/otp/verify", {
        email: email.trim(),
        code: otpCode.trim(),
      });
      handleLoginSuccess(res);
    } catch (err) {
      const message = toFriendlyError(err, "Unable to verify OTP.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    const onGoogleCredential = async (response) => {
      if (!response?.credential) {
        setError("Google login failed. Missing token.");
        return;
      }

      try {
        setGoogleLoading(true);
        setError("");
        setInfo("");

        const res = await API.post("/login/google", {
          id_token: response.credential,
        });

        handleLoginSuccess(res);
      } catch (err) {
        const message = toFriendlyError(
          err,
          "Google login failed. Use a registered Google account."
        );
        setError(message);
      } finally {
        setGoogleLoading(false);
      }
    };

    let intervalId = null;
    const initGoogle = () => {
      const googleApi = globalThis.google;
      if (!googleApi?.accounts?.id || !googleButtonRef.current) {
        return false;
      }

      googleApi.accounts.id.initialize({
        client_id: googleClientId,
        callback: onGoogleCredential,
      });

      googleButtonRef.current.innerHTML = "";
      googleApi.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        size: "large",
        shape: "pill",
        text: "signin_with",
        theme: "outline",
        width: 360,
      });
      return true;
    };

    if (!initGoogle()) {
      intervalId = setInterval(() => {
        if (initGoogle() && intervalId) {
          clearInterval(intervalId);
        }
      }, 300);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [googleClientId]);

  useEffect(() => {
    setOtpRequested(false);
    setOtpCode("");
    setError("");
    setInfo("");
  }, [authMode]);

  return (
    <div className="h-screen bg-slate-200 flex items-center justify-center px-4 sm:px-6 py-4 md:py-6 overflow-hidden">
      <div className="w-full max-w-6xl h-full max-h-[920px] grid md:grid-cols-2 rounded-3xl shadow-2xl overflow-hidden bg-white">
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
          </div>

          <div className="text-sm text-slate-200 relative z-10 mt-8">
            {new Date().getFullYear()} Smart Campus ERP
          </div>
        </div>

        <div className="p-6 md:p-10 lg:p-12 bg-white flex flex-col overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-slate-500 mt-2 text-sm">
              Password, OTP, or registered Google account.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAuthMode("password")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                authMode === "password" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("otp")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                authMode === "otp" ? "bg-white text-slate-900 shadow" : "text-slate-600"
              }`}
            >
              OTP Login
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {info}
            </div>
          )}

          {authMode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
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

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
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
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Registered email
                </label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mobile number (if not saved)
                </label>
                <input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              {otpRequested && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">OTP code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className={`rounded-xl border border-blue-700 text-blue-700 hover:bg-blue-50 font-semibold py-3 transition ${
                    loading ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Please wait..." : otpRequested ? "Resend OTP" : "Send OTP"}
                </button>

                <button
                  type="submit"
                  disabled={loading || !otpRequested}
                  className={`rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 transition shadow-md ${
                    loading || !otpRequested ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  Verify OTP
                </button>
              </div>
            </form>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">or</p>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {googleClientId ? (
            <div className="flex flex-col items-center">
              <div ref={googleButtonRef} />
              {googleLoading && (
                <p className="mt-2 text-xs text-slate-500">Verifying Google login...</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Google login is disabled. Set VITE_GOOGLE_CLIENT_ID in frontend env.
            </p>
          )}

          <div className="mt-6 text-sm text-center text-slate-600">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-blue-700 hover:text-blue-800 font-semibold">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
