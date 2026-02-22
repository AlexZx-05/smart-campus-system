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

  getAllFacultyPreferences: async (semester) => {
    const response = await API.get("/admin/preferences", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  updateFacultyPreferenceStatus: async (preferenceId, status) => {
    const response = await API.patch(`/admin/preferences/${preferenceId}`, { status });
    return response.data;
  },

  updatePreferenceDetails: async (preferenceId, payload) => {
    const response = await API.patch(`/admin/preferences/${preferenceId}`, payload);
    return response.data;
  },

  generateTimetableFromPreferences: async () => {
    const response = await API.post("/admin/timetable/generate");
    return response.data;
  },

  generateTimetableForSemester: async (semester) => {
    const response = await API.post("/admin/timetable/generate", { semester });
    return response.data;
  },

  publishTimetable: async (payload) => {
    const response = await API.post("/admin/timetable/publish", payload);
    return response.data;
  },

  getAdminPublishedTimetable: async (semester) => {
    const response = await API.get("/admin/timetable", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getRooms: async (includeInactive = false) => {
    const response = await API.get("/admin/rooms", {
      params: includeInactive ? { include_inactive: "true" } : {},
    });
    return response.data;
  },

  createRoom: async (payload) => {
    const response = await API.post("/admin/rooms", payload);
    return response.data;
  },

  updateRoom: async (roomId, payload) => {
    const response = await API.patch(`/admin/rooms/${roomId}`, payload);
    return response.data;
  },

  deleteRoom: async (roomId) => {
    const response = await API.delete(`/admin/rooms/${roomId}`);
    return response.data;
  },

  getRoomAvailability: async ({ day, start_time, end_time, semester }) => {
    const response = await API.get("/admin/rooms/availability", {
      params: { day, start_time, end_time, ...(semester ? { semester } : {}) },
    });
    return response.data;
  },

  getRoomOccupancy: async (semester) => {
    const response = await API.get("/admin/rooms/occupancy", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getRoomLiveStatus: async (semester) => {
    const response = await API.get("/admin/rooms/live-status", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getAdminUsers: async ({ role, q } = {}) => {
    const params = {};
    if (role) params.role = role;
    if (q) params.q = q;
    const response = await API.get("/admin/users", { params });
    return response.data;
  },

  updateAdminUser: async (userId, payload) => {
    const response = await API.patch(`/admin/users/${userId}`, payload);
    return response.data;
  },

  deleteAdminUser: async (userId) => {
    const response = await API.delete(`/admin/users/${userId}`);
    return response.data;
  },

  getAdminMessages: async (recipient_role) => {
    const response = await API.get("/admin/messages", {
      params: recipient_role ? { recipient_role } : {},
    });
    return response.data;
  },

  sendAdminMessage: async (payload) => {
    const response = await API.post("/admin/messages", payload);
    return response.data;
  },

  getInboxMessages: async () => {
    const response = await API.get("/messages/inbox");
    return response.data;
  },

  getAdminDashboardOverview: async (semester) => {
    const response = await API.get("/admin/dashboard/overview", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getAdminConflicts: async (status) => {
    const response = await API.get("/admin/conflicts", {
      params: status ? { status } : {},
    });
    return response.data;
  },

  createAdminConflict: async (payload) => {
    const response = await API.post("/admin/conflicts", payload);
    return response.data;
  },

  resolveAdminConflict: async (conflictId) => {
    const response = await API.patch(`/admin/conflicts/${conflictId}/resolve`);
    return response.data;
  },

  getFacultyTimetable: async (semester) => {
    const response = await API.get("/faculty/timetable/me", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getFacultyTodaySchedule: async (day, semester) => {
    const response = await API.get("/faculty/timetable/today", {
      params: {
        ...(day ? { day } : {}),
        ...(semester ? { semester } : {}),
      },
    });
    return response.data;
  },

  getFacultyInstituteTimetable: async (semester) => {
    const response = await API.get("/faculty/timetable/institute", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getStudentMyTimetable: async (semester) => {
    const response = await API.get("/student/timetable/my", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getStudentInstituteTimetable: async (semester) => {
    const response = await API.get("/student/timetable/institute", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },
};

export default PreferenceService;
