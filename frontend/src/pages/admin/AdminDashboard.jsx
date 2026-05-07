import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PreferenceService from "../../services/PreferenceService";
import DashboardService from "../../services/DashboardService";
import EventService from "../../services/EventService";
import CalendarPage from "../student/CalendarPage";

function AdminDashboard({ onLogout }) {
  const DRAFT_STORAGE_PREFIX = "admin_generated_timetable_draft_v1";
  const [activePage, setActivePage] = useState("dashboard");
  const [adminName, setAdminName] = useState("Admin");
  const [adminProfile, setAdminProfile] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("Odd 2026");
  const [preferenceStatusFilter, setPreferenceStatusFilter] = useState("all");
  const [preferenceSearch, setPreferenceSearch] = useState("");
  const [editingPreferenceId, setEditingPreferenceId] = useState(null);
  const [preferenceEditForm, setPreferenceEditForm] = useState({});
  const [generatedTimetable, setGeneratedTimetable] = useState([]);
  const [publishedTimetableRows, setPublishedTimetableRows] = useState([]);
  const [loadingPublishedTimetableRows, setLoadingPublishedTimetableRows] = useState(false);
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
  const [selectedLiveRoom, setSelectedLiveRoom] = useState(null);
  const [facultyApprovals, setFacultyApprovals] = useState({});
  const [generatedUnassignedSlots, setGeneratedUnassignedSlots] = useState([]);
  const [sendingConflictSuggestions, setSendingConflictSuggestions] = useState(false);
  const [conflictSuggestionsSent, setConflictSuggestionsSent] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomRemovalDialog, setRoomRemovalDialog] = useState({
    isOpen: false,
    room: null,
    removing: false,
  });
  const [roomMaintenanceAssignments, setRoomMaintenanceAssignments] = useState({});
  const [shiftingRoomAllocations, setShiftingRoomAllocations] = useState(false);
  const [roomAssignmentFilters, setRoomAssignmentFilters] = useState({
    search: "",
    day: "all",
    faculty: "all",
    room: "all",
  });
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
  const [assignmentReviewRows, setAssignmentReviewRows] = useState([]);
  const [loadingAssignmentReviewRows, setLoadingAssignmentReviewRows] = useState(false);
  const [assignmentReviewFilter, setAssignmentReviewFilter] = useState("pending");
  const [reviewClassrooms, setReviewClassrooms] = useState([]);
  const [loadingReviewClassrooms, setLoadingReviewClassrooms] = useState(false);
  const [selectedReviewClassroomKey, setSelectedReviewClassroomKey] = useState("");
  const [selectedReviewSubmissionId, setSelectedReviewSubmissionId] = useState(null);
  const [dashboardNow, setDashboardNow] = useState(new Date());
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
    { key: "messages", label: "Support" },
    { key: "grade-reviews", label: "Grade Reviews" },
    { key: "notifications", label: "Notifications" },
    { key: "conflicts", label: "Conflict Resolution" },
    { key: "calendar", label: "Calendar Control" },
    { key: "admin-profile", label: "Admin Profile" },
  ];

  const pageTitleMap = {
    dashboard: "Admin Dashboard",
    "admin-profile": "Admin Profile",
    preferences: "Faculty Preferences",
    timetable: "Generate Timetable",
    rooms: "Rooms Management",
    users: "User Management",
    messages: "Support",
    "grade-reviews": "Grade Reviews",
    notifications: "Notifications",
    conflicts: "Conflict Resolution",
    calendar: "Calendar Control",
  };

  const sectionMessage = pageTitleMap[activePage] || "Admin Dashboard";
  const profileDisplayName = adminProfile?.name || adminName || "Admin";
  const profilePhoto =
    adminProfile?.avatar_url ||
    adminProfile?.profile_photo_url ||
    adminProfile?.photo_url ||
    adminProfile?.image_url ||
    "";
  const profileInitials = profileDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const getDraftStorageKey = (semester) => `${DRAFT_STORAGE_PREFIX}:${semester || "all"}`;
  const annotateGeneratedSlots = (slots = []) =>
    (Array.isArray(slots) ? slots : []).map((slot) => ({
      ...slot,
      original_day: slot.original_day || slot.day || "",
      original_start_time: slot.original_start_time || slot.start_time || "",
      original_end_time: slot.original_end_time || slot.end_time || "",
    }));

  const loadDraftFromStorage = (semester) => {
    try {
      const raw = localStorage.getItem(getDraftStorageKey(semester));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.slots)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  };

  const saveDraftToStorage = (semester, slots = []) => {
    try {
      localStorage.setItem(
        getDraftStorageKey(semester),
        JSON.stringify({
          semester: semester || "",
          slots,
          saved_at: new Date().toISOString(),
        })
      );
    } catch (_) {
      // Non-blocking: keep UI usable even if localStorage is unavailable.
    }
  };

  const clearDraftFromStorage = (semester) => {
    try {
      localStorage.removeItem(getDraftStorageKey(semester));
    } catch (_) {
      // Non-blocking.
    }
  };

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

  const loadPublishedTimetableRows = async () => {
    setLoadingPublishedTimetableRows(true);
    try {
      const rows = await PreferenceService.getAdminPublishedTimetable(semesterFilter);
      setPublishedTimetableRows(Array.isArray(rows) ? rows : []);
    } catch (_) {
      setPublishedTimetableRows([]);
    } finally {
      setLoadingPublishedTimetableRows(false);
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
    if (activePage === "dashboard") loadDashboardOverview();
    if (activePage === "preferences") loadPreferences();
    if (activePage === "timetable") {
      loadPreferences();
      loadRooms();
      loadPublishedTimetableRows();
      const storedDraft = loadDraftFromStorage(semesterFilter);
      if (storedDraft && Array.isArray(storedDraft.slots) && storedDraft.slots.length > 0) {
        setGeneratedTimetable(annotateGeneratedSlots(storedDraft.slots));
        const restoredAssignments = {};
        const restoredApprovals = {};
        storedDraft.slots.forEach((slot, idx) => {
          restoredAssignments[`${slot.source_preference_id}-${idx}`] = slot.room;
          restoredApprovals[String(slot.faculty_id || "unknown")] = false;
        });
        setRoomAssignments(restoredAssignments);
        setFacultyApprovals(restoredApprovals);
        setTimetableMessage("Restored last generated draft for this semester.");
        setGeneratedUnassignedSlots([]);
      } else {
        setGeneratedTimetable([]);
        setRoomAssignments({});
        setFacultyApprovals({});
        setGeneratedUnassignedSlots([]);
      }
    }
    if (activePage === "calendar") loadCalendarEvents();
    if (activePage === "rooms") {
      loadRooms();
      loadRoomOccupancy();
      loadRoomLiveStatus();
    }
    if (activePage === "users") loadUsers();
    if (activePage === "messages") {
      loadAdminMessages();
      loadSupportQueries();
    }
    if (activePage === "grade-reviews") {
      loadAssignmentReviews();
      loadReviewClassrooms();
    }
    if (activePage === "conflicts") loadConflicts();
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
    if (activePage === "timetable") {
      loadPublishedTimetableRows();
      const storedDraft = loadDraftFromStorage(semesterFilter);
      if (storedDraft && Array.isArray(storedDraft.slots) && storedDraft.slots.length > 0) {
        setGeneratedTimetable(annotateGeneratedSlots(storedDraft.slots));
        const restoredAssignments = {};
        const restoredApprovals = {};
        storedDraft.slots.forEach((slot, idx) => {
          restoredAssignments[`${slot.source_preference_id}-${idx}`] = slot.room;
          restoredApprovals[String(slot.faculty_id || "unknown")] = false;
        });
        setRoomAssignments(restoredAssignments);
        setFacultyApprovals(restoredApprovals);
      } else {
        setGeneratedTimetable([]);
        setRoomAssignments({});
        setFacultyApprovals({});
        setGeneratedUnassignedSlots([]);
      }
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
        if (res?.user) {
          setAdminProfile(res.user);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setDashboardNow(new Date()), 1000);
    return () => clearInterval(timer);
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

  useEffect(() => {
    if (activePage !== "users") return undefined;
    const timer = setTimeout(() => {
      loadUsers();
    }, 280);
    return () => clearTimeout(timer);
  }, [activePage, userRoleFilter, userSearch]);

  useEffect(() => {
    if (activePage === "grade-reviews") {
      loadAssignmentReviews();
      loadReviewClassrooms();
    }
  }, [assignmentReviewFilter]);

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
      const data = await PreferenceService.getAdminConflicts();
      setConflicts(data || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load conflicts.");
    } finally {
      setLoadingConflicts(false);
    }
  };

  const ensureTimetableConflictLogged = async (semester, unassigned = []) => {
    if (!Array.isArray(unassigned) || unassigned.length === 0) return;
    const conflictTitle = `Auto timetable conflict - ${semester || "Current Semester"}`;
    try {
      const existing = await PreferenceService.getAdminConflicts();
      const alreadyOpen = (existing || []).some(
        (row) => row?.title === conflictTitle && String(row?.status || "").toLowerCase() !== "resolved"
      );
      if (alreadyOpen) return;

      const preview = unassigned
        .slice(0, 5)
        .map((slot, idx) =>
          `${idx + 1}. ${slot?.day || "-"} ${slot?.start_time || "--:--"}-${slot?.end_time || "--:--"} | ${slot?.subject || "Subject"} | ${slot?.faculty_name || "Faculty"}`
        )
        .join("\n");

      await PreferenceService.createAdminConflict({
        title: conflictTitle,
        description:
          `Auto-generated during timetable draft for ${semester || "current semester"}.\n` +
          `Unassigned/conflicting slots: ${unassigned.length}\n\n` +
          `Sample:\n${preview}\n\n` +
          `Please review room capacity/time collisions and resolve from Conflict Resolution.`,
      });
    } catch (_) {
      // Non-blocking: draft generation should still succeed even if conflict logging fails.
    }
  };

  const loadAssignmentReviews = async () => {
    setLoadingAssignmentReviewRows(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAdminAssignmentSubmissionReviews(assignmentReviewFilter || "pending");
      setAssignmentReviewRows(data || []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load assignment grade reviews.");
    } finally {
      setLoadingAssignmentReviewRows(false);
    }
  };

  const loadReviewClassrooms = async () => {
    setLoadingReviewClassrooms(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAdminClassrooms();
      setReviewClassrooms(Array.isArray(data) ? data : []);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to load classrooms.");
      setReviewClassrooms([]);
    } finally {
      setLoadingReviewClassrooms(false);
    }
  };

  const handleAssignmentReviewDecision = async (submissionId, status) => {
    try {
      await PreferenceService.reviewAdminAssignmentSubmission(submissionId, status);
      await loadAssignmentReviews();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to update assignment review status.");
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
      const annotatedRows = annotateGeneratedSlots(res.timetable || []);
      setGeneratedTimetable(annotatedRows);
      setGeneratedUnassignedSlots(Array.isArray(res.unassigned) ? res.unassigned : []);
      setConflictSuggestionsSent(false);
      saveDraftToStorage(semesterFilter, annotatedRows);
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
        await ensureTimetableConflictLogged(semesterFilter, res.unassigned || []);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to generate timetable.";
      setPreferencesError(msg);
      return null;
    } finally {
      setGeneratingTimetable(false);
    }
  };

  const sendConflictSuggestionsToImpactedFaculty = async () => {
    if (!Array.isArray(generatedUnassignedSlots) || generatedUnassignedSlots.length === 0) {
      setPreferencesError("No unassigned slots available for suggestion notification.");
      return;
    }
    setSendingConflictSuggestions(true);
    setPreferencesError("");
    try {
      const res = await PreferenceService.notifyTimetableConflictSuggestions({
        semester: semesterFilter,
        unassigned: generatedUnassignedSlots,
        assigned_slots: generatedTimetable,
      });
      setTimetableMessage(res?.message || "Conflict suggestions sent to impacted faculty.");
      setConflictSuggestionsSent(true);
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to send conflict suggestions.");
    } finally {
      setSendingConflictSuggestions(false);
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
          day: slot.day,
          start_time: slot.start_time,
          end_time: slot.end_time,
        };
      });
      const res = await PreferenceService.publishTimetable({
        semester: semesterFilter,
        slots,
      });
      setTimetableMessage(res.message || "Timetable published.");
      clearDraftFromStorage(semesterFilter);
      await loadPublishedTimetableRows();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to publish timetable.");
    } finally {
      setPublishingTimetable(false);
    }
  };

  const handleGenerateAndPublishForEveryone = async () => {
    setPreferencesError("");
    setTimetableMessage("");
    const generated = await handleGenerateTimetable();
    if (!generated || !Array.isArray(generated.timetable) || generated.timetable.length === 0) {
      return;
    }
    const autoApprovals = {};
    generated.timetable.forEach((slot) => {
      autoApprovals[String(slot.faculty_id || "unknown")] = true;
    });
    setFacultyApprovals(autoApprovals);
    setPublishingTimetable(true);
    try {
      const slots = generated.timetable.map((slot) => {
        const roomMeta = rooms.find((r) => r.name === slot.room);
        return {
          source_preference_id: slot.source_preference_id,
          room: slot.room,
          room_capacity: roomMeta?.capacity || slot.room_capacity,
          day: slot.day,
          start_time: slot.start_time,
          end_time: slot.end_time,
        };
      });
      const res = await PreferenceService.publishTimetable({
        semester: semesterFilter,
        slots,
      });
      setTimetableMessage(res.message || "Timetable generated and published for everyone.");
      clearDraftFromStorage(semesterFilter);
      await loadPublishedTimetableRows();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to publish generated timetable.");
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

  const openRoomRemovalDialog = (room) => {
    setRoomRemovalDialog({ isOpen: true, room, removing: false });
    setRoomMaintenanceAssignments({});
  };

  const closeRoomRemovalDialog = () => {
    setRoomRemovalDialog({ isOpen: false, room: null, removing: false });
    setRoomMaintenanceAssignments({});
  };

  const confirmRemoveRoom = async () => {
    if (!roomRemovalDialog.room?.id) return;
    setRoomRemovalDialog((prev) => ({ ...prev, removing: true }));
    await removeRoom(roomRemovalDialog.room.id);
    setRoomRemovalDialog({ isOpen: false, room: null, removing: false });
  };

  const assignMaintenanceShiftRoom = (slotId, roomName) => {
    setRoomMaintenanceAssignments((prev) => ({
      ...prev,
      [String(slotId)]: roomName,
    }));
  };

  const shiftRoomForMaintenance = async () => {
    const currentRoom = roomRemovalDialog.room;
    if (!currentRoom?.id || !currentRoom?.name) return;
    const occupied = Array.isArray(roomOccupancy[currentRoom.name]) ? roomOccupancy[currentRoom.name] : [];
    if (occupied.length === 0) {
      setPreferencesError("No occupied timetable slots found for this room.");
      return;
    }
    const replacements = occupied.map((slot) => ({
      slot_id: slot.id,
      new_room: roomMaintenanceAssignments[String(slot.id)] || "",
    }));
    const missing = replacements.some((row) => !row.new_room);
    if (missing) {
      setPreferencesError("Select replacement room for each occupied slot before shifting.");
      return;
    }

    setShiftingRoomAllocations(true);
    setPreferencesError("");
    try {
      const res = await PreferenceService.shiftRoomAllocationsForMaintenance(currentRoom.id, {
        semester: semesterFilter,
        replacements,
        mark_inactive: true,
      });
      setTimetableMessage(res?.message || "Room allocations shifted successfully.");
      await loadRooms();
      await loadRoomOccupancy();
      await loadRoomLiveStatus();
      closeRoomRemovalDialog();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to shift room allocations.");
    } finally {
      setShiftingRoomAllocations(false);
    }
  };

  const assignRoom = (slotKey, roomName) => {
    setRoomAssignments((prev) => ({ ...prev, [slotKey]: roomName }));
  };

  const updateGeneratedSlot = (index, field, value) => {
    setGeneratedTimetable((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = { ...row, [field]: value };
      saveDraftToStorage(semesterFilter, next);
      return next;
    });
  };

  const openLiveRoomModal = (room) => {
    setSelectedLiveRoom(room);
  };

  const closeLiveRoomModal = () => {
    setSelectedLiveRoom(null);
  };

  const deriveRoomStatusFromGeneratedTimetable = () => {
    const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const roomMap = {};

    (rooms || []).forEach((room) => {
      roomMap[room.name] = {
        room: room.name,
        capacity: room.capacity,
        status: "idle",
        running_class: null,
        next_class: null,
        occupied_slots: [],
      };
    });

    (generatedTimetable || []).forEach((slot, idx) => {
      const key = `${slot.source_preference_id}-${idx}`;
      const roomName = roomAssignments[key] || slot.room;
      if (!roomName) return;
      if (!roomMap[roomName]) {
        roomMap[roomName] = {
          room: roomName,
          capacity: slot.room_capacity || null,
          status: "idle",
          running_class: null,
          next_class: null,
          occupied_slots: [],
        };
      }
      roomMap[roomName].occupied_slots.push({
        ...slot,
        room: roomName,
      });
    });

    const toMinutes = (text) => {
      if (!text || !String(text).includes(":")) return -1;
      const [h, m] = String(text).split(":").map((n) => Number(n));
      if (Number.isNaN(h) || Number.isNaN(m)) return -1;
      return h * 60 + m;
    };
    const nowMinutes = toMinutes(nowTime);

    Object.values(roomMap).forEach((room) => {
      const todaySlots = room.occupied_slots
        .filter((slot) => slot.day === day)
        .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
      const running = todaySlots.find((slot) => {
        const s = toMinutes(slot.start_time);
        const e = toMinutes(slot.end_time);
        return s <= nowMinutes && nowMinutes < e;
      });
      const next = todaySlots.find((slot) => toMinutes(slot.start_time) > nowMinutes);
      room.running_class = running || null;
      room.next_class = next || null;
      room.status = running ? "running" : "idle";
    });

    const derivedRooms = Object.values(roomMap).sort((a, b) => a.room.localeCompare(b.room));
    const runningCount = derivedRooms.filter((r) => r.status === "running").length;
    const mappedEntries = derivedRooms.filter((r) => (r.occupied_slots || []).length > 0).length;
    const nextSlotTime = derivedRooms
      .map((r) => r.next_class?.start_time)
      .filter(Boolean)
      .sort()[0] || null;

    return {
      day,
      current_time: nowTime,
      running_classes_count: runningCount,
      mapped_entries: mappedEntries,
      next_slot_time: nextSlotTime,
      rooms: derivedRooms,
    };
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

  const toggleUserLoginAccess = async (userRow) => {
    try {
      await PreferenceService.updateAdminUser(userRow.id, { is_active: !Boolean(userRow.is_active) });
      await loadUsers();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to update login access.");
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

  const handleReviewConflict = async (conflictId) => {
    try {
      await PreferenceService.markAdminConflictInReview(conflictId);
      await loadConflicts();
      await loadDashboardOverview();
    } catch (err) {
      setPreferencesError(err.response?.data?.message || "Failed to mark conflict in review.");
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
  const dayOrder = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };
  const preferencesByFaculty = preferences.reduce((acc, pref) => {
    const key = String(pref.faculty_id || "unknown");
    if (!acc[key]) {
      acc[key] = {
        faculty_id: pref.faculty_id,
        faculty_name: pref.faculty_name || "Faculty",
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        approved_slots: [],
      };
    }
    acc[key].total += 1;
    if (pref.status === "approved") {
      acc[key].approved += 1;
      acc[key].approved_slots.push({
        day: pref.day || "-",
        start_time: pref.start_time || "--:--",
        end_time: pref.end_time || "--:--",
        subject: pref.subject || "Subject",
        _sort_day: dayOrder[String(pref.day || "").toLowerCase()] || 99,
      });
    }
    else if (pref.status === "rejected") acc[key].rejected += 1;
    else acc[key].pending += 1;
    return acc;
  }, {});
  const preferenceCollectionRows = Object.values(preferencesByFaculty)
    .map((row) => ({
      ...row,
      approved_slots: (row.approved_slots || []).sort((a, b) => {
        if (a._sort_day !== b._sort_day) return a._sort_day - b._sort_day;
        return String(a.start_time || "").localeCompare(String(b.start_time || ""));
      }),
    }))
    .sort((a, b) => a.faculty_name.localeCompare(b.faculty_name));
  const normalizedPreferenceSearch = preferenceSearch.trim().toLowerCase();
  const filteredPreferences = preferences.filter((pref) => {
    const status = String(pref?.status || "").toLowerCase();
    const statusMatch = preferenceStatusFilter === "all" || status === preferenceStatusFilter;
    if (!statusMatch) return false;
    if (!normalizedPreferenceSearch) return true;

    const searchableFields = [
      pref?.faculty_name,
      pref?.faculty_email,
      pref?.subject,
      pref?.department,
      pref?.section,
      pref?.details,
      pref?.day,
      pref?.semester,
    ]
      .map((value) => String(value || "").toLowerCase());

    const classTarget = `${pref?.department || ""} ${pref?.year || ""} ${pref?.section || ""}`.toLowerCase();
    searchableFields.push(classTarget);

    return searchableFields.some((value) => value.includes(normalizedPreferenceSearch));
  });
  const preferenceStatusOrder = { pending: 0, approved: 1, rejected: 2 };
  const sortedFilteredPreferences = [...filteredPreferences].sort((a, b) => {
    const aStatus = String(a?.status || "").toLowerCase();
    const bStatus = String(b?.status || "").toLowerCase();
    const aRank = Object.prototype.hasOwnProperty.call(preferenceStatusOrder, aStatus) ? preferenceStatusOrder[aStatus] : 99;
    const bRank = Object.prototype.hasOwnProperty.call(preferenceStatusOrder, bStatus) ? preferenceStatusOrder[bStatus] : 99;
    if (aRank !== bRank) return aRank - bRank;
    const aTs = new Date(a?.created_at || 0).getTime();
    const bTs = new Date(b?.created_at || 0).getTime();
    return bTs - aTs;
  });
  const groupedPreferenceRows = sortedFilteredPreferences.reduce((acc, pref) => {
    const key = [
      pref?.faculty_id || pref?.faculty_email || pref?.faculty_name || "faculty",
      pref?.subject || "-",
      pref?.semester || "-",
      pref?.department || "-",
      pref?.year || "-",
      pref?.section || "-",
    ].join("::");
    const existing = acc.find((row) => row.key === key);
    if (existing) {
      existing.preferences.push(pref);
      return acc;
    }
    acc.push({
      key,
      faculty_name: pref?.faculty_name || "Faculty",
      faculty_email: pref?.faculty_email || "",
      subject: pref?.subject || "-",
      semester: pref?.semester || "-",
      department: pref?.department || "-",
      year: pref?.year || "-",
      section: pref?.section || "-",
      student_count: pref?.student_count || "-",
      preferences: [pref],
    });
    return acc;
  }, []);

  const getActivityStyle = (item) => {
    const action = String(item?.action_type || "").toLowerCase();
    const message = String(item?.message || "").toLowerCase();
    if (action.includes("delete") || message.includes("deleted")) {
      return {
        dot: "bg-rose-500",
        chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      };
    }
    if (action.includes("conflict") || message.includes("conflict")) {
      return {
        dot: "bg-amber-500",
        chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      };
    }
    if (action.includes("message") || action.includes("announcement")) {
      return {
        dot: "bg-blue-500",
        chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      };
    }
    return {
      dot: "bg-emerald-500",
      chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
  };

  const renderContent = () => {
    if (activePage === "dashboard") {
      const overview = dashboardOverview;
      const kpis = overview?.kpis || {};
      const actionCenter = overview?.action_center || {};
      const timetableHealth = overview?.timetable_health || {};
      const unassignedPreferenceCount = Math.max(
        Number(timetableHealth.missing_assignments_count || 0),
        Number(actionCenter.unassigned_slots_count || 0)
      );
      const live = overview?.live_room_status || {};
      const facultyQueue = overview?.faculty_approval_queue || [];
      const announce = overview?.announcements_snapshot || { recent: [], audience_breakdown: {} };
      const userSnap = overview?.user_management_snapshot || { role_breakdown: {} };
      const conflictSnap = overview?.conflict_resolution_snapshot || { open_conflicts: [] };
      const calendarSnap = overview?.calendar_deadlines || { today: [], upcoming: [] };
      const activity = overview?.recent_activity_feed || [];
      const recentActivityCount = Array.isArray(activity) ? activity.length : 0;
      const latestActivityAt = recentActivityCount > 0 ? activity[0]?.created_at : null;

      return (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 shadow-lg dark:border-slate-700/70">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.22),transparent_35%)]" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-white">Control Center</h3>
                <p className="mt-1 text-sm text-slate-200">Operational overview with priority actions.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-right text-white backdrop-blur-sm">
                  <span className="text-[11px] font-medium text-slate-200">
                    {dashboardNow.toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-sm font-semibold">
                    {dashboardNow.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <select
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40"
                >
                  {semesterOptions.map((option) => (
                    <option key={option} value={option} className="bg-white text-slate-900">
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadDashboardOverview}
                  className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
                >
                  Refresh
                </button>
              </div>
            </div>
            {preferencesError && (
              <div className="relative mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {preferencesError}
              </div>
            )}
          </div>

          {loadingDashboardOverview ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {[
                  { label: "Total Students", value: kpis.total_students ?? 0, accent: "from-cyan-500/20 to-blue-500/20" },
                  { label: "Total Faculty", value: kpis.total_faculty ?? 0, accent: "from-emerald-500/20 to-teal-500/20" },
                  { label: "Pending Preferences", value: kpis.pending_faculty_preferences ?? 0, accent: "from-amber-500/20 to-orange-500/20" },
                  { label: "Rooms Occupied Now", value: kpis.rooms_occupied_now ?? 0, accent: "from-indigo-500/20 to-blue-500/20" },
                  { label: "Conflicts Pending", value: kpis.conflicts_pending ?? 0, accent: "from-rose-500/20 to-red-500/20" },
                  { label: "Messages Sent Today", value: kpis.messages_sent_today ?? 0, accent: "from-violet-500/20 to-fuchsia-500/20" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl border border-slate-200 bg-gradient-to-br ${item.accent} p-4 shadow-sm dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-800/80`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-5 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Action Center</h4>
                    <button
                      type="button"
                      onClick={() => setActivePage("preferences")}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Open Preferences
                    </button>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setActivePage("preferences")}
                      className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-left transition hover:bg-amber-100/80 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-900/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">Preferences awaiting approval</span>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-slate-900 dark:text-amber-300">
                        {(actionCenter.preferences_awaiting_approval || []).length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePage("timetable")}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-700/70"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${actionCenter.timetable_published ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="font-medium text-slate-800 dark:text-slate-100">Timetable status</span>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionCenter.timetable_published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {actionCenter.timetable_published ? "Published" : "Not Published"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePage("conflicts")}
                      className="flex w-full items-center justify-between rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-left transition hover:bg-rose-100/70 dark:border-rose-800 dark:bg-rose-950/25 dark:hover:bg-rose-900/35"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">Room conflicts needing resolution</span>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-slate-900 dark:text-rose-300">
                        {(actionCenter.room_conflicts || []).length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePage("timetable")}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-700/70"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">Unassigned slots (no room found)</span>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {actionCenter.unassigned_slots_count ?? 0}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-5 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Timetable Health</h4>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        (timetableHealth.status || "Draft").toLowerCase() === "published"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {(timetableHealth.status || "Draft").toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">Approved</p>
                      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{timetableHealth.approved_slots ?? 0}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Approved faculty slots ready for scheduling.</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">Requested</p>
                      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{timetableHealth.total_requested_slots ?? 0}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Total approved preferences submitted by faculty.</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-red-50 px-3 py-2.5 sm:col-span-2 dark:border-red-800 dark:bg-red-950/30">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-red-600 dark:text-red-300">
                        Unassigned Preferences (Needs Reallocation)
                      </p>
                      <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-200">{unassignedPreferenceCount}</p>
                      <p className="mt-1 text-[11px] text-red-700/80 dark:text-red-200/80">
                        Faculty preferences not assigned to a final timetable slot yet.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleGenerateTimetable}
                      className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      Generate Draft
                    </button>
                    <button
                      onClick={publishGeneratedTimetable}
                      className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    >
                      Publish
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="pointer-events-none absolute -left-10 -top-8 h-36 w-36 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-700/20" />
                <div className="pointer-events-none absolute -right-12 -bottom-10 h-40 w-40 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-700/15" />
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/35 p-5 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Live Room Status</h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{live.day || "-"} | {live.current_time || "--:--"}</p>
                    </div>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                      LIVE
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Running</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{live.running_classes_count ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Occupied</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{live.rooms_occupied_now ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">Free</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{live.free_rooms_now ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Next Slot</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{live.next_slot_time || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50/30 p-5 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                  <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Faculty Approval Queue</h4>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {facultyQueue.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No faculty approvals pending.
                      </div>
                    ) : (
                      facultyQueue.map((row) => (
                        <div key={row.faculty_id} className="rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-800 dark:text-slate-100">{row.faculty_name}</p>
                            <button
                              type="button"
                              onClick={() => setActivePage("preferences")}
                              className="rounded-md border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              Review
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Approved {row.approved}</span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Pending {row.pending}</span>
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Rejected {row.rejected}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/30 p-5 shadow-sm ring-1 ring-indigo-100/40 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 dark:ring-slate-700/60">
                  <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-indigo-300/20 blur-2xl dark:bg-indigo-500/10" />
                  <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300">Communication</p>
                      <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Announcements Snapshot</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePage("messages")}
                      className="rounded-lg border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-900/70 dark:text-indigo-200 dark:hover:bg-indigo-950/40"
                    >
                      Send Message
                    </button>
                  </div>
                  <div className="relative mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Faculty {announce.audience_breakdown?.faculty ?? 0}
                    </span>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      Student {announce.audience_breakdown?.student ?? 0}
                    </span>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                      All {announce.audience_breakdown?.all ?? 0}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {(announce.recent || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                        No recent announcements.
                      </div>
                    ) : (
                      (announce.recent || []).slice(0, 5).map((msg) => (
                        <div key={msg.id} className="rounded-xl border border-slate-200/90 bg-white/80 px-3.5 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/55">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">{msg.subject}</p>
                          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{msg.recipient_role}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="relative grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="pointer-events-none absolute left-1/3 -top-10 h-36 w-36 rounded-full bg-fuchsia-200/20 blur-3xl dark:bg-fuchsia-700/10" />
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/30 p-5 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                  <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">User Management Snapshot</h4>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">New This Week</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{userSnap.new_accounts_this_week ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Incomplete</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{userSnap.incomplete_profiles_count ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-blue-700 dark:text-blue-300">Students</p>
                      <p className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{userSnap.role_breakdown?.student ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">Faculty</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{userSnap.role_breakdown?.faculty ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30 col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">Admin</p>
                      <p className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{userSnap.role_breakdown?.admin ?? 0}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-rose-50/25 p-5 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Conflict Resolution Snapshot</h4>
                    <button
                      type="button"
                      onClick={() => setActivePage("conflicts")}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Open List
                    </button>
                  </div>
                  <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                    <p>Open conflicts: <span className="font-semibold">{conflictSnap.open_conflicts_count ?? 0}</span></p>
                    <p>Oldest pending age: <span className="font-semibold">{conflictSnap.oldest_pending_age_days ?? 0} day(s)</span></p>
                  </div>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {(conflictSnap.open_conflicts || []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No open conflicts.
                      </div>
                    ) : (
                      (conflictSnap.open_conflicts || []).map((c) => (
                        <div key={c.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-5 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                  <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Calendar & Deadlines</h4>
                  <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Today: {(calendarSnap.today || []).length} events</p>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {(calendarSnap.upcoming || []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No upcoming events.
                      </div>
                    ) : (
                      (calendarSnap.upcoming || []).slice(0, 5).map((event) => (
                        <div key={event.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{event.date}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Recent Activity Feed</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {recentActivityCount} recent item(s)
                      {latestActivityAt ? ` | Latest: ${new Date(latestActivityAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Audit Stream
                  </span>
                </div>
                {(activity || []).length === 0 ? (
                  <p className="text-sm text-slate-500 mt-3 dark:text-slate-400">No activity yet.</p>
                ) : (
                  <div className="mt-4 max-h-80 overflow-y-auto pr-1">
                    {activity.map((item) => (
                      <div key={item.id} className="relative pl-6 pb-3 last:pb-0">
                        <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${getActivityStyle(item).dot}`} />
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.message}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getActivityStyle(item).chip}`}>
                              {(item.action_type || "activity").replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {item.actor_name} | {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
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
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_10%_90%,rgba(16,185,129,0.12),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_42%),radial-gradient(circle_at_10%_90%,rgba(52,211,153,0.1),transparent_36%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Faculty Preferences</h3>
              <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
                Review, edit, approve, or reject faculty slot requests.
              </p>
            </div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {semesterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="relative mt-4 grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
            <select
              value={preferenceStatusFilter}
              onChange={(e) => setPreferenceStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-blue-900/40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input
              value={preferenceSearch}
              onChange={(e) => setPreferenceSearch(e.target.value)}
              placeholder="Search by faculty, email, subject, or class target..."
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-blue-900/40"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Showing {filteredPreferences.length} of {preferences.length}
            </div>
          </div>

          {preferencesError && (
            <div className="relative mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {preferencesError}
            </div>
          )}

          {loadingPreferences ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading preferences...</p>
          ) : filteredPreferences.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
              No preferences match the current filters.
            </div>
          ) : (
            <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="max-h-[520px] overflow-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm dark:bg-slate-800/95">
                  <tr>
                    <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Faculty</th>
                    <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Subject</th>
                    <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Students</th>
                    <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Slot</th>
                    <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Semester</th>
                    <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Class Target</th>
                    <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Details</th>
                    <th className="w-[120px] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Status</th>
                    <th className="w-[130px] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedPreferenceRows.map((group) =>
                    group.preferences.map((pref, idx) => (
                      <tr key={pref.id} className="border-t border-slate-200 align-top transition-colors hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          {idx === 0 ? (
                            <>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.faculty_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{group.faculty_email}</p>
                              <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                {group.preferences.length} slot(s)
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-300">...</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{group.subject}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{pref.student_count || group.student_count || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{`${pref.day} | ${pref.start_time} - ${pref.end_time}`}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{group.semester}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{`${group.department || "-"} / ${group.year || "-"} / ${group.section || "-"}`}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{pref.details || "-"}</td>
                        <td className="w-[120px] px-4 py-3 align-top whitespace-nowrap">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                              pref.status === "approved"
                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                                : pref.status === "rejected"
                                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {pref.status}
                          </span>
                        </td>
                        <td className="w-[130px] px-4 py-3 align-top">
                          {editingPreferenceId === pref.id ? (
                            <div className="w-[112px] space-y-2">
                              <select
                                value={preferenceEditForm.status || "pending"}
                                onChange={(e) => setPreferenceEditForm((prev) => ({ ...prev, status: e.target.value }))}
                                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                              >
                                <option value="pending">pending</option>
                                <option value="approved">approved</option>
                                <option value="rejected">rejected</option>
                              </select>
                              <div className="flex flex-col gap-1.5">
                                <button onClick={savePreferenceEdit} className="px-2.5 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm">Save</button>
                                <button
                                  onClick={() => {
                                    setEditingPreferenceId(null);
                                    setPreferenceEditForm({});
                                  }}
                                  className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => updateStatus(pref.id, "approved")} className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 shadow-sm">Approve</button>
                              <button onClick={() => updateStatus(pref.id, "rejected")} className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm">Reject</button>
                              <button onClick={() => startPreferenceEdit(pref)} className="px-3 py-1.5 text-xs rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200">Edit</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activePage === "timetable") {
      const assignmentRows = generatedTimetable.map((slot, idx) => ({ slot, idx }));
      const assignmentDayOptions = Array.from(new Set(generatedTimetable.map((slot) => slot.day).filter(Boolean)));
      const assignmentFacultyOptions = Array.from(
        new Set(generatedTimetable.map((slot) => slot.faculty_name).filter(Boolean))
      );
      const assignmentRoomOptions = Array.from(new Set(rooms.map((room) => room.name).filter(Boolean)));
      const filteredAssignmentRows = assignmentRows.filter(({ slot }) => {
        const assignedRoom = slot.room || "";
        const query = roomAssignmentFilters.search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [slot.subject, slot.faculty_name, slot.day, slot.start_time, slot.end_time, assignedRoom]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesDay = roomAssignmentFilters.day === "all" || slot.day === roomAssignmentFilters.day;
        const matchesFaculty =
          roomAssignmentFilters.faculty === "all" || slot.faculty_name === roomAssignmentFilters.faculty;
        const matchesRoom = roomAssignmentFilters.room === "all" || assignedRoom === roomAssignmentFilters.room;
        return matchesSearch && matchesDay && matchesFaculty && matchesRoom;
      });
      return (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-cyan-50/35 p-6 shadow-sm ring-1 ring-cyan-100/50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70 dark:ring-slate-800/70">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-700/20" />
            <div className="relative">
            <h4 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Collected Teacher Preferences</h4>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
              Single admin view of all submitted preferences for {semesterFilter}.
            </p>
            {loadingPreferences ? (
              <p className="text-sm text-slate-500 mt-3 dark:text-slate-400">Loading preference collection...</p>
            ) : preferenceCollectionRows.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                No preferences found for this semester.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden dark:border-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Faculty</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Total</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Approved</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Pending</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Rejected</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Approved Slot Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preferenceCollectionRows.map((row) => (
                      <tr key={String(row.faculty_id || row.faculty_name)} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{row.faculty_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{row.total}</td>
                        <td className="px-4 py-3 text-sm text-emerald-700 font-medium">{row.approved}</td>
                        <td className="px-4 py-3 text-sm text-amber-700 font-medium">{row.pending}</td>
                        <td className="px-4 py-3 text-sm text-red-700 font-medium">{row.rejected}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {row.approved_slots.length === 0 ? (
                            <span className="text-slate-400 dark:text-slate-500">No approved slots</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {row.approved_slots.map((slot, idx) => (
                                <span
                                  key={`${String(row.faculty_id || row.faculty_name)}-${slot.day}-${slot.start_time}-${idx}`}
                                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  title={`${slot.day} ${slot.start_time}-${slot.end_time} | ${slot.subject}`}
                                >
                                  {slot.day} {slot.start_time}-{slot.end_time} | {slot.subject}
                                </span>
                              ))}
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
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50/30 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -left-10 -bottom-14 h-40 w-40 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-700/15" />
            <div className="relative">
            <h3 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Generate Timetable</h3>
            <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
              Build semester timetable from approved preferences, then publish final slots.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                className={`px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors ${
                  generatingTimetable ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {generatingTimetable ? "Generating..." : "Generate Draft"}
              </button>
              <button
                onClick={publishGeneratedTimetable}
                disabled={publishingTimetable || generatedTimetable.length === 0 || !allFacultiesApproved}
                className={`px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors ${
                  publishingTimetable || generatedTimetable.length === 0 || !allFacultiesApproved
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                {publishingTimetable ? "Publishing..." : "Publish Timetable"}
              </button>
              <button
                onClick={handleGenerateAndPublishForEveryone}
                disabled={generatingTimetable || publishingTimetable}
                className={`px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors ${
                  generatingTimetable || publishingTimetable ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                Generate and Publish for Everyone
              </button>
            </div>
            {timetableMessage && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                {timetableMessage}
              </div>
            )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-6 shadow-sm ring-1 ring-emerald-100/50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70 dark:ring-slate-800/70">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-700/15" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Visibility & Sync</h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Changes become visible to faculty and students only after publish.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadPublishedTimetableRows}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Refresh Visibility
                  </button>
                  <button
                    type="button"
                    onClick={publishGeneratedTimetable}
                    disabled={publishingTimetable || generatedTimetable.length === 0 || !allFacultiesApproved}
                    className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${
                      publishingTimetable || generatedTimetable.length === 0 || !allFacultiesApproved
                        ? "bg-emerald-300 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    Sync Latest To Everyone
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Draft Slots</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{generatedTimetable.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Published Slots</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {loadingPublishedTimetableRows ? "..." : publishedTimetableRows.length}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Current Semester</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{semesterFilter}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-indigo-200/20 blur-2xl dark:bg-indigo-700/10" />
            <div className="relative">
            <h4 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Generated Timetable Draft</h4>
            {generatedTimetable.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                No generated timetable yet.
              </div>
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={sendConflictSuggestionsToImpactedFaculty}
                        disabled={sendingConflictSuggestions || generatedUnassignedSlots.length === 0}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${
                          sendingConflictSuggestions || generatedUnassignedSlots.length === 0
                            ? "cursor-not-allowed bg-slate-200 text-slate-500"
                            : conflictSuggestionsSent
                              ? "bg-emerald-600 text-white ring-2 ring-emerald-200 hover:bg-emerald-700"
                              : "bg-amber-600 text-white hover:bg-amber-700"
                        }`}
                      >
                        {sendingConflictSuggestions
                          ? "Sending..."
                          : conflictSuggestionsSent
                            ? "Suggestions Sent Successfully"
                            : "Send Suggestions to Impacted Faculty"}
                      </button>
                      <button
                        type="button"
                        onClick={approveAllFaculties}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Approve All Faculties
                      </button>
                    </div>
                  </div>
                  {generatedUnassignedSlots.length > 0 && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      {generatedUnassignedSlots.length} slot(s) are unassigned. Send professional suggestions to impacted faculty.
                    </p>
                  )}
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
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <select
                                value={slot.day || ""}
                                onChange={(e) => updateGeneratedSlot(idx, "day", e.target.value)}
                                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              >
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                                  <option key={day} value={day}>{day}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">{slot.subject}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{slot.faculty_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={slot.start_time || ""}
                                  onChange={(e) => updateGeneratedSlot(idx, "start_time", e.target.value)}
                                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                />
                                <span>-</span>
                                <input
                                  type="time"
                                  value={slot.end_time || ""}
                                  onChange={(e) => updateGeneratedSlot(idx, "end_time", e.target.value)}
                                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                />
                              </div>
                              {(slot.day !== slot.original_day ||
                                slot.start_time !== slot.original_start_time ||
                                slot.end_time !== slot.original_end_time) && (
                                <p className="mt-1 text-xs font-semibold text-amber-700">
                                  Changed from {slot.original_day} {slot.original_start_time}-{slot.original_end_time}
                                </p>
                              )}
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
        </div>
      );
    }

    if (activePage === "rooms") {
      const derivedRoomLive = deriveRoomStatusFromGeneratedTimetable();
      const assignmentRows = generatedTimetable.map((slot, idx) => ({ slot, idx }));
      const assignmentDayOptions = Array.from(new Set(generatedTimetable.map((slot) => slot.day).filter(Boolean)));
      const assignmentFacultyOptions = Array.from(
        new Set(generatedTimetable.map((slot) => slot.faculty_name).filter(Boolean))
      );
      const assignmentRoomOptions = Array.from(new Set(rooms.map((room) => room.name).filter(Boolean)));
      const filteredAssignmentRows = assignmentRows.filter(({ slot }) => {
        const assignedRoom = slot.room || "";
        const query = roomAssignmentFilters.search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [slot.subject, slot.faculty_name, slot.day, slot.start_time, slot.end_time, assignedRoom]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesDay = roomAssignmentFilters.day === "all" || slot.day === roomAssignmentFilters.day;
        const matchesFaculty =
          roomAssignmentFilters.faculty === "all" || slot.faculty_name === roomAssignmentFilters.faculty;
        const matchesRoom = roomAssignmentFilters.room === "all" || assignedRoom === roomAssignmentFilters.room;
        return matchesSearch && matchesDay && matchesFaculty && matchesRoom;
      });
      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/35 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-700/20" />
            <div className="pointer-events-none absolute -left-10 -bottom-14 h-36 w-36 rounded-full bg-blue-200/25 blur-3xl dark:bg-blue-700/15" />
            <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-300">Infrastructure Desk</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Rooms Management</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Manage room capacities and monitor live occupancy by timetable slot.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 text-right shadow-sm dark:border-cyan-800 dark:bg-slate-900/70">
                <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-700 dark:text-cyan-300">Registered Rooms</p>
                <p className="mt-1 text-xl font-bold text-cyan-700 dark:text-cyan-300">{rooms.length}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                name="name"
                value={newRoom.name}
                onChange={handleRoomInput}
                placeholder="Room name (e.g. D-401)"
                className="rounded-lg border border-cyan-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-900/40"
              />
              <input
                name="capacity"
                type="number"
                min="1"
                value={newRoom.capacity}
                onChange={handleRoomInput}
                placeholder="Capacity"
                className="rounded-lg border border-cyan-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-900/40"
              />
              <button
                onClick={addRoom}
                className="rounded-lg bg-cyan-600 px-4 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-700"
              >
                Add Room
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {loadingRooms ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading rooms...</p>
              ) : rooms.map((room) => (
                <div
                  key={room.id || room.name}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {room.name} ({room.capacity})
                  </span>
                  <button
                    onClick={() => openRoomRemovalDialog(room)}
                    className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/25 dark:text-rose-300 dark:hover:bg-rose-900/40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            </div>
          </div>

          {roomRemovalDialog.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]">
              <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                      Remove Room: {roomRemovalDialog.room?.name}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Review current timetable allocations before removing this room.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeRoomRemovalDialog}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Timetable Allocation
                  </p>
                  {Array.isArray(roomOccupancy[roomRemovalDialog.room?.name]) &&
                  roomOccupancy[roomRemovalDialog.room?.name].length > 0 ? (
                    <div className="mt-3 max-h-56 overflow-auto space-y-2 pr-1">
                      {roomOccupancy[roomRemovalDialog.room?.name].map((slot, idx) => (
                        <div
                          key={`${slot.id || slot.source_preference_id || idx}-${idx}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60"
                        >
                          <p className="font-medium text-slate-800 dark:text-slate-100">
                            {slot.day} | {slot.start_time}-{slot.end_time}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {slot.subject} | {slot.faculty_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"} | {slot.semester || "-"}
                          </p>
                          <div className="mt-2">
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                              Shift To Room
                            </label>
                            <select
                              value={roomMaintenanceAssignments[String(slot.id)] || ""}
                              onChange={(e) => assignMaintenanceShiftRoom(slot.id, e.target.value)}
                              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                              <option value="">Select replacement room</option>
                              {(rooms || [])
                                .filter((room) => room.name !== roomRemovalDialog.room?.name && room.capacity >= (slot.student_count || 0))
                                .map((room) => (
                                  <option key={`${slot.id}-${room.name}`} value={room.name}>
                                    {room.name} ({room.capacity})
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                      No timetable slots currently mapped to this room.
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  If this room is used in published timetable, removal can be blocked by system policy.
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={shiftRoomForMaintenance}
                    disabled={
                      shiftingRoomAllocations ||
                      !Array.isArray(roomOccupancy[roomRemovalDialog.room?.name]) ||
                      roomOccupancy[roomRemovalDialog.room?.name].length === 0
                    }
                    className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                      shiftingRoomAllocations ||
                      !Array.isArray(roomOccupancy[roomRemovalDialog.room?.name]) ||
                      roomOccupancy[roomRemovalDialog.room?.name].length === 0
                        ? "cursor-not-allowed bg-blue-300"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {shiftingRoomAllocations ? "Shifting..." : "Reassign Slots And Mark Maintenance"}
                  </button>
                  <button
                    type="button"
                    onClick={closeRoomRemovalDialog}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmRemoveRoom}
                    disabled={roomRemovalDialog.removing || !roomRemovalDialog.room?.id}
                    className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                      roomRemovalDialog.removing || !roomRemovalDialog.room?.id
                        ? "bg-red-300 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {roomRemovalDialog.removing ? "Removing..." : "Remove Room"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-emerald-50/35 p-6 shadow-sm ring-1 ring-emerald-100/50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70 dark:ring-slate-800/80">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-700/15" />
            <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">Availability Scanner</p>
                <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Check Vacant Rooms By Time</h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Filter by day, timing, and semester to identify available classrooms.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-right shadow-sm dark:border-emerald-800 dark:bg-slate-900/70">
                <p className="text-[11px] uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">Latest Results</p>
                <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-300">{roomAvailability.length}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-200/80 bg-white/85 p-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/45">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Day
                  </label>
                  <select
                    value={roomFilter.day}
                    onChange={(e) => setRoomFilter((prev) => ({ ...prev, day: e.target.value }))}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/30"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={roomFilter.start_time}
                    onChange={(e) => setRoomFilter((prev) => ({ ...prev, start_time: e.target.value }))}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={roomFilter.end_time}
                    onChange={(e) => setRoomFilter((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Semester
                  </label>
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/30"
                  >
                    {semesterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={checkRoomAvailability}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    {loadingRoomAvailability ? "Checking..." : "Check Availability"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {roomAvailability.map((entry) => (
                <div
                  key={entry.room.id}
                  className={`rounded-lg border p-3 ${
                    entry.is_vacant
                      ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:border-red-800 dark:bg-red-950/30"
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
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-cyan-50/25 p-6 shadow-sm ring-1 ring-slate-100/70 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/75 dark:ring-slate-800/80">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-700/10" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-slate-200/30 blur-2xl dark:bg-slate-700/20" />
            <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-300">Live Monitoring</p>
                <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Real-Time Room Status</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {derivedRoomLive.day || "-"} at {derivedRoomLive.current_time || "--:--"} | Running now:{" "}
                  {derivedRoomLive.running_classes_count}
                  {derivedRoomLive.next_slot_time ? ` | Next slot: ${derivedRoomLive.next_slot_time}` : ""}
                </p>
                <p className="mt-2 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:border-cyan-800 dark:bg-cyan-900/25 dark:text-cyan-300">
                  Generated timetable mapped rooms: {derivedRoomLive.mapped_entries}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadRoomLiveStatus();
                }}
                className="rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Refresh Live
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {loadingLiveRoomStatus ? (
                <p className="text-sm text-slate-500">Loading live room data...</p>
              ) : derivedRoomLive.rooms.length === 0 ? (
                <p className="text-sm text-slate-500">No live room status available.</p>
              ) : (
                derivedRoomLive.rooms.map((room) => (
                  <div
                    key={room.room}
                    className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      room.status === "running"
                        ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/90 dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-900/30"
                        : "border-slate-200 bg-gradient-to-br from-white to-slate-50/85 dark:border-slate-700 dark:from-slate-900/75 dark:to-slate-800/65"
                    }`}
                    onClick={() => openLiveRoomModal(room)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {room.room} {room.capacity ? `(${room.capacity})` : ""}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          room.status === "running"
                            ? "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-300"
                            : "border border-slate-300 bg-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
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

                    <div className="pointer-events-none absolute left-1/2 top-0 z-30 w-72 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-xs text-slate-700 opacity-0 shadow-xl backdrop-blur-sm transition-all duration-150 group-hover:opacity-100 group-hover:-translate-y-[calc(100%+16px)] dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                      <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95" />
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Quick Room Snapshot</p>
                      {room.running_class ? (
                        <p className="mt-1 leading-5">
                          Running now: {room.running_class.subject} | {room.running_class.start_time}-{room.running_class.end_time} |{" "}
                          {room.running_class.faculty_name}
                        </p>
                      ) : room.next_class ? (
                        <p className="mt-1 leading-5">
                          Next class: {room.next_class.subject} | {room.next_class.start_time}-{room.next_class.end_time} |{" "}
                          {room.next_class.faculty_name}
                        </p>
                      ) : (
                        <p className="mt-1 leading-5">No upcoming class today.</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Click for full room details.</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </div>

          {selectedLiveRoom && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]">
              <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                      Room Details: {selectedLiveRoom.room}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Capacity: {selectedLiveRoom.capacity || "-"} | Current status:{" "}
                      {selectedLiveRoom.status === "running" ? "Running" : "Idle"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeLiveRoomModal}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                {selectedLiveRoom.running_class && (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <p className="font-semibold">Running Class</p>
                    <p className="mt-1">
                      {selectedLiveRoom.running_class.subject} | {selectedLiveRoom.running_class.start_time}-
                      {selectedLiveRoom.running_class.end_time} | {selectedLiveRoom.running_class.faculty_name}
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Timetable Entries For This Room
                  </p>
                  {Array.isArray(selectedLiveRoom.occupied_slots) && selectedLiveRoom.occupied_slots.length > 0 ? (
                    <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                      {selectedLiveRoom.occupied_slots.map((slot, idx) => (
                        <div
                          key={`${slot.id || slot.source_preference_id || idx}-${idx}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60"
                        >
                          <p className="font-medium text-slate-800 dark:text-slate-100">
                            {slot.day} | {slot.start_time}-{slot.end_time}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {slot.subject} | {slot.faculty_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"} | {slot.semester || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No timetable entries found for this room.</p>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={closeLiveRoomModal}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full bg-indigo-200/25 blur-3xl dark:bg-indigo-700/15" />
            <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-indigo-700 dark:text-indigo-300">Room Allocation</p>
                <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Assign Rooms to Timetable</h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Allocate available rooms to each generated slot before publishing.
                </p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-right shadow-sm dark:border-indigo-800 dark:bg-indigo-900/20">
                <p className="text-[11px] uppercase tracking-[0.08em] text-indigo-700 dark:text-indigo-300">Generated Slots</p>
                <p className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">{generatedTimetable.length}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-indigo-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/65">
              <div className="flex flex-wrap items-end gap-2.5">
                <div className="min-w-56 flex-1">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Search
                  </label>
                  <input
                    value={roomAssignmentFilters.search}
                    onChange={(e) =>
                      setRoomAssignmentFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    placeholder="Subject, faculty, time..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Day
                  </label>
                  <select
                    value={roomAssignmentFilters.day}
                    onChange={(e) =>
                      setRoomAssignmentFilters((prev) => ({
                        ...prev,
                        day: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                  >
                    <option value="all">All Days</option>
                    {assignmentDayOptions.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Faculty
                  </label>
                  <select
                    value={roomAssignmentFilters.faculty}
                    onChange={(e) =>
                      setRoomAssignmentFilters((prev) => ({
                        ...prev,
                        faculty: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                  >
                    <option value="all">All Faculty</option>
                    {assignmentFacultyOptions.map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Room
                  </label>
                  <select
                    value={roomAssignmentFilters.room}
                    onChange={(e) =>
                      setRoomAssignmentFilters((prev) => ({
                        ...prev,
                        room: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                  >
                    <option value="all">All Rooms</option>
                    {assignmentRoomOptions.map((roomName) => (
                      <option key={roomName} value={roomName}>
                        {roomName}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRoomAssignmentFilters({
                      search: "",
                      day: "all",
                      faculty: "all",
                      room: "all",
                    })
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Clear
                </button>
              </div>
            </div>
            {generatedTimetable.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M3 9h18M8 4v4M16 4v4M8 13h3M13 13h3M8 17h3M13 17h3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No generated timetable draft found.</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Generate a timetable first in the <span className="font-medium">Generate Timetable</span> section.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm ring-1 ring-slate-100/60 dark:border-slate-700 dark:bg-slate-900/55 dark:ring-slate-800/70">
                <div className="max-h-[28rem] overflow-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-indigo-50/60 dark:from-slate-800 dark:to-slate-800">
                    <tr>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Subject</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Faculty</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Students</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Time</th>
                      <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-4 py-3 dark:text-slate-300">Assigned Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignmentRows.map(({ slot, idx }) => {
                      const key = `${slot.source_preference_id}-${idx}`;
                      return (
                        <tr key={key} className="border-t border-slate-200 transition hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:bg-slate-800/45">
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">{slot.subject}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{slot.faculty_name}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {slot.student_count || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            <span className="font-medium text-slate-800 dark:text-slate-100">{slot.day}</span>
                            <span className="text-slate-500 dark:text-slate-400"> | {slot.start_time} - {slot.end_time}</span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={roomAssignments[key] || slot.room}
                              onChange={(e) => assignRoom(key, e.target.value)}
                              className="min-w-44 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
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
                    {filteredAssignmentRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                          No timetable rows match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "messages") {
      const announcementHistory = (adminMessages || []).filter((msg) => {
        const subject = String(msg?.subject || "").toLowerCase();
        if (subject.includes("system conflict alert")) return false;
        if (subject.includes("timetable conflict alert")) return false;
        if (subject.includes("timetable slot updated")) return false;
        return true;
      });
      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-700/10" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-300">Announcement Broadcast</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Admin Announcements</h3>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    Publish official announcements only. These are reflected in user Announcement sections.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 text-right shadow-sm dark:border-cyan-800 dark:bg-slate-900/70">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Current Audience</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">{messageForm.recipient_role === "all" ? "All Users" : messageForm.recipient_role}</p>
                </div>
              </div>

              <form onSubmit={sendAdminMessage} className="mt-5 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 md:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Audience</label>
                    <select
                      name="recipient_role"
                      value={messageForm.recipient_role}
                      onChange={handleMessageFormChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-900/40"
                    >
                      <option value="faculty">Teacher (Faculty)</option>
                      <option value="student">Student</option>
                      <option value="all">Student + Teacher (All)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Subject</label>
                    <input
                      name="subject"
                      value={messageForm.subject}
                      onChange={handleMessageFormChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-900/40"
                      placeholder="Class schedule update"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Message</label>
                    <textarea
                      name="body"
                      rows={5}
                      value={messageForm.body}
                      onChange={handleMessageFormChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-900/40"
                      placeholder="Write your announcement..."
                      required
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Only announcement communication is published from this panel.</p>
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/40"
                  >
                    Publish Announcement
                  </button>
                </div>
              </form>
            </div>

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

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -top-14 -left-10 h-36 w-36 rounded-full bg-blue-200/25 blur-3xl dark:bg-blue-700/10" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">Archive</p>
                <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Announcement History</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Only published announcements are shown here.</p>
              </div>
              <div className="w-full sm:w-auto">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Filter Audience</label>
                <select
                  value={messageRecipientFilter}
                  onChange={(e) => setMessageRecipientFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40 sm:min-w-[220px]"
                >
                  <option value="">All audiences</option>
                  <option value="faculty">Teacher (Faculty)</option>
                  <option value="student">Student</option>
                  <option value="all">Student + Teacher (All)</option>
                </select>
              </div>
            </div>

            {loadingAdminMessages ? (
              <p className="text-sm text-slate-500 mt-4">Loading messages...</p>
            ) : announcementHistory.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No messages sent yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {announcementHistory.map((msg) => (
                  <div key={msg.id} className="rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/55">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">{msg.subject}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          By {msg.sender_name} | {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`text-xs rounded-full px-2.5 py-1 font-semibold border ${
                          msg.recipient_role === "faculty"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                            : msg.recipient_role === "student"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                              : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                        }`}
                      >
                        {msg.recipient_role === "all" ? "all audiences" : msg.recipient_role}
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap dark:text-slate-200">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-700/10" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">Support Desk</p>
                <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Query Response Desk</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review and reply to queries raised by students and teachers.</p>
              </div>
              <div className="w-full rounded-xl border border-emerald-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/65 lg:w-auto">
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Status</label>
                    <select
                      value={queryStatusFilter}
                      onChange={(e) => setQueryStatusFilter(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/40"
                    >
                      <option value="">All status</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Sender</label>
                    <select
                      value={querySenderRoleFilter}
                      onChange={(e) => setQuerySenderRoleFilter(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/40"
                    >
                      <option value="">All senders</option>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Priority</label>
                    <select
                      value={queryPriorityFilter}
                      onChange={(e) => setQueryPriorityFilter(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/40"
                    >
                      <option value="">All priority</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={loadSupportQueries}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {loadingSupportQueries ? (
              <p className="text-sm text-slate-500 mt-4">Loading user queries...</p>
            ) : supportQueries.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No user queries found.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {supportQueries.map((query) => (
                  <div key={query.id} className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-slate-900/70 dark:to-slate-800/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{query.subject}</p>
                      <span className={`text-xs rounded-full px-2.5 py-1 font-semibold border ${
                        query.status === "open"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                          : query.status === "in_progress"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                            : query.status === "resolved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                      }`}>
                        {query.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      From {query.sender_name} ({query.sender_role}) | {query.sender_email} | {new Date(query.created_at).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        category: {query.category}
                      </span>
                      <span className={`text-xs rounded-full border px-2.5 py-1 font-medium ${
                        query.priority === "high"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : query.priority === "normal"
                            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        priority: {query.priority}
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap dark:text-slate-200">{query.body}</p>
                    </div>
                    {query.attachment_url && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Attachment</p>
                        {query.attachment_mime?.startsWith("image/") && (
                          <a href={query.attachment_url} target="_blank" rel="noreferrer">
                            <img
                              src={query.attachment_url}
                              alt={query.attachment_name || "query attachment"}
                              className="mt-2 max-h-44 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                            />
                          </a>
                        )}
                        <a
                          href={query.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                        >
                          Open {query.attachment_name || "attachment"}
                        </a>
                      </div>
                    )}

                    <div className="mt-3 rounded-lg border border-slate-200 bg-white/85 p-3 dark:border-slate-700 dark:bg-slate-900/65">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Admin Response</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <select
                        value={(queryUpdateForm[query.id]?.status ?? query.status)}
                        onChange={(e) => handleQueryUpdateInput(query.id, "status", e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-900/40"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <input
                        value={(queryUpdateForm[query.id]?.admin_note ?? query.admin_note ?? "")}
                        onChange={(e) => handleQueryUpdateInput(query.id, "admin_note", e.target.value)}
                        className="md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-emerald-900/40"
                        placeholder="Write admin reply for this user query..."
                      />
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => handleSupportQueryUpdate(query.id)}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/40"
                      >
                        Send Reply & Update Status
                      </button>
                    </div>
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
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-violet-50/30 p-6 shadow-sm ring-1 ring-violet-100/50">
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
      const statusClasses = {
        open: "border-amber-200 bg-amber-50 text-amber-700",
        pending: "border-amber-200 bg-amber-50 text-amber-700",
        in_review: "border-blue-200 bg-blue-50 text-blue-700",
        resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
        closed: "border-slate-300 bg-slate-100 text-slate-700",
      };
      const openCount = conflicts.filter((item) => (item.status || "open") !== "resolved").length;
      const reviewCount = conflicts.filter((item) => (item.status || "open") === "in_review").length;
      const resolvedCount = conflicts.filter((item) => (item.status || "open") === "resolved").length;
      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/35 p-6 shadow-sm ring-1 ring-amber-100/50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/75 dark:ring-slate-700/70">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-700/10" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-orange-200/30 blur-2xl dark:bg-orange-700/10" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">Operations Desk</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Conflict Resolution</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Track scheduling conflicts and resolve them with audit history.</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white/85 px-3 py-2.5 shadow-sm dark:border-amber-800 dark:bg-slate-900/70">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Open Cases</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{openCount}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Open {openCount}
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  In Review {reviewCount}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Resolved {resolvedCount}
                </span>
              </div>

              <form onSubmit={handleCreateConflict} className="mt-5 rounded-xl border border-slate-200/90 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/65 md:p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Log New Conflict</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    name="title"
                    value={conflictForm.title}
                    onChange={handleConflictFormChange}
                    placeholder="Conflict title"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-amber-900/40"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/40"
                  >
                    Add Conflict
                  </button>
                  <textarea
                    name="description"
                    value={conflictForm.description}
                    onChange={handleConflictFormChange}
                    rows={3}
                    placeholder="Conflict details"
                    className="md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-amber-900/40"
                  />
                </div>
              </form>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm p-6 ring-1 ring-slate-100/70 dark:border-slate-700 dark:bg-slate-900/60 dark:ring-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Open Conflicts</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Review status and push conflicts to in-review or resolved state.</p>
              </div>
              <button
                type="button"
                onClick={loadConflicts}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
            {loadingConflicts ? (
              <p className="text-sm text-slate-500 mt-4">Loading conflicts...</p>
            ) : conflicts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No open conflicts</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">All clear for now. New cases will appear here.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-slate-900/70 dark:to-slate-800/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{conflict.title}</p>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses[conflict.status] || "border-slate-300 bg-slate-100 text-slate-700"}`}>
                          {(conflict.status || "open").replace("_", " ")}
                        </span>
                        {conflict.status !== "resolved" && (
                          <button
                            type="button"
                            onClick={() => handleReviewConflict(conflict.id)}
                            className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/25 dark:text-blue-300 dark:hover:bg-blue-900/40"
                          >
                            In Review
                          </button>
                        )}
                        {conflict.status !== "resolved" && (
                          <button
                            type="button"
                            onClick={() => handleResolveConflict(conflict.id)}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                    {conflict.description && <p className="text-sm leading-6 text-slate-700 mt-2 dark:text-slate-200">{conflict.description}</p>}
                    <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">Created {new Date(conflict.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "users") {
      const userRoleStats = {
        total: users.length,
        student: users.filter((u) => u.role === "student").length,
        faculty: users.filter((u) => u.role === "faculty").length,
        admin: users.filter((u) => u.role === "admin").length,
      };
      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/30 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-200/25 blur-3xl dark:bg-blue-700/15" />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">User Management</h3>
                <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
                  Search, filter, edit roles, and maintain student/faculty/admin accounts.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm min-w-64 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={loadUsers}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Total</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{userRoleStats.total}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
                <p className="text-[11px] uppercase tracking-[0.08em] text-blue-700 dark:text-blue-300">Students</p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">{userRoleStats.student}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-[11px] uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">Faculty</p>
                <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">{userRoleStats.faculty}</p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30">
                <p className="text-[11px] uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">Admin</p>
                <p className="mt-1 text-xl font-bold text-violet-700 dark:text-violet-300">{userRoleStats.admin}</p>
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
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <div className="max-h-[66vh] overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur dark:bg-slate-800/95">
                    <tr>
                      <th className="w-[16%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Name</th>
                      <th className="w-[18%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Email</th>
                      <th className="w-[10%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Role</th>
                      <th className="w-[10%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Department</th>
                      <th className="w-[12%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Roll/Emp No.</th>
                      <th className="w-[7%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Year</th>
                      <th className="w-[8%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Section</th>
                      <th className="w-[8%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Login</th>
                      <th className="w-[11%] text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-600 px-2.5 py-3 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:nth-child(even)]:bg-slate-50/70 dark:[&_tr:nth-child(even)]:bg-slate-800/25">
                    {users.map((row) => (
                      <tr key={row.id} className="border-t border-slate-200 align-top transition-colors hover:bg-blue-50/45 dark:border-slate-700 dark:hover:bg-slate-800/45">
                        <td className="px-2.5 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.name || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          ) : (
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{row.name || "-"}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">ID #{row.id}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.email || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, email: e.target.value }))}
                              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          ) : (
                            <span title={row.email} className="inline-block max-w-full truncate text-slate-700 dark:text-slate-200">
                              {row.email}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {editingUserId === row.id ? (
                            <select
                              value={userEditForm.role || "student"}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, role: e.target.value }))}
                              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                              <option value="student">student</option>
                              <option value="faculty">faculty</option>
                              <option value="admin">admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.role === "student"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-300"
                                : row.role === "faculty"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300"
                                  : "bg-violet-100 text-violet-700 dark:bg-violet-900/35 dark:text-violet-300"
                            }`}>
                              {row.role}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.department || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, department: e.target.value }))}
                              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          ) : (
                            row.department || "-"
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.roll_number || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, roll_number: e.target.value }))}
                              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          ) : (
                            row.roll_number || "-"
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {editingUserId === row.id ? (
                            <input
                              type="number"
                              min="1"
                              value={userEditForm.year || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, year: e.target.value }))}
                              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          ) : (
                            row.year || "-"
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {editingUserId === row.id ? (
                            <input
                              value={userEditForm.section || ""}
                              onChange={(e) => setUserEditForm((prev) => ({ ...prev, section: e.target.value }))}
                              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          ) : (
                            row.section || "-"
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.is_active === false
                                ? "bg-red-100 text-red-700 dark:bg-red-900/35 dark:text-red-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300"
                            }`}
                          >
                            {row.is_active === false ? "Disabled" : "Active"}
                          </span>
                        </td>
                        <td className="px-2.5 py-3">
                          <div className="flex flex-col gap-1.5">
                            {editingUserId === row.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveUserEdit}
                                  className="w-full px-2 py-1.5 text-[11px] font-semibold rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelUserEdit}
                                  className="w-full px-2 py-1.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startUserEdit(row)}
                                  className="w-full px-2 py-1.5 text-[11px] font-semibold rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleUserLoginAccess(row)}
                                  className={`w-full px-2 py-1.5 text-[11px] font-semibold rounded-md ${
                                    row.is_active === false
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                                  }`}
                                >
                                  {row.is_active === false ? "Enable Login" : "Disable Login"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(row.id)}
                                  className="w-full px-2 py-1.5 text-[11px] font-semibold rounded-md bg-red-100 text-red-700 hover:bg-red-200"
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
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "grade-reviews") {
      const pendingCount = assignmentReviewRows.filter((row) => row.admin_review_status === "pending").length;
      const submissionCountByClassroomId = assignmentReviewRows.reduce((acc, row) => {
        const classroomId = row.classroom?.id;
        if (!classroomId) return acc;
        if (!acc[classroomId]) {
          acc[classroomId] = { total: 0, pending: 0, approved: 0, rejected: 0 };
        }
        acc[classroomId].total += 1;
        const status = row.admin_review_status || "pending";
        if (status === "approved") acc[classroomId].approved += 1;
        else if (status === "rejected") acc[classroomId].rejected += 1;
        else acc[classroomId].pending += 1;
        return acc;
      }, {});

      const classroomList = [...reviewClassrooms].map((room) => {
        const counts = submissionCountByClassroomId[room.id] || { total: 0, pending: 0, approved: 0, rejected: 0 };
        return {
          key: String(room.id),
          classroomId: room.id,
          classroomTitle: room.title || room.subject || "Classroom",
          facultyName: room.faculty_name || "Faculty",
          subject: room.subject || "Subject",
          semester: room.semester || "Current",
          department: room.department || "-",
          year: room.year != null ? String(room.year) : "-",
          section: room.section || "-",
          total: counts.total,
          pending: counts.pending,
          approved: counts.approved,
          rejected: counts.rejected,
        };
      }).sort((a, b) => (b.pending - a.pending) || (b.total - a.total));

      const resolvedClassroomKey = classroomList.some((item) => item.key === selectedReviewClassroomKey) ? selectedReviewClassroomKey : (classroomList[0]?.key || "");
      const selectedClassroom = classroomList.find((item) => item.key === resolvedClassroomKey) || null;
      const selectedClassroomRows = selectedClassroom
        ? assignmentReviewRows.filter((row) => String(row.classroom?.id || "") === String(selectedClassroom.classroomId))
        : [];
      const selectedReviewRow = selectedClassroomRows.find((row) => row.id === selectedReviewSubmissionId) || null;

      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <svg className="h-5 w-5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 9l10-4 10 4-10 4-10-4z" />
                    <path d="M6 10.5v3.5c0 1.9 2.8 3.5 6 3.5s6-1.6 6-3.5v-3.5" />
                    <path d="M20 10v5.2" />
                    <circle cx="20" cy="16.8" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                  Classroom-wise Grade Reviews
                </h3>
                <p className="text-sm text-slate-500 mt-1">Review teacher-submitted grades by classroom. Students see grades only after admin approval.</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={assignmentReviewFilter} onChange={(e) => setAssignmentReviewFilter(e.target.value)} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    loadAssignmentReviews();
                    loadReviewClassrooms();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
              </svg>
              Pending confirmations: {pendingCount}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 9h18M8 4v4M16 4v4" />
                </svg>
                Classrooms
              </h4>
              <p className="text-xs text-slate-500 mt-1">Select a classroom to review submitted grades.</p>
              {loadingReviewClassrooms ? (
                <p className="text-sm text-slate-500 mt-4">Loading classrooms...</p>
              ) : loadingAssignmentReviewRows ? (
                <p className="text-sm text-slate-500 mt-4">Loading classroom buckets...</p>
              ) : classroomList.length === 0 ? (
                <p className="text-sm text-slate-500 mt-4">No faculty-created classrooms found.</p>
              ) : (
                <div className="mt-3 space-y-2 max-h-[68vh] overflow-y-auto pr-1">
                  {classroomList.map((room) => (
                    <button
                      key={room.key}
                      type="button"
                      onClick={() => {
                        setSelectedReviewClassroomKey(room.key);
                        setSelectedReviewSubmissionId(null);
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${resolvedClassroomKey === room.key ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{room.classroomTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">{room.department} | Year {room.year} | {room.section} | {room.semester}</p>
                      <p className="mt-1 text-xs text-slate-500">Faculty: {room.facultyName}</p>
                      <p className="mt-1 text-xs text-slate-500">Reviews: {room.total} | Pending: {room.pending}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              {!selectedClassroom ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Select a classroom from the left panel to review grades.
                </p>
              ) : selectedReviewRow ? (
                <div>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Subject Detail</p>
                      <h4 className="text-base font-semibold text-slate-800">{selectedReviewRow.assignment?.title || "Assignment"}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReviewSubmissionId(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                      Back to List
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Classroom: {selectedClassroom.classroomTitle}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {selectedClassroom.department} | Year {selectedClassroom.year} | {selectedClassroom.section} | {selectedClassroom.semester}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Faculty: {selectedClassroom.facultyName}</p>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        Student: {selectedReviewRow.student_name || selectedReviewRow.student_email || selectedReviewRow.roll_number || "Unknown"}
                      </p>
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {selectedReviewRow.admin_review_status || "pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Email: {selectedReviewRow.student_email || "-"} | Roll: {selectedReviewRow.roll_number || "-"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Submitted: {selectedReviewRow.submitted_at ? new Date(selectedReviewRow.submitted_at).toLocaleString() : "-"}
                    </p>
                    <p className="mt-3 text-sm text-slate-800">
                      Grade: <span className="font-semibold">{selectedReviewRow.grade || "-"}</span> | Marks: {selectedReviewRow.total_marks_awarded != null && selectedReviewRow.total_marks_out_of != null ? `${selectedReviewRow.total_marks_awarded}/${selectedReviewRow.total_marks_out_of}` : "-"}
                    </p>
                    {selectedReviewRow.teacher_feedback && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Teacher Feedback</p>
                        <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{selectedReviewRow.teacher_feedback}</p>
                      </div>
                    )}
                    {Array.isArray(selectedReviewRow.section_grades) && selectedReviewRow.section_grades.length > 0 && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Section-wise Marks</p>
                        <div className="mt-1 space-y-1">
                          {selectedReviewRow.section_grades.map((item, idx) => (
                            <p key={`review-section-${idx}`} className="text-xs text-slate-700">
                              {item.section}: {item.marks_awarded} / {item.marks_out_of}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedReviewRow.admin_review_status === "pending" && (
                      <div className="mt-4 flex items-center gap-2">
                        <button type="button" onClick={() => handleAssignmentReviewDecision(selectedReviewRow.id, "approved")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Approve Release</button>
                        <button type="button" onClick={() => handleAssignmentReviewDecision(selectedReviewRow.id, "rejected")} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                  {selectedClassroomRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                          <path d="M9 12h6M9 16h4" />
                          <path d="M4 6h16v12H4z" />
                        </svg>
                        No grade submissions yet for this classroom.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Once faculty reviews student submissions, records will appear here for admin approval.</p>
                    </div>
                  ) : selectedClassroomRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedReviewSubmissionId(row.id)}
                      className="w-full rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{row.assignment?.title || "Assignment"}</p>
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.admin_review_status || "pending"}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">
                        Student: <span className="font-medium text-slate-900">{row.student_name || row.student_email || row.roll_number || "Unknown"}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Email: {row.student_email || "-"} | Roll: {row.roll_number || "-"} | Submitted: {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "-"}
                      </p>
                      <p className="text-sm text-slate-700 mt-2">
                        Grade: <span className="font-semibold text-slate-900">{row.grade || "-"}</span> | Marks: {row.total_marks_awarded != null && row.total_marks_out_of != null ? `${row.total_marks_awarded}/${row.total_marks_out_of}` : "-"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "admin-profile") {
      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-700/10" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-300">Identity</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Admin Profile</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Primary account details and avatar for this admin session.</p>

              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Profile Photo</p>
                  <div className="mt-3 flex items-center gap-3">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Admin avatar"
                        className="h-16 w-16 rounded-full border border-slate-200 object-cover shadow-sm dark:border-slate-700"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-lg font-semibold text-white shadow-sm">
                        {profileInitials || "A"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{profileDisplayName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{adminProfile?.role || "admin"}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{profileDisplayName}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Email</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{adminProfile?.email || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Role</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{adminProfile?.role || "admin"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">User ID</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{adminProfile?.id || adminUserId || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm lg:col-span-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Department</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{adminProfile?.department || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "calendar") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mb-3 border-b border-slate-200 pb-3 dark:border-slate-700">
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Calendar Workspace</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Unified calendar frontend view used across student and faculty modules.
              </p>
            </div>
            <CalendarPage viewerRole="admin" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/30 p-6 shadow-sm dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-700/10" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-300">Event Registry</p>
                  <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Published Events</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Admin can manage all events, including those created by faculty.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 shadow-sm dark:border-cyan-800 dark:bg-slate-900/70">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Total Events</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{calendarEvents.length}</p>
                </div>
              </div>

              {eventMessage && (
                <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {eventMessage}
                </div>
              )}
              {eventError && (
                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {eventError}
                </div>
              )}

              {loadingCalendarEvents ? (
                <p className="text-sm text-slate-500 mt-4">Loading events...</p>
              ) : calendarEvents.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No events published</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create an event from the form above to start the calendar feed.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {calendarEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/55">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{event.title}</p>
                          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
                            {event.date} | Created by {event.creator_name} ({event.creator_role})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEventEdit(event)}
                            className="rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const proceed = window.confirm(`Delete event "${event.title || "Untitled"}"?`);
                              if (proceed) handleEventDelete(event.id);
                            }}
                            className="rounded-md bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {event.description && <p className="text-sm leading-6 text-slate-700 mt-2 dark:text-slate-200">{event.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {editingEventId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" role="dialog" aria-modal="true">
              <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">Edit Event</h4>
                    <p className="mt-1 text-sm text-slate-500">Update event details and publish changes to all users.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      setEventForm({ title: "", date: "", description: "" });
                    }}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>

                <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleEventSubmit}>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Title</label>
                    <input
                      name="title"
                      value={eventForm.title}
                      onChange={handleEventChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={eventForm.date}
                      onChange={handleEventChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</label>
                    <textarea
                      name="description"
                      rows={4}
                      value={eventForm.description}
                      onChange={handleEventChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={savingEvent}
                      className={`rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 ${
                        savingEvent ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      {savingEvent ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        setEventForm({ title: "", date: "", description: "" });
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
