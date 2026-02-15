import API from "./api";

const PreferenceService = {
  submitFacultyPreference: async (payload) => {
    const response = await API.post("/faculty/preferences", payload);
    return response.data;
  },

  getMyFacultyPreferences: async () => {
    const response = await API.get("/faculty/preferences/me");
    return response.data;
  },

  getAllFacultyPreferences: async () => {
    const response = await API.get("/admin/preferences");
    return response.data;
  },

  updateFacultyPreferenceStatus: async (preferenceId, status) => {
    const response = await API.patch(`/admin/preferences/${preferenceId}`, { status });
    return response.data;
  },

  generateTimetableFromPreferences: async () => {
    const response = await API.post("/admin/timetable/generate");
    return response.data;
  },
};

export default PreferenceService;
