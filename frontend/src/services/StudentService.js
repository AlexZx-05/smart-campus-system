import API from "./api";

const StudentService = {
  getProfile: async () => {
    const response = await API.get("/student/profile");
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await API.patch("/student/profile", payload);
    return response.data;
  },

  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await API.post("/student/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  removeProfilePhoto: async () => {
    const response = await API.delete("/student/profile/photo");
    return response.data;
  },

  getSettings: async () => {
    const response = await API.get("/student/settings");
    return response.data;
  },

  updateSettings: async (payload) => {
    const response = await API.put("/student/settings", payload);
    return response.data;
  },

  resetSettings: async () => {
    const response = await API.post("/student/settings/reset");
    return response.data;
  },
};

export default StudentService;
