import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    roll_number: "",
    department: "",
    year: "",
    section: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
      setSuccess("Account created successfully. You can now login.");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? "Backend API endpoint not found. Check backend port and API URL."
          : "Error registering user.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 px-4 py-8">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Account</h2>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
            <input
              name="name"
              placeholder="Full name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              name="email"
              type="email"
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              onChange={handleChange}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              name="password"
              placeholder="Create password"
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              onChange={handleChange}
              required
            />
          </div>

          {form.role !== "admin" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Roll / Employee No</label>
                <input
                  name="roll_number"
                  placeholder="e.g. STU12345"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                <input
                  name="department"
                  placeholder="e.g. CSE"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          {form.role === "student" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                <input
                  name="year"
                  placeholder="e.g. 2"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
                <input
                  name="section"
                  placeholder="e.g. A"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Creating..." : "Register"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-teal-700 hover:text-teal-800 font-medium">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
