import API from "./api";

const DashboardService = {
    getDashboardData: async () => {
        try {
            const response = await API.get("/dashboard");
            return response.data;
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            throw error;
        }
    },
};

export default DashboardService;
