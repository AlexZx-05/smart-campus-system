import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StudentDashboard from "./pages/student/StudentDashboard";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

const getAuthData = () => ({
  token: localStorage.getItem("token"),
  role: localStorage.getItem("role"),
});

const roleDashboardPath = (role) => {
  if (role === "student") return "/student/dashboard";
  if (role === "faculty") return "/faculty/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/login";
};

function ProtectedRoute({ allowedRoles, children }) {
  const { token, role } = getAuthData();

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={roleDashboardPath(role)} replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const { token, role } = getAuthData();
  if (token && role) {
    return <Navigate to={roleDashboardPath(role)} replace />;
  }
  return children;
}

function App() {
  const navigate = useNavigate();

  const handleLoginSuccess = (userRole) => {
    navigate(roleDashboardPath(userRole), { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login onLoginSuccess={handleLoginSuccess} />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <GuestRoute>
            <ResetPassword />
          </GuestRoute>
        }
      />

      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/dashboard"
        element={
          <ProtectedRoute allowedRoles={["faculty"]}>
            <FacultyDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
