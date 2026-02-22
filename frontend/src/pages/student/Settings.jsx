import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";

const defaultSettings = {
  emailNotifications: true,
  examAlerts: true,
  assignmentReminders: true,
  showAttendanceWidget: true,
  dashboardDensity: "comfortable",
  language: "English",
  weekStart: "Monday",
};

function Toggle({ checked, label, description, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-4 ${
          checked
            ? "bg-blue-600 border-blue-600 focus:ring-blue-100"
            : "bg-slate-200 border-slate-300 focus:ring-slate-200"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              checked ? "bg-blue-600" : "bg-slate-400"
            }`}
          />
        </span>
      </button>
    </label>
  );
}

function SelectField({ label, description, value, options, onChange }) {
  return (
    <label className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function fromApiSettings(apiSettings = {}) {
  return {
    emailNotifications: apiSettings.email_notifications ?? defaultSettings.emailNotifications,
    examAlerts: apiSettings.exam_alerts ?? defaultSettings.examAlerts,
    assignmentReminders: apiSettings.assignment_reminders ?? defaultSettings.assignmentReminders,
    showAttendanceWidget:
      apiSettings.show_attendance_widget ?? defaultSettings.showAttendanceWidget,
    dashboardDensity: apiSettings.dashboard_density ?? defaultSettings.dashboardDensity,
    language: apiSettings.language ?? defaultSettings.language,
    weekStart: apiSettings.week_start ?? defaultSettings.weekStart,
  };
}

function toApiSettings(settings) {
  return {
    email_notifications: settings.emailNotifications,
    exam_alerts: settings.examAlerts,
    assignment_reminders: settings.assignmentReminders,
    show_attendance_widget: settings.showAttendanceWidget,
    dashboard_density: settings.dashboardDensity,
    language: settings.language,
    week_start: settings.weekStart,
  };
}

function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [savedSnapshot, setSavedSnapshot] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setStatus({ type: "", text: "" });
      try {
        const res = await API.get("/student/settings");
        const mapped = fromApiSettings(res.data?.settings);
        setSettings(mapped);
        setSavedSnapshot(mapped);
      } catch {
        setStatus({ type: "error", text: "Failed to load settings from server." });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSnapshot),
    [settings, savedSnapshot]
  );

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setStatus({ type: "", text: "" });
  };

  const saveSettings = async () => {
    setSaving(true);
    setStatus({ type: "", text: "" });
    try {
      const res = await API.put("/student/settings", toApiSettings(settings));
      const mapped = fromApiSettings(res.data?.settings);
      setSettings(mapped);
      setSavedSnapshot(mapped);
      setStatus({ type: "success", text: "Settings saved successfully." });
    } catch (err) {
      const message = err.response?.data?.message || "Unable to save settings.";
      setStatus({ type: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    setSaving(true);
    setStatus({ type: "", text: "" });
    try {
      const res = await API.post("/student/settings/reset");
      const mapped = fromApiSettings(res.data?.settings);
      setSettings(mapped);
      setSavedSnapshot(mapped);
      setStatus({ type: "success", text: "Settings reset to defaults." });
    } catch (err) {
      const message = err.response?.data?.message || "Unable to reset settings.";
      setStatus({ type: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage dashboard behavior, alerts, and personalization preferences.
            </p>
          </div>
          <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            Student Profile
          </span>
        </div>
      </section>

      {status.text && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            status.type === "success"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border border-rose-300 bg-rose-50 text-rose-700"
          }`}
        >
          {status.text}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Notification Controls</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choose which academic alerts you receive in your account.
        </p>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Toggle
            checked={settings.emailNotifications}
            label="Email Notifications"
            description="Receive important academic updates by email."
            onChange={() => updateSetting("emailNotifications", !settings.emailNotifications)}
          />
          <Toggle
            checked={settings.examAlerts}
            label="Exam Alerts"
            description="Get reminders for upcoming quizzes and exams."
            onChange={() => updateSetting("examAlerts", !settings.examAlerts)}
          />
          <Toggle
            checked={settings.assignmentReminders}
            label="Assignment Reminders"
            description="Get deadline reminders before submission due date."
            onChange={() => updateSetting("assignmentReminders", !settings.assignmentReminders)}
          />
          <Toggle
            checked={settings.showAttendanceWidget}
            label="Attendance Widget"
            description="Display attendance summary on dashboard home."
            onChange={() => updateSetting("showAttendanceWidget", !settings.showAttendanceWidget)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Personalization</h3>
        <p className="mt-1 text-sm text-slate-500">
          Set your preferred interface density, language, and calendar start day.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Dashboard Density"
            description="Choose spacing style for dashboard cards."
            value={settings.dashboardDensity}
            onChange={(value) => updateSetting("dashboardDensity", value)}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
          <SelectField
            label="Language"
            description="Select your preferred display language."
            value={settings.language}
            onChange={(value) => updateSetting("language", value)}
            options={[
              { value: "English", label: "English" },
              { value: "Hindi", label: "Hindi" },
            ]}
          />
          <SelectField
            label="Week Start Day"
            description="Used in timetable and calendar views."
            value={settings.weekStart}
            onChange={(value) => updateSetting("weekStart", value)}
            options={[
              { value: "Monday", label: "Monday" },
              { value: "Sunday", label: "Sunday" },
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={saving || !hasChanges}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
              saving || !hasChanges
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={resetSettings}
            disabled={saving}
            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
              saving
                ? "border-slate-200 text-slate-400 cursor-not-allowed"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Reset to Default
          </button>
          <span className="text-xs text-slate-500">
            Changes are stored in your account and synced from backend.
          </span>
        </div>
      </section>
    </div>
  );
}

export default Settings;
