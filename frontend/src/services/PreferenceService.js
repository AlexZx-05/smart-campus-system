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

  getFacultyDirectory: async (q) => {
    const response = await API.get("/faculty/directory", {
      params: q ? { q } : {},
    });
    return response.data;
  },

  sendFacultyPeerMessage: async (payload) => {
    const response = await API.post("/faculty/messages", payload);
    return response.data;
  },

  getFacultyPeerInbox: async () => {
    const response = await API.get("/faculty/messages/inbox");
    return response.data;
  },

  createSupportQuery: async (payload) => {
    const response = await API.post("/messages/queries", payload);
    return response.data;
  },

  getMySupportQueries: async () => {
    const response = await API.get("/messages/queries/me");
    return response.data;
  },

  getAdminSupportQueries: async ({ status, sender_role, priority } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (sender_role) params.sender_role = sender_role;
    if (priority) params.priority = priority;
    const response = await API.get("/admin/messages/queries", { params });
    return response.data;
  },

  updateAdminSupportQuery: async (queryId, payload) => {
    const response = await API.patch(`/admin/messages/queries/${queryId}`, payload);
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

  getFacultyRoomLiveStatus: async (semester) => {
    const response = await API.get("/faculty/rooms/live-status", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getFacultyConflicts: async () => {
    const response = await API.get("/faculty/conflicts");
    return response.data;
  },

  createFacultyConflict: async (payload) => {
    const response = await API.post("/faculty/conflicts", payload);
    return response.data;
  },

  createFacultyAssignment: async (formData) => {
    const response = await API.post("/faculty/assignments", formData);
    return response.data;
  },

  getFacultyAssignments: async () => {
    const response = await API.get("/faculty/assignments");
    return response.data;
  },

  getFacultyAssignmentSubmissions: async (assignmentId) => {
    const response = await API.get(`/faculty/assignments/${assignmentId}/submissions`);
    return response.data;
  },

  reviewFacultyAssignmentSubmission: async (submissionId, payload) => {
    const response = await API.patch(`/faculty/assignments/submissions/${submissionId}`, payload);
    return response.data;
  },

  getFacultyCourseEnrollments: async ({ subject, semester } = {}) => {
    const params = {};
    if (subject) params.subject = subject;
    if (semester) params.semester = semester;
    const response = await API.get("/faculty/course-enrollments", { params });
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

  getStudentRoomLiveStatus: async (semester) => {
    const response = await API.get("/student/rooms/live-status", {
      params: semester ? { semester } : {},
    });
    return response.data;
  },

  getStudentAssignments: async () => {
    const response = await API.get("/student/assignments");
    return response.data;
  },

  getStudentCourseEnrollments: async () => {
    const response = await API.get("/student/course-enrollments");
    return response.data;
  },

  createStudentCourseEnrollment: async (payload) => {
    const response = await API.post("/student/course-enrollments", payload);
    return response.data;
  },

  deleteStudentCourseEnrollment: async (enrollmentId) => {
    const response = await API.delete(`/student/course-enrollments/${enrollmentId}`);
    return response.data;
  },

  getStudentAssignmentReminders: async () => {
    const response = await API.get("/student/assignments/reminders");
    return response.data;
  },

  submitStudentAssignment: async (assignmentId, formData) => {
    const response = await API.post(`/student/assignments/${assignmentId}/submission`, formData);
    return response.data;
  },
};

export default PreferenceService;
