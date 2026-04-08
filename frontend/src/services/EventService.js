import API from "./api";

const EventService = {
  getEvents: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
    );
    const response = await API.get("/events", { params: cleanParams });
    return response.data;
  },

  getIndiaHolidays: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
    );
    const response = await API.get("/holidays/india", { params: cleanParams });
    return response.data;
  },

  createEvent: async (payload) => {
    const response = await API.post("/events", payload);
    return response.data;
  },

  updateEvent: async (eventId, payload) => {
    const response = await API.patch(`/events/${eventId}`, payload);
    return response.data;
  },

  deleteEvent: async (eventId) => {
    const response = await API.delete(`/events/${eventId}`);
    return response.data;
  },
};

export default EventService;
