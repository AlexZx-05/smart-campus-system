import { useState } from "react";

const SETTINGS_KEY = "student_settings";

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
    <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-white">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function Settings() {
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    try {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
      return defaultSettings;
    }
  });
  const [message, setMessage] = useState("");

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setMessage("");
  };

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMessage("Settings saved successfully.");
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    setMessage("Settings reset to defaults.");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-lg font-semibold text-slate-800">Settings</h3>
        <p className="text-sm text-slate-500 mt-1">
          Manage how your student dashboard behaves and how you receive updates.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h4 className="text-base font-semibold text-slate-800 mb-3">Notifications</h4>
        <div className="space-y-3">
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h4 className="text-base font-semibold text-slate-800 mb-3">Dashboard Preferences</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            checked={settings.showAttendanceWidget}
            label="Show Attendance Widget"
            description="Display attendance summary on dashboard home."
            onChange={() => updateSetting("showAttendanceWidget", !settings.showAttendanceWidget)}
          />

          <label className="p-4 rounded-lg border border-slate-200 bg-white">
            <p className="text-sm font-medium text-slate-800">Dashboard Density</p>
            <p className="text-xs text-slate-500 mt-1">Choose spacing style for dashboard cards.</p>
            <select
              value={settings.dashboardDensity}
              onChange={(e) => updateSetting("dashboardDensity", e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>

          <label className="p-4 rounded-lg border border-slate-200 bg-white">
            <p className="text-sm font-medium text-slate-800">Language</p>
            <p className="text-xs text-slate-500 mt-1">Select your preferred display language.</p>
            <select
              value={settings.language}
              onChange={(e) => updateSetting("language", e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
          </label>

          <label className="p-4 rounded-lg border border-slate-200 bg-white">
            <p className="text-sm font-medium text-slate-800">Week Start Day</p>
            <p className="text-xs text-slate-500 mt-1">Used for timetable and calendar view.</p>
            <select
              value={settings.weekStart}
              onChange={(e) => updateSetting("weekStart", e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="Monday">Monday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveSettings}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={resetSettings}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
