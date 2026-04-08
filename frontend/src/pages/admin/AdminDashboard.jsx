import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PreferenceService from "../../services/PreferenceService";
import DashboardService from "../../services/DashboardService";
import EventService from "../../services/EventService";

function AdminDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [adminName, setAdminName] = useState("Admin");
  const [preferences, setPreferences] = useState([]);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("Odd 2026");
  const [editingPreferenceId, setEditingPreferenceId] = useState(null);
  const [preferenceEditForm, setPreferenceEditForm] = useState({});
  const [generatedTimetable, setGeneratedTimetable] = useState([]);
  const [generatingTimetable, setGeneratingTimetable] = useState(false);
  const [publishingTimetable, setPublishingTimetable] = useState(false);
  const [timetableMessage, setTimetableMessage] = useState("");
  const [rooms, setRooms] = useState([
    { id: 0, name: "A-101", capacity: 40 },
    { id: 0, name: "A-102", capacity: 60 },
    { id: 0, name: "B-201", capacity: 80 },
    { id: 0, name: "B-202", capacity: 100 },
    { id: 0, name: "C-301", capacity: 120 },
    { id: 0, name: "Lab-1", capacity: 45 },
  ]);
  const [newRoom, setNewRoom] = useState({ name: "", capacity: "" });
  const [roomAssignments, setRoomAssignments] = useState({});
  const [roomFilter, setRoomFilter] = useState({
    day: "Monday",
    start_time: "",
    end_time: "",
  });
  const [roomAvailability, setRoomAvailability] = useState([]);
  const [roomOccupancy, setRoomOccupancy] = useState({});
  const [roomLiveStatus, setRoomLiveStatus] = useState([]);
  const [liveStatusMeta, setLiveStatusMeta] = useState({
    day: "",
    current_time: "",
    running_classes_count: 0,
    next_slot_time: null,
  });
  const [loadingLiveRoomStatus, setLoadingLiveRoomStatus] = useState(false);
  const [facultyApprovals, setFacultyApprovals] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingRoomAvailability, setLoadingRoomAvailability] = useState(false);
  const [adminUserId, setAdminUserId] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", description: "" });
  const [eventMessage, setEventMessage] = useState("");
  const [eventError, setEventError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [userEditForm, setUserEditForm] = useState({});
  const [adminMessages, setAdminMessages] = useState([]);
  const [loadingAdminMessages, setLoadingAdminMessages] = useState(false);
  const [messageRecipientFilter, setMessageRecipientFilter] = useState("");
  const [messageForm, setMessageForm] = useState({
    recipient_role: "faculty",
    subject: "",
    body: "",
  });
  const [supportQueries, setSupportQueries] = useState([]);
  const [loadingSupportQueries, setLoadingSupportQueries] = useState(false);
  const [queryStatusFilter, setQueryStatusFilter] = useState("");
  const [querySenderRoleFilter, setQuerySenderRoleFilter] = useState("");
  const [queryPriorityFilter, setQueryPriorityFilter] = useState("");
  const [queryUpdateForm, setQueryUpdateForm] = useState({});
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [loadingDashboardOverview, setLoadingDashboardOverview] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [conflictForm, setConflictForm] = useState({ title: "", description: "" });
  const currentYear = new Date().getFullYear();
  const semesterOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i).flatMap((year) => [
    `Odd ${year}`,
    `Even ${year}`,
  ]);

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "preferences", label: "Faculty Preferences" },
    { key: "timetable", label: "Generate Timetable" },
    { key: "rooms", label: "Rooms Management" },
    { key: "users", label: "User Management" },
    { key: "messages", label: "Messages" },
    { key: "notifications", label: "Notifications" },
    { key: "conflicts", label: "Conflict Resolution" },
    { key: "calendar", label: "Calendar Control" },
  ];

  const pageTitleMap = {
    dashboard: "Admin Dashboard",
    preferences: "Faculty Preferences",
    timetable: "Generate Timetable",
    rooms: "Rooms Management",
    users: "User Management",
    messages: "Messages",
    notifications: "Notifications",
    conflicts: "Conflict Resolution",
    calendar: "Calendar Control",
  };

  const sectionMessage = pageTitleMap[activePage] || "Admin Dashboard";

  const loadPreferences = async () => {
    setLoadingPreferences(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAllFacultyPreferences(semesterFilter);
      setPreferences(data);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load faculty preferences.";
      setPreferencesError(msg);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const loadRooms = async () => {
    setLoadingRooms(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getRooms(false);
      setRooms(data || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load rooms.");
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadRoomOccupancy = async () => {
    try {
      const res = await PreferenceService.getRoomOccupancy(semesterFilter);
      setRoomOccupancy(res.occupancy || {});
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load room occupancy.");
    }
  };

  const loadRoomLiveStatus = async () => {
    setLoadingLiveRoomStatus(true);
    try {
      const res = await PreferenceService.getRoomLiveStatus(semesterFilter);
      setRoomLiveStatus(res.rooms || []);
      setLiveStatusMeta({
        day: res.day || "",
        current_time: res.current_time || "",
        running_classes_count: res.running_classes_count || 0,
        next_slot_time: res.next_slot_time || null,
      });
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load live room status.");
    } finally {
      setLoadingLiveRoomStatus(false);
    }
  };

  const checkRoomAvailability = async () => {
    const { day, start_time, end_time } = roomFilter;
    if (!day || !start_time || !end_time) {
      setPreferencesError("Day, start time and end time are required to check vacant rooms.");
      return;
    }
    setLoadingRoomAvailability(true);
    setPreferencesError("");
    try {
      const res = await PreferenceService.getRoomAvailability({
        day,
        start_time,
        end_time,
        semester: semesterFilter,
      });
      setRoomAvailability(res.rooms || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load room availability.");
    } finally {
      setLoadingRoomAvailability(false);
    }
  };

  useEffect(() => {
    if (activePage === "dashboard") {
      loadDashboardOverview();
    }
    if (activePage === "preferences") {
      loadPreferences();
    }
    if (activePage === "calendar") {
      loadCalendarEvents();
    }
    if (activePage === "rooms") {
      loadRooms();
      loadRoomOccupancy();
      loadRoomLiveStatus();
    }
    if (activePage === "users") {
      loadUsers();
    }
    if (activePage === "messages") {
      loadAdminMessages();
      loadSupportQueries();
    }
    if (activePage === "conflicts") {
      loadConflicts();
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === "dashboard") {
      loadDashboardOverview();
    }
    if (activePage === "preferences") {
      loadPreferences();
    }
    if (activePage === "rooms") {
      loadRoomOccupancy();
      loadRoomLiveStatus();
    }
  }, [semesterFilter]);

  useEffect(() => {
    DashboardService.getDashboardData()
      .then((res) => {
        if (res?.user?.name) {
          setAdminName(res.user.name);
        }
        if (res?.user?.id) {
          setAdminUserId(res.user.id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activePage !== "rooms") return undefined;
    const timer = setInterval(() => {
      loadRoomLiveStatus();
    }, 30000);
    return () => clearInterval(timer);
  }, [activePage, semesterFilter]);

  useEffect(() => {
    if (activePage === "messages") {
      loadAdminMessages();
    }
  }, [messageRecipientFilter]);

  useEffect(() => {
    if (activePage === "messages") {
      loadSupportQueries();
    }
  }, [queryStatusFilter, querySenderRoleFilter, queryPriorityFilter]);

  const loadCalendarEvents = async () => {
    setLoadingCalendarEvents(true);
    setEventError("");
    try {
      const data = await EventService.getEvents();
      setCalendarEvents(data);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load events.";
      setEventError(msg);
    } finally {
      setLoadingCalendarEvents(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAdminUsers({
        role: userRoleFilter || undefined,
        q: userSearch.trim() || undefined,
      });
      setUsers(data || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAdminMessages = async () => {
    setLoadingAdminMessages(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAdminMessages(messageRecipientFilter || undefined);
      setAdminMessages(data || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load messages.");
    } finally {
      setLoadingAdminMessages(false);
    }
  };

  const loadSupportQueries = async () => {
    setLoadingSupportQueries(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAdminSupportQueries({
        status: queryStatusFilter || undefined,
        sender_role: querySenderRoleFilter || undefined,
        priority: queryPriorityFilter || undefined,
      });
      setSupportQueries(data || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load user queries.");
    } finally {
      setLoadingSupportQueries(false);
    }
  };

  const loadDashboardOverview = async () => {
    setLoadingDashboardOverview(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAdminDashboardOverview(semesterFilter);
      setDashboardOverview(data);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load dashboard overview.");
    } finally {
      setLoadingDashboardOverview(false);
    }
  };

  const loadConflicts = async () => {
    setLoadingConflicts(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAdminConflicts("pending");
      setConflicts(data || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load conflicts.");
    } finally {
      setLoadingConflicts(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await PreferenceService.updatePreferenceDetails(id, { status });
      await loadPreferences();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update status.";
      setPreferencesError(msg);
    }
  };

  const handleGenerateTimetable = async () => {
    setGeneratingTimetable(true);
    setTimetableMessage("");
    setPreferencesError("");
    try {
      const res = await PreferenceService.generateTimetableForSemester(semesterFilter);
      setGeneratedTimetable(res.timetable || []);
      const initialAssignments = {};
      (res.timetable || []).forEach((slot, idx) => {
        initialAssignments[`${slot.source_preference_id}-${idx}`] = slot.room;
      });
      setRoomAssignments(initialAssignments);
      const nextApprovals = {};
      (res.timetable || []).forEach((slot) => {
        nextApprovals[String(slot.faculty_id || "unknown")] = false;
      });
      setFacultyApprovals(nextApprovals);
      setTimetableMessage(res.message || "Timetable generated.");
      if ((res.total_unassigned || 0) > 0) {
        setPreferencesError(
          `${res.total_unassigned} slot(s) could not be assigned a room. Increase room capacity or adjust timings.`
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to generate timetable.";
      setPreferencesError(msg);
    } finally {
      setGeneratingTimetable(false);
    }
  };

  const startPreferenceEdit = (pref) => {
    setEditingPreferenceId(pref.id);
    setPreferenceEditForm({
      day: pref.day || "",
      subject: pref.subject || "",
      student_count: pref.student_count || "",
      start_time: pref.start_time || "",
      end_time: pref.end_time || "",
      semester: pref.semester || "",
      department: pref.department || "",
      year: pref.year || "",
      section: pref.section || "",
      details: pref.details || "",
      status: pref.status || "pending",
    });
  };

  const savePreferenceEdit = async () => {
    if (!editingPreferenceId) return;
    try {
      await PreferenceService.updatePreferenceDetails(editingPreferenceId, preferenceEditForm);
      setEditingPreferenceId(null);
      setPreferenceEditForm({});
      await loadPreferences();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to save preference.");
    }
  };

  const publishGeneratedTimetable = async () => {
    if (generatedTimetable.length === 0) return;
    if (!allFacultiesApproved) {
      setPreferencesError("Approve timetable for each faculty before final publish.");
      return;
    }
    setPublishingTimetable(true);
    setPreferencesError("");
    try {
      const slots = generatedTimetable.map((slot, idx) => {
        const key = `${slot.source_preference_id}-${idx}`;
        const roomName = roomAssignments[key] || slot.room;
        const roomMeta = rooms.find((r) => r.name === roomName);
        return {
          source_preference_id: slot.source_preference_id,
          room: roomName,
          room_capacity: roomMeta?.capacity || slot.room_capacity,
        };
      });
      const res = await PreferenceService.publishTimetable({
        semester: semesterFilter,
        slots,
      });
      setTimetableMessage(res.message || "Timetable published.");
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to publish timetable.");
    } finally {
      setPublishingTimetable(false);
    }
  };

  const handleRoomInput = (e) => {
    const { name, value } = e.target;
    setNewRoom((prev) => ({ ...prev, [name]: value }));
  };

  const addRoom = async () => {
    const name = newRoom.name.trim();
    const capacity = parseInt(newRoom.capacity, 10);
    if (!name || !capacity || capacity <= 0) return;
    try {
      await PreferenceService.createRoom({ name, capacity });
      setNewRoom({ name: "", capacity: "" });
      await loadRooms();
      await loadRoomOccupancy();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to add room.");
    }
  };

  const removeRoom = async (roomId) => {
    try {
      await PreferenceService.deleteRoom(roomId);
      await loadRooms();
      await loadRoomOccupancy();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to remove room.");
    }
  };

  const assignRoom = (slotKey, roomName) => {
    setRoomAssignments((prev) => ({ ...prev, [slotKey]: roomName }));
  };

  const setFacultyApproval = (facultyId, isApproved) => {
    setFacultyApprovals((prev) => ({ ...prev, [String(facultyId || "unknown")]: isApproved }));
  };

  const approveAllFaculties = () => {
    const next = {};
    facultyDraftRows.forEach((row) => {
      next[String(row.faculty_id || "unknown")] = true;
    });
    setFacultyApprovals(next);
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
    setEventMessage("");
    setEventError("");
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setSavingEvent(true);
    setEventMessage("");
    setEventError("");
    try {
      if (editingEventId) {
        const res = await EventService.updateEvent(editingEventId, eventForm);
        setEventMessage(res.message || "Event updated.");
      } else {
        const res = await EventService.createEvent(eventForm);
        setEventMessage(res.message || "Event created.");
      }
      setEventForm({ title: "", date: "", description: "" });
      setEditingEventId(null);
      await loadCalendarEvents();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save event.";
      setEventError(msg);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEventEdit = (event) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title || "",
      date: event.date || "",
      description: event.description || "",
    });
  };

  const handleEventDelete = async (eventId) => {
    try {
      await EventService.deleteEvent(eventId);
      await loadCalendarEvents();
      setEventMessage("Event deleted.");
      if (editingEventId === eventId) {
        setEditingEventId(null);
        setEventForm({ title: "", date: "", description: "" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete event.";
      setEventError(msg);
    }
  };

  const startUserEdit = (row) => {
    setEditingUserId(row.id);
    setUserEditForm({
      name: row.name || "",
      email: row.email || "",
      role: row.role || "student",
      department: row.department || "",
      roll_number: row.roll_number || "",
      year: row.year || "",
      section: row.section || "",
    });
  };

  const cancelUserEdit = () => {
    setEditingUserId(null);
    setUserEditForm({});
  };

  const saveUserEdit = async () => {
    if (!editingUserId) return;
    try {
      await PreferenceService.updateAdminUser(editingUserId, userEditForm);
      setEditingUserId(null);
      setUserEditForm({});
      await loadUsers();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to update user.");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await PreferenceService.deleteAdminUser(userId);
      await loadUsers();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to delete user.");
    }
  };

  const handleMessageFormChange = (e) => {
    const { name, value } = e.target;
    setMessageForm((prev) => ({ ...prev, [name]: value }));
    setPreferencesError("");
    setTimetableMessage("");
  };

  const sendAdminMessage = async (e) => {
    e.preventDefault();
    setPreferencesError("");
    try {
      const res = await PreferenceService.sendAdminMessage(messageForm);
      setTimetableMessage(res.message || "Message sent.");
      setMessageForm((prev) => ({ ...prev, subject: "", body: "" }));
      await loadAdminMessages();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to send message.");
    }
  };

  const handleQueryUpdateInput = (queryId, field, value) => {
    setQueryUpdateForm((prev) => ({
      ...prev,
      [queryId]: {
        ...(prev[queryId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSupportQueryUpdate = async (queryId) => {
    const payload = queryUpdateForm[queryId] || {};
    if (!payload.status && payload.admin_note === undefined) {
      return;
    }
    try {
      await PreferenceService.updateAdminSupportQuery(queryId, payload);
      await loadSupportQueries();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to update user query.");
    }
  };

  const handleConflictFormChange = (e) => {
    const { name, value } = e.target;
    setConflictForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateConflict = async (e) => {
    e.preventDefault();
    try {
      await PreferenceService.createAdminConflict(conflictForm);
      setConflictForm({ title: "", description: "" });
      await loadConflicts();
      await loadDashboardOverview();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to create conflict.");
    }
  };

  const handleResolveConflict = async (conflictId) => {
    try {
      await PreferenceService.resolveAdminConflict(conflictId);
      await loadConflicts();
      await loadDashboardOverview();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to resolve conflict.");
    }
  };

  const groupedDraftByFaculty = generatedTimetable.reduce((acc, slot) => {
    const key = String(slot.faculty_id || "unknown");
    if (!acc[key]) {
      acc[key] = {
        faculty_id: slot.faculty_id,
        faculty_name: slot.faculty_name || "Faculty",
        total_slots: 0,
      };
    }
    acc[key].total_slots += 1;
    return acc;
  }, {});

  const facultyDraftRows = Object.values(groupedDraftByFaculty);
  const allFacultiesApproved =
    facultyDraftRows.length > 0 &&
    facultyDraftRows.every((row) => facultyApprovals[String(row.faculty_id || "unknown")] === true);

  const renderContent = () => {
    if (activePage === "dashboard") {
      const overview = dashboardOverview;
      const kpis = overview?.kpis || {};
      const actionCenter = overview?.action_center || {};
      const timetableHealth = overview?.timetable_health || {};
      const live = overview?.live_room_status || {};
      const facultyQueue = overview?.faculty_approval_queue || [];
      const announce = overview?.announcements_snapshot || { recent: [], audience_breakdown: {} };
      const userSnap = overview?.user_management_snapshot || { role_breakdown: {} };
      const conflictSnap = overview?.conflict_resolution_snapshot || { open_conflicts: [] };
      const calendarSnap = overview?.calendar_deadlines || { today: [], upcoming: [] };
      const activity = overview?.recent_activity_feed || [];

      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Control Center</h3>
                <p className="text-sm text-slate-500 mt-1">Operational overview with priority actions.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {semesterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadDashboardOverview}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>
            {preferencesError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {preferencesError}
              </div>
            )}
          </div>

          {loadingDashboardOverview ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <p className="text-sm text-slate-500">Loading dashboard...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                {[
                  { label: "Total Students", value: kpis.total_students ?? 0 },
                  { label: "Total Faculty", value: kpis.total_faculty ?? 0 },
                  { label: "Pending Preferences", value: kpis.pending_faculty_preferences ?? 0 },
                  { label: "Rooms Occupied Now", value: kpis.rooms_occupied_now ?? 0 },
                  { label: "Conflicts Pending", value: kpis.conflicts_pending ?? 0 },
                  { label: "Messages Sent Today", value: kpis.messages_sent_today ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-800">Action Center</h4>
                    <button
                      type="button"
                      onClick={() => setActivePage("preferences")}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Open Preferences
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                      <span>Preferences awaiting approval</span>
                      <span className="font-semibold text-slate-800">{(actionCenter.preferences_awaiting_approval || []).length}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                      <span>Timetable status</span>
                      <span className={`font-semibold ${actionCenter.timetable_published ? "text-emerald-700" : "text-amber-700"}`}>
                        {actionCenter.timetable_published ? "Published" : "Not Published"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                      <span>Room conflicts needing resolution</span>
                      <span className="font-semibold text-slate-800">{(actionCenter.room_conflicts || []).length}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                      <span>Unassigned slots (no room found)</span>
                      <span className="font-semibold text-slate-800">{actionCenter.unassigned_slots_count ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 className="text-base font-semibold text-slate-800">Timetable Health</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>Status: <span className="font-semibold">{timetableHealth.status || "Draft"}</span></p>
                    <p>Approved vs requested: <span className="font-semibold">{timetableHealth.approved_slots ?? 0} / {timetableHealth.total_requested_slots ?? 0}</span></p>
                    <p>Missing assignments: <span className="font-semibold">{timetableHealth.missing_assignments_count ?? 0}</span></p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={handleGenerateTimetable} className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 text-sm">
                      Generate Draft
                    </button>
                    <button
                      onClick={publishGeneratedTimetable}
                      className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm"
                    >
                      Publish
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 className="text-base font-semibold text-slate-800">Live Room Status</h4>
                  <p className="text-xs text-slate-500 mt-1">{live.day || "-"} | {live.current_time || "--:--"}</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>Running classes: <span className="font-semibold">{live.running_classes_count ?? 0}</span></p>
                    <p>Rooms occupied now: <span className="font-semibold">{live.rooms_occupied_now ?? 0}</span></p>
                    <p>Free rooms now: <span className="font-semibold">{live.free_rooms_now ?? 0}</span></p>
                    <p>Next slot: <span className="font-semibold">{live.next_slot_time || "-"}</span></p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 className="text-base font-semibold text-slate-800">Faculty Approval Queue</h4>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {facultyQueue.length === 0 ? (
                      <p className="text-sm text-slate-500">No queue data.</p>
                    ) : (
                      facultyQueue.map((row) => (
                        <div key={row.faculty_id} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-800">{row.faculty_name}</p>
                            <button
                              type="button"
                              onClick={() => setActivePage("preferences")}
                              className="rounded-md border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                            >
                              Review
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Approved {row.approved} | Pending {row.pending} | Rejected {row.rejected}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-800">Announcements Snapshot</h4>
                    <button
                      type="button"
                      onClick={() => setActivePage("messages")}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Send Message
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Faculty {announce.audience_breakdown?.faculty ?? 0} | Student {announce.audience_breakdown?.student ?? 0} | All {announce.audience_breakdown?.all ?? 0}
                  </p>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {(announce.recent || []).slice(0, 5).map((msg) => (
                      <div key={msg.id} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                        <p className="font-medium text-slate-800">{msg.subject}</p>
                        <p className="text-xs text-slate-500 mt-1">{msg.recipient_role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 className="text-base font-semibold text-slate-800">User Management Snapshot</h4>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>New accounts this week: <span className="font-semibold">{userSnap.new_accounts_this_week ?? 0}</span></p>
                    <p>Students: <span className="font-semibold">{userSnap.role_breakdown?.student ?? 0}</span></p>
                    <p>Faculty: <span className="font-semibold">{userSnap.role_breakdown?.faculty ?? 0}</span></p>
                    <p>Admin: <span className="font-semibold">{userSnap.role_breakdown?.admin ?? 0}</span></p>
                    <p>Incomplete profiles: <span className="font-semibold">{userSnap.incomplete_profiles_count ?? 0}</span></p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-800">Conflict Resolution Snapshot</h4>
                    <button
                      type="button"
                      onClick={() => setActivePage("conflicts")}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Open List
                    </button>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    <p>Open conflicts: <span className="font-semibold">{conflictSnap.open_conflicts_count ?? 0}</span></p>
                    <p>Oldest pending age: <span className="font-semibold">{conflictSnap.oldest_pending_age_days ?? 0} day(s)</span></p>
                  </div>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {(conflictSnap.open_conflicts || []).map((c) => (
                      <div key={c.id} className="rounded-lg border border-slate-200 p-2.5">
                        <p className="text-sm font-medium text-slate-800">{c.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 className="text-base font-semibold text-slate-800">Calendar & Deadlines</h4>
                  <p className="text-xs text-slate-500 mt-1">Today: {(calendarSnap.today || []).length} events</p>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {(calendarSnap.upcoming || []).slice(0, 5).map((event) => (
                      <div key={event.id} className="rounded-lg border border-slate-200 p-2.5">
                        <p className="text-sm font-medium text-slate-800">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{event.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-semibold text-slate-800">Recent Activity Feed</h4>
                {(activity || []).length === 0 ? (
                  <p className="text-sm text-slate-500 mt-3">No activity yet.</p>
                ) : (
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {activity.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm text-slate-800">{item.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {item.actor_name} | {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    if (activePage === "preferences") {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Faculty Preferences</h3>
              <p className="text-sm text-slate-500 mt-2">
                Review, edit, approve, or reject faculty slot requests.
              </p>
            </div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            >
              {semesterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {preferencesError && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {preferencesError}
            </div>
          )}

          {loadingPreferences ? (
            <p className="text-sm text-slate-500 mt-4">Loading preferences...</p>
          ) : preferences.length === 0 ? (
            <p className="text-sm text-slate-500 mt-4">No preferences submitted yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Faculty</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Students</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Slot</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Semester</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Class Target</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Details</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {preferences.map((pref) => (
                    <tr key={pref.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{pref.faculty_name || "Faculty"}</p>
                        <p className="text-xs text-slate-500">{pref.faculty_email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {editingPreferenceId === pref.id ? (
                          <input
                            value={preferenceEditForm.subject || ""}
                            onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                            className="w-40 rounded border border-slate-300 px-2 py-1"
                          />
                        ) : (
                          pref.subject || "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {editingPreferenceId === pref.id ? (
                          <input
                            type="number"
                            min="1"
                            value={preferenceEditForm.student_count || ""}
                            onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, student_count: e.target.value }))}
                            className="w-20 rounded border border-slate-300 px-2 py-1"
                          />
                        ) : (
                          pref.student_count || "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {editingPreferenceId === pref.id ? (
                          <div className="space-y-1">
                            <input
                              value={preferenceEditForm.day || ""}
                              onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, day: e.target.value }))}
                              className="w-24 rounded border border-slate-300 px-2 py-1"
                            />
                            <input
                              type="time"
                              value={preferenceEditForm.start_time || ""}
                              onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, start_time: e.target.value }))}
                              className="w-28 rounded border border-slate-300 px-2 py-1"
                            />
                            <input
                              type="time"
                              value={preferenceEditForm.end_time || ""}
                              onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, end_time: e.target.value }))}
                              className="w-28 rounded border border-slate-300 px-2 py-1"
                            />
                          </div>
                        ) : (
                          `${pref.day} | ${pref.start_time} - ${pref.end_time}`
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {editingPreferenceId === pref.id ? (
                          <input
                            value={preferenceEditForm.semester || ""}
                            onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, semester: e.target.value }))}
                            className="w-28 rounded border border-slate-300 px-2 py-1"
                          />
                        ) : (
                          pref.semester
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {editingPreferenceId === pref.id ? (
                          <div className="space-y-1">
                            <input
                              value={preferenceEditForm.department || ""}
                              onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, department: e.target.value }))}
                              className="w-24 rounded border border-slate-300 px-2 py-1"
                              placeholder="Dept"
                            />
                            <input
                              type="number"
                              value={preferenceEditForm.year || ""}
                              onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, year: e.target.value }))}
                              className="w-16 rounded border border-slate-300 px-2 py-1"
                              placeholder="Year"
                            />
                            <input
                              value={preferenceEditForm.section || ""}
                              onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, section: e.target.value }))}
                              className="w-16 rounded border border-slate-300 px-2 py-1"
                              placeholder="Sec"
                            />
                          </div>
                        ) : (
                          `${pref.department || "-"} / ${pref.year || "-"} / ${pref.section || "-"}`
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {editingPreferenceId === pref.id ? (
                          <input
                            value={preferenceEditForm.details || ""}
                            onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, details: e.target.value }))}
                            className="w-40 rounded border border-slate-300 px-2 py-1"
                          />
                        ) : (
                          pref.details || "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full border ${
                            (editingPreferenceId === pref.id ? preferenceEditForm.status : pref.status) === "approved"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : (editingPreferenceId === pref.id ? preferenceEditForm.status : pref.status) === "rejected"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {editingPreferenceId === pref.id ? preferenceEditForm.status : pref.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editingPreferenceId === pref.id ? (
                          <div className="space-y-2">
                            <select
                              value={preferenceEditForm.status || "pending"}
                              onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, status: e.target.value }))}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="pending">pending</option>
                              <option value="approved">approved</option>
                              <option value="rejected">rejected</option>
                            </select>
                            <div className="flex gap-2">
                              <button onClick={savePreferenceEdit} className="px-2.5 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700">
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPreferenceId(null);
                                  setPreferenceEditForm({});
                                }}
                                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(pref.id, "approved")}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(pref.id, "rejected")}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => startPreferenceEdit(pref)}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (activePage === "timetable") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Generate Timetable</h3>
            <p className="text-sm text-slate-500 mt-2">
              Build semester timetable from approved preferences, then publish final slots.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              >
                {semesterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateTimetable}
                disabled={generatingTimetable}
                className={`px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ${
                  generatingTimetable ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {generatingTimetable ? "Generating..." : "Generate Draft"}
              </button>
              <button
                onClick={publishGeneratedTimetable}
                disabled={publishingTimetable || generatedTimetable.length === 0 || !allFacultiesApproved}
                className={`px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors ${
                  publishingTimetable || generatedTimetable.length === 0 || !allFacultiesApproved
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                {publishingTimetable ? "Publishing..." : "Publish Timetable"}
              </button>
            </div>
            {timetableMessage && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {timetableMessage}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">Generated Timetable Draft</h4>
            {generatedTimetable.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No generated timetable yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Faculty Approval Queue</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Approve each faculty timetable draft before final publish.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={approveAllFaculties}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Approve All Faculties
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {facultyDraftRows.map((row) => {
                      const key = String(row.faculty_id || "unknown");
                      const approved = facultyApprovals[key] === true;
                      return (
                        <div
                          key={key}
                          className={`rounded-lg border px-3 py-2 ${
                            approved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                          }`}
                        >
                          <p className="text-sm font-semibold text-slate-800">{row.faculty_name}</p>
                          <p className="text-xs text-slate-600 mt-1">{row.total_slots} slot(s)</p>
                          <button
                            type="button"
                            onClick={() => setFacultyApproval(row.faculty_id, !approved)}
                            className={`mt-2 rounded-md px-2.5 py-1 text-xs font-medium ${
                              approved
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                          >
                            {approved ? "Approved" : "Approve Faculty"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {!allFacultiesApproved && (
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      Final publish is locked until every faculty is approved.
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Day</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Subject</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Faculty</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Time</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Students</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Class</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedTimetable.map((slot, idx) => {
                        const key = `${slot.source_preference_id}-${idx}`;
                        return (
                          <tr key={key} className="border-t border-slate-200">
                            <td className="px-4 py-3 text-sm text-slate-700">{slot.day}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{slot.subject}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{slot.faculty_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {slot.start_time} - {slot.end_time}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">{slot.student_count || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={roomAssignments[key] || slot.room}
                                onChange={(e) => assignRoom(key, e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              >
                                {rooms
                                  .filter((room) => room.capacity >= (slot.student_count || 0))
                                  .map((room) => (
                                    <option key={room.name} value={room.name}>
                                      {room.name} ({room.capacity})
                                    </option>
                                  ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "rooms") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Rooms Management</h3>
            <p className="text-sm text-slate-500 mt-2">
              Manage room capacities and monitor live occupancy by timetable slot.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                name="name"
                value={newRoom.name}
                onChange={handleRoomInput}
                placeholder="Room name (e.g. D-401)"
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              />
              <input
                name="capacity"
                type="number"
                min="1"
                value={newRoom.capacity}
                onChange={handleRoomInput}
                placeholder="Capacity"
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              />
              <button
                onClick={addRoom}
                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5"
              >
                Add Room
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {loadingRooms ? (
                <p className="text-sm text-slate-500">Loading rooms...</p>
              ) : rooms.map((room) => (
                <div key={room.id || room.name} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-sm text-slate-700">
                    {room.name} ({room.capacity})
                  </span>
                  <button
                    onClick={() => removeRoom(room.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">Check Vacant Rooms By Time</h4>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={roomFilter.day}
                onChange={(e) => setRoomFilter((prev) => ({ ...prev, day: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={roomFilter.start_time}
                onChange={(e) => setRoomFilter((prev) => ({ ...prev, start_time: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              />
              <input
                type="time"
                value={roomFilter.end_time}
                onChange={(e) => setRoomFilter((prev) => ({ ...prev, end_time: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              />
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              >
                {semesterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                onClick={checkRoomAvailability}
                className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2.5"
              >
                {loadingRoomAvailability ? "Checking..." : "Check Availability"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {roomAvailability.map((entry) => (
                <div
                  key={entry.room.id}
                  className={`rounded-lg border p-3 ${
                    entry.is_vacant ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {entry.room.name} ({entry.room.capacity})
                  </p>
                  <p className={`text-xs mt-1 ${entry.is_vacant ? "text-green-700" : "text-red-700"}`}>
                    {entry.is_vacant ? "Vacant" : "Occupied"}
                  </p>
                  {!entry.is_vacant && entry.occupied_slots?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {entry.occupied_slots.map((slot, idx) => (
                        <p key={`${slot.id}-${idx}`} className="text-xs text-slate-700">
                          {slot.day} {slot.start_time}-{slot.end_time} | {slot.subject} ({slot.faculty_name})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-800">Real-Time Room Status</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {liveStatusMeta.day || "-"} at {liveStatusMeta.current_time || "--:--"} | Running now:{" "}
                  {liveStatusMeta.running_classes_count}
                  {liveStatusMeta.next_slot_time ? ` | Next slot: ${liveStatusMeta.next_slot_time}` : ""}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Published room map entries: {Object.keys(roomOccupancy).length}
                </p>
              </div>
              <button
                type="button"
                onClick={loadRoomLiveStatus}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Refresh Live
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {loadingLiveRoomStatus ? (
                <p className="text-sm text-slate-500">Loading live room data...</p>
              ) : roomLiveStatus.length === 0 ? (
                <p className="text-sm text-slate-500">No live room status available.</p>
              ) : (
                roomLiveStatus.map((room) => (
                  <div
                    key={room.room}
                    className={`rounded-lg border p-3 ${
                      room.status === "running" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        {room.room} {room.capacity ? `(${room.capacity})` : ""}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          room.status === "running" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {room.status === "running" ? "Running" : "Idle"}
                      </span>
                    </div>
                    {room.running_class ? (
                      <div className="mt-2 text-xs text-slate-700 space-y-1">
                        <p className="font-medium">{room.running_class.subject}</p>
                        <p>
                          {room.running_class.start_time}-{room.running_class.end_time} | {room.running_class.faculty_name}
                        </p>
                        <p>
                          {room.running_class.department || "-"} / {room.running_class.year || "-"} /{" "}
                          {room.running_class.section || "-"}
                        </p>
                      </div>
                    ) : room.next_class ? (
                      <p className="mt-2 text-xs text-slate-600">
                        Next: {room.next_class.start_time}-{room.next_class.end_time} {room.next_class.subject}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">No more classes today.</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">Assign Rooms to Timetable</h4>
            {generatedTimetable.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">
                Generate timetable first in the Generate Timetable section.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Subject</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Faculty</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Students</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Time</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Assigned Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedTimetable.map((slot, idx) => {
                      const key = `${slot.source_preference_id}-${idx}`;
                      return (
                        <tr key={key} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-sm text-slate-700">{slot.subject}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{slot.faculty_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{slot.student_count || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {slot.day} | {slot.start_time} - {slot.end_time}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={roomAssignments[key] || slot.room}
                              onChange={(e) => assignRoom(key, e.target.value)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              {rooms.map((room) => (
                                <option key={room.name} value={room.name}>
                                  {room.name} ({room.capacity})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "messages") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Admin Messages</h3>
            <p className="text-sm text-slate-500 mt-2">
              Send announcements to faculty, students, or both groups who have registered accounts.
            </p>

            <form onSubmit={sendAdminMessage} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Audience</label>
                <select
                  name="recipient_role"
                  value={messageForm.recipient_role}
                  onChange={handleMessageFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                >
                  <option value="faculty">Teacher (Faculty)</option>
                  <option value="student">Student</option>
                  <option value="all">Student + Teacher (All)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                <input
                  name="subject"
                  value={messageForm.subject}
                  onChange={handleMessageFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  placeholder="Class schedule update"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <textarea
                  name="body"
                  rows={4}
                  value={messageForm.body}
                  onChange={handleMessageFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  placeholder="Write your announcement..."
                  required
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5"
                >
                  Send Message
                </button>
              </div>
            </form>

            {timetableMessage && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {timetableMessage}
              </div>
            )}
            {preferencesError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {preferencesError}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-800">Sent Message History</h4>
              <select
                value={messageRecipientFilter}
                onChange={(e) => setMessageRecipientFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All audiences</option>
                <option value="faculty">Teacher (Faculty)</option>
                <option value="student">Student</option>
                <option value="all">Student + Teacher (All)</option>
              </select>
            </div>

            {loadingAdminMessages ? (
              <p className="text-sm text-slate-500 mt-4">Loading messages...</p>
            ) : adminMessages.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No messages sent yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {adminMessages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{msg.subject}</p>
                      <span className="text-xs rounded-full px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200">
                        {msg.recipient_role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      By {msg.sender_name} | {new Date(msg.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-800">Incoming User Queries</h4>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={queryStatusFilter}
                  onChange={(e) => setQueryStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={querySenderRoleFilter}
                  onChange={(e) => setQuerySenderRoleFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All senders</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
                <select
                  value={queryPriorityFilter}
                  onChange={(e) => setQueryPriorityFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All priority</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <button
                  type="button"
                  onClick={loadSupportQueries}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loadingSupportQueries ? (
              <p className="text-sm text-slate-500 mt-4">Loading user queries...</p>
            ) : supportQueries.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No user queries found.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {supportQueries.map((query) => (
                  <div key={query.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{query.subject}</p>
                      <span className="text-xs rounded-full px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300">
                        {query.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      From {query.sender_name} ({query.sender_role}) | {query.sender_email} | {new Date(query.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Category: {query.category} | Priority: {query.priority}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{query.body}</p>
                    {query.attachment_url && (
                      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Attachment</p>
                        {query.attachment_mime?.startsWith("image/") && (
                          <a href={query.attachment_url} target="_blank" rel="noreferrer">
                            <img
                              src={query.attachment_url}
                              alt={query.attachment_name || "query attachment"}
                              className="mt-2 max-h-44 rounded-md border border-slate-200 object-cover"
                            />
                          </a>
                        )}
                        <a
                          href={query.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-blue-700 hover:text-blue-800"
                        >
                          Open {query.attachment_name || "attachment"}
                        </a>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <select
                        value={(queryUpdateForm[query.id]?.status ?? query.status)}
                        onChange={(e) => handleQueryUpdateInput(query.id, "status", e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <input
                        value={(queryUpdateForm[query.id]?.admin_note ?? query.admin_note ?? "")}
                        onChange={(e) => handleQueryUpdateInput(query.id, "admin_note", e.target.value)}
                        className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Add internal/admin note..."
                      />
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => handleSupportQueryUpdate(query.id)}
                        className="rounded-lg bg-slate-800 text-white hover:bg-slate-900 px-3 py-2 text-sm"
                      >
                        Update Query
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "notifications") {
      const totalMessages = adminMessages.length;
      const facultyCount = adminMessages.filter((m) => m.recipient_role === "faculty").length;
      const studentCount = adminMessages.filter((m) => m.recipient_role === "student").length;
      const allCount = adminMessages.filter((m) => m.recipient_role === "all").length;

      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Notifications</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Live announcement feed for all messages sent to faculty/students.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAdminMessages}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-semibold text-slate-800 mt-1">{totalMessages}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Faculty</p>
                <p className="text-2xl font-semibold text-blue-800 mt-1">{facultyCount}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Student</p>
                <p className="text-2xl font-semibold text-emerald-800 mt-1">{studentCount}</p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">All</p>
                <p className="text-2xl font-semibold text-violet-800 mt-1">{allCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">Recent Announcement Activity</h4>
            {loadingAdminMessages ? (
              <p className="text-sm text-slate-500 mt-4">Loading notifications...</p>
            ) : adminMessages.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No announcements yet. Send one from the Messages section.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {adminMessages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{msg.subject}</p>
                      <span className="text-xs rounded-full px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200">
                        {msg.recipient_role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      By {msg.sender_name} | {new Date(msg.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "conflicts") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Conflict Resolution</h3>
            <p className="text-sm text-slate-500 mt-2">Track scheduling conflicts and resolve them with audit history.</p>
            <form onSubmit={handleCreateConflict} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                name="title"
                value={conflictForm.title}
                onChange={handleConflictFormChange}
                placeholder="Conflict title"
                className="rounded-lg border border-slate-300 px-3 py-2.5"
                required
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5"
              >
                Add Conflict
              </button>
              <textarea
                name="description"
                value={conflictForm.description}
                onChange={handleConflictFormChange}
                rows={3}
                placeholder="Conflict details"
                className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-800">Open Conflicts</h4>
              <button
                type="button"
                onClick={loadConflicts}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
            {loadingConflicts ? (
              <p className="text-sm text-slate-500 mt-4">Loading conflicts...</p>
            ) : conflicts.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No open conflicts.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{conflict.title}</p>
                      <button
                        type="button"
                        onClick={() => handleResolveConflict(conflict.id)}
                        className="rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2.5 py-1 text-xs"
                      >
                        Resolve
                      </button>
                    </div>
                    {conflict.description && <p className="text-sm text-slate-600 mt-2">{conflict.description}</p>}
                    <p className="text-xs text-slate-500 mt-2">
                      Created {new Date(conflict.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "users") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">User Management</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Search, filter, edit roles, and maintain student/faculty/admin accounts.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All roles</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name/email/department"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-w-64"
                />
                <button
                  type="button"
                  onClick={loadUsers}
                  className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 text-sm"
                >
                  Apply
                </button>
              </div>
            </div>

            {preferencesError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {preferencesError}
              </div>
            )}

            {loadingUsers ? (
              <p className="text-sm text-slate-500 mt-4">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No users found for current filter.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Email</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Role</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Department</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Roll/Emp No.</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Year</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Section</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((row) => (
                      <tr key={row.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.name || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-44 rounded border border-slate-300 px-2 py-1"
                            />
                          ) : (
                            row.name
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.email || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, email: e.target.value }))}
                              className="w-52 rounded border border-slate-300 px-2 py-1"
                            />
                          ) : (
                            row.email
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {editingUserId === row.id ? (
                            <select
                              value={userEditForm.role || "student"}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, role: e.target.value }))}
                              className="w-28 rounded border border-slate-300 px-2 py-1"
                            >
                              <option value="student">student</option>
                              <option value="faculty">faculty</option>
                              <option value="admin">admin</option>
                            </select>
                          ) : (
                            <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                              {row.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.department || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, department: e.target.value }))}
                              className="w-28 rounded border border-slate-300 px-2 py-1"
                            />
                          ) : (
                            row.department || "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.roll_number || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, roll_number: e.target.value }))}
                              className="w-28 rounded border border-slate-300 px-2 py-1"
                            />
                          ) : (
                            row.roll_number || "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {editingUserId === row.id ? (
                            <input
                              type="number"
                              min="1"
                              value={userEditForm.year || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, year: e.target.value }))}
                              className="w-16 rounded border border-slate-300 px-2 py-1"
                            />
                          ) : (
                            row.year || "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.section || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, section: e.target.value }))}
                              className="w-16 rounded border border-slate-300 px-2 py-1"
                            />
                          ) : (
                            row.section || "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {editingUserId === row.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveUserEdit}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelUserEdit}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startUserEdit(row)}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(row.id)}
                                  className="px-2.5 py-1.5 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "calendar") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Calendar Control</h3>
            <p className="text-sm text-slate-500 mt-2">
              Publish academic events. Only event creator can edit or delete.
            </p>

            {eventMessage && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {eventMessage}
              </div>
            )}
            {eventError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {eventError}
              </div>
            )}

            <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleEventSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  value={eventForm.date}
                  onChange={handleEventChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  value={eventForm.description}
                  onChange={handleEventChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={savingEvent}
                  className={`px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 ${
                    savingEvent ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {savingEvent ? "Saving..." : editingEventId ? "Update Event" : "Add Event"}
                </button>
                {editingEventId && (
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-lg border border-slate-300"
                    onClick={() => {
                      setEditingEventId(null);
                      setEventForm({ title: "", date: "", description: "" });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">Published Events</h4>
            {loadingCalendarEvents ? (
              <p className="text-sm text-slate-500 mt-3">Loading events...</p>
            ) : calendarEvents.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No events yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {calendarEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {event.date} | Created by {event.creator_name} ({event.creator_role})
                        </p>
                      </div>
                      {event.created_by === adminUserId && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEventEdit(event)}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleEventDelete(event.id)}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    {event.description && <p className="text-sm text-slate-600 mt-2">{event.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800">{sectionMessage}</h3>
        <p className="text-sm text-slate-500 mt-2">
          Admin module UI is ready. API integration for this section will be added next.
        </p>
      </div>
    );
  };

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activePage={activePage}
      onPageChange={setActivePage}
      pageTitle={sectionMessage}
      portalLabel="Admin Control Panel"
      userName={adminName}
      onLogout={onLogout}
    >
      {renderContent()}
    </DashboardLayout>
  );
}

export default AdminDashboard;
