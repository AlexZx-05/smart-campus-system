import API from "./api";

const FacultyService = {
  getProfile: async () => {
    const response = await API.get("/faculty/profile");
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await API.patch("/faculty/profile", payload);
    return response.data;
  },

  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append("photo", file);
    const response = await API.post("/faculty/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};

export default FacultyService;
