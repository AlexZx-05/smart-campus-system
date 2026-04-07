import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PreferenceService from "../../services/PreferenceService";
import DashboardService from "../../services/DashboardService";
import FacultyService from "../../services/FacultyService";
import EventService from "../../services/EventService";
import AnnouncementCarousel from "../../components/AnnouncementCarousel";

function FacultyDashboard({ onLogout }) {
  const defaultAvatar =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
        <rect width='160' height='160' fill='#E2E8F0'/>
        <circle cx='80' cy='64' r='28' fill='#94A3B8'/>
        <rect x='36' y='102' width='88' height='40' rx='20' fill='#94A3B8'/>
      </svg>`
    );

  const [activePage, setActivePage] = useState("dashboard");
  const [facultyName, setFacultyName] = useState("Faculty");
  const [currentUserId, setCurrentUserId] = useState(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    department: "",
    roll_number: "",
    profile_image_url: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [preferenceForm, setPreferenceForm] = useState({
    subject: "",
    student_count: "",
    semester: "Odd 2026",
    department: "",
    year: "",
    section: "",
    details: "",
    slots: [{ day: "Monday", start_time: "", end_time: "" }],
  });
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [preferenceError, setPreferenceError] = useState("");
  const [submittingPreference, setSubmittingPreference] = useState(false);
  const [myPreferences, setMyPreferences] = useState([]);
  const [loadingMyPreferences, setLoadingMyPreferences] = useState(false);
  const [facultyTimetable, setFacultyTimetable] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [instituteTimetable, setInstituteTimetable] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [timetableError, setTimetableError] = useState("");
  const [roomLiveStatus, setRoomLiveStatus] = useState(null);
  const [loadingRoomLiveStatus, setLoadingRoomLiveStatus] = useState(false);
  const [roomLiveStatusError, setRoomLiveStatusError] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: todayIso,
    description: "",
  });
  const [eventMessage, setEventMessage] = useState("");
  const [eventError, setEventError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [inboxMessages, setInboxMessages] = useState([]);
  const [loadingInboxMessages, setLoadingInboxMessages] = useState(false);
  const [inboxError, setInboxError] = useState("");
  const [queryForm, setQueryForm] = useState({
    subject: "",
    body: "",
    category: "general",
    priority: "normal",
  });
  const [myQueries, setMyQueries] = useState([]);
  const [loadingMyQueries, setLoadingMyQueries] = useState(false);
  const [queryMessage, setQueryMessage] = useState("");
  const [queryError, setQueryError] = useState("");
  const [teacherDirectory, setTeacherDirectory] = useState([]);
  const [loadingTeacherDirectory, setLoadingTeacherDirectory] = useState(false);
  const [teacherDirectoryError, setTeacherDirectoryError] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [facultyMessageForm, setFacultyMessageForm] = useState({
    recipient_id: "",
    subject: "",
    body: "",
  });
  const [showTeacherCompose, setShowTeacherCompose] = useState(false);
  const [facultyMessageFeedback, setFacultyMessageFeedback] = useState("");
  const [facultyMessageError, setFacultyMessageError] = useState("");
  const [facultyInbox, setFacultyInbox] = useState([]);
  const [loadingFacultyInbox, setLoadingFacultyInbox] = useState(false);
  const [facultyConflicts, setFacultyConflicts] = useState([]);
  const [loadingFacultyConflicts, setLoadingFacultyConflicts] = useState(false);
  const [conflictForm, setConflictForm] = useState({ title: "", description: "" });
  const [conflictMessage, setConflictMessage] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [conflictLoadError, setConflictLoadError] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    subject: "",
    description: "",
    semester: "Odd 2026",
    department: "",
    year: "",
    section: "",
    due_at: "",
    reminder_enabled: true,
    reminder_days_before: "1",
    resource_links: "",
    attachment: null,
  });
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const assignmentFileInputRef = useRef(null);
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [loadingFacultyAssignments, setLoadingFacultyAssignments] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [loadingAssignmentSubmissions, setLoadingAssignmentSubmissions] = useState(false);
  const [assignmentRoster, setAssignmentRoster] = useState([]);
  const [loadingAssignmentRoster, setLoadingAssignmentRoster] = useState(false);
  const [submissionReviewDrafts, setSubmissionReviewDrafts] = useState({});
  const [assignmentNowMs, setAssignmentNowMs] = useState(Date.now());
  const composeTeacherMessageRef = useRef(null);

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "my-timetable", label: "My Timetable" },
    { key: "all-classes", label: "All Classes" },
    { key: "preferences", label: "Submit Preference" },
    { key: "assignments", label: "Assignments" },
    { key: "calendar", label: "Calendar" },
    { key: "notifications", label: "Notifications" },
    { key: "messages", label: "Messages" },
    { key: "teachers", label: "Teachers" },
    { key: "conflicts", label: "Conflict Requests" },
    { key: "profile", label: "Profile" },
  ];

  const pageTitleMap = {
    dashboard: "Faculty Dashboard",
    "my-timetable": "My Timetable",
    "all-classes": "All Classes",
    preferences: "Submit Preference",
    assignments: "Assignments",
    calendar: "Calendar",
    notifications: "Notifications",
    messages: "Messages",
    teachers: "Teachers",
    conflicts: "Conflict Requests",
    profile: "Profile",
  };

  const sectionMessage = pageTitleMap[activePage] || "Faculty Dashboard";

  const loadProfile = async () => {
    setLoadingProfile(true);
    setProfileError("");
    try {
      const data = await FacultyService.getProfile();
      setProfile({
        name: data.name || "",
        email: data.email || "",
        department: data.department || "",
        roll_number: data.roll_number || "",
        profile_image_url: data.profile_image_url || "",
      });
      if (data.name) setFacultyName(data.name);
      setPreferenceForm((prev) => ({
        ...prev,
        department: prev.department || data.department || "",
      }));
      setAssignmentForm((prev) => ({
        ...prev,
        department: prev.department || data.department || "",
      }));
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to load profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadMyPreferences = async () => {
    setLoadingMyPreferences(true);
    setPreferenceError("");
    try {
      const data = await PreferenceService.getMyFacultyPreferences();
      setMyPreferences(data);
    } catch (err) {
      setPreferenceError(err.response?.data?.message || "Failed to load preferences.");
    } finally {
      setLoadingMyPreferences(false);
    }
  };

  const loadFacultyTimetable = async () => {
    setLoadingTimetable(true);
    setTimetableError("");
    try {
      const [mySlots, todayRes, allSlots] = await Promise.all([
        PreferenceService.getFacultyTimetable(semesterFilter),
        PreferenceService.getFacultyTodaySchedule(undefined, semesterFilter),
        PreferenceService.getFacultyInstituteTimetable(semesterFilter),
      ]);
      setFacultyTimetable(mySlots || []);
      setTodaySchedule(todayRes?.slots || []);
      setInstituteTimetable(allSlots || []);
    } catch (err) {
      setTimetableError(err.response?.data?.message || "Failed to load timetable.");
    } finally {
      setLoadingTimetable(false);
    }
  };

  const loadCalendarEvents = async () => {
    setLoadingCalendarEvents(true);
    setEventError("");
    try {
      const data = await EventService.getEvents();
      setCalendarEvents(data);
    } catch (err) {
      setEventError(err.response?.data?.message || "Failed to load calendar events.");
    } finally {
      setLoadingCalendarEvents(false);
    }
  };

  const loadInboxMessages = async () => {
    setLoadingInboxMessages(true);
    setInboxError("");
    try {
      const data = await PreferenceService.getInboxMessages();
      setInboxMessages(data || []);
    } catch (err) {
      setInboxError(err.response?.data?.message || "Failed to load messages.");
    } finally {
      setLoadingInboxMessages(false);
    }
  };

  const loadFacultyRoomLiveStatus = async () => {
    setLoadingRoomLiveStatus(true);
    setRoomLiveStatusError("");
    try {
      const data = await PreferenceService.getFacultyRoomLiveStatus(semesterFilter || undefined);
      setRoomLiveStatus(data || null);
    } catch (err) {
      setRoomLiveStatus(null);
      setRoomLiveStatusError(err.response?.data?.message || "Failed to load live room status.");
    } finally {
      setLoadingRoomLiveStatus(false);
    }
  };

  const loadMyQueries = async () => {
    setLoadingMyQueries(true);
    setQueryError("");
    try {
      const data = await PreferenceService.getMySupportQueries();
      setMyQueries(data || []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404 || status >= 500) {
        setQueryError("Unable to load queries right now. Please restart backend and refresh this page.");
      } else {
        setQueryError(err.response?.data?.message || "Failed to load your queries.");
      }
    } finally {
      setLoadingMyQueries(false);
    }
  };

  const loadTeacherDirectory = async (searchValue = "") => {
    setLoadingTeacherDirectory(true);
    setTeacherDirectoryError("");
    try {
      const data = await PreferenceService.getFacultyDirectory(searchValue || undefined);
      setTeacherDirectory(data || []);
    } catch (err) {
      setTeacherDirectoryError(err.response?.data?.message || "Failed to load teachers directory.");
    } finally {
      setLoadingTeacherDirectory(false);
    }
  };

  const loadFacultyPeerInbox = async () => {
    setLoadingFacultyInbox(true);
    setFacultyMessageError("");
    try {
      const data = await PreferenceService.getFacultyPeerInbox();
      setFacultyInbox(data || []);
    } catch (err) {
      setFacultyMessageError(err.response?.data?.message || "Failed to load faculty messages.");
    } finally {
      setLoadingFacultyInbox(false);
    }
  };

  const loadFacultyConflicts = async () => {
    setLoadingFacultyConflicts(true);
    setConflictLoadError("");
    try {
      const data = await PreferenceService.getFacultyConflicts();
      setFacultyConflicts(data || []);
    } catch (err) {
      setFacultyConflicts([]);
      setConflictLoadError(err.response?.data?.message || "Unable to load requests right now.");
    } finally {
      setLoadingFacultyConflicts(false);
    }
  };

  const loadFacultyAssignments = async () => {
    setLoadingFacultyAssignments(true);
    setAssignmentError("");
    try {
      const data = await PreferenceService.getFacultyAssignments();
      setFacultyAssignments(data || []);
      setSelectedAssignmentId((prev) => prev || data?.[0]?.id || null);
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to load assignments.");
    } finally {
      setLoadingFacultyAssignments(false);
    }
  };

  const loadAssignmentSubmissions = async (assignmentId) => {
    if (!assignmentId) {
      setAssignmentSubmissions([]);
      return;
    }
    setLoadingAssignmentSubmissions(true);
    setAssignmentError("");
    try {
      const data = await PreferenceService.getFacultyAssignmentSubmissions(assignmentId);
      setAssignmentSubmissions(data || []);
      const drafts = {};
      (data || []).forEach((row) => {
        drafts[row.id] = {
          status: row.status || "submitted",
          teacher_feedback: row.teacher_feedback || "",
          grade: row.grade || "",
        };
      });
      setSubmissionReviewDrafts(drafts);
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to load submissions.");
    } finally {
      setLoadingAssignmentSubmissions(false);
    }
  };

  const loadAssignmentRoster = async (assignmentId) => {
    const assignment = facultyAssignments.find((row) => row.id === assignmentId);
    if (!assignment?.subject) {
      setAssignmentRoster([]);
      return;
    }
    setLoadingAssignmentRoster(true);
    setAssignmentError("");
    try {
      const data = await PreferenceService.getFacultyCourseEnrollments({
        subject: assignment.subject,
        semester: assignment.semester,
      });
      setAssignmentRoster(data || []);
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to load enrolled students.");
    } finally {
      setLoadingAssignmentRoster(false);
    }
  };

  useEffect(() => {
    loadProfile();
    DashboardService.getDashboardData()
      .then((res) => {
        if (res?.user?.name) setFacultyName(res.user.name);
        if (res?.user?.id) setCurrentUserId(res.user.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activePage === "preferences") loadMyPreferences();
    if (activePage === "profile") loadProfile();
    if (activePage === "calendar") loadCalendarEvents();
    if (activePage === "dashboard") {
      loadInboxMessages();
      loadFacultyTimetable();
      loadFacultyRoomLiveStatus();
    }
    if (activePage === "notifications") {
      loadInboxMessages();
      loadFacultyPeerInbox();
    }
    if (activePage === "messages") {
      loadMyQueries();
    }
    if (activePage === "teachers") {
      loadTeacherDirectory();
      loadFacultyPeerInbox();
    }
    if (activePage === "conflicts") {
      loadFacultyConflicts();
    }
    if (activePage === "assignments") {
      loadFacultyAssignments();
    }
    if (activePage === "my-timetable" || activePage === "all-classes") loadFacultyTimetable();
  }, [activePage]);

  useEffect(() => {
    if (activePage === "my-timetable" || activePage === "all-classes") {
      loadFacultyTimetable();
    }
  }, [semesterFilter]);

  useEffect(() => {
    if (!queryMessage) return undefined;
    const timer = setTimeout(() => setQueryMessage(""), 1800);
    return () => clearTimeout(timer);
  }, [queryMessage]);

  useEffect(() => {
    if (!facultyMessageFeedback) return undefined;
    const timer = setTimeout(() => setFacultyMessageFeedback(""), 1800);
    return () => clearTimeout(timer);
  }, [facultyMessageFeedback]);

  useEffect(() => {
    if (!conflictMessage) return undefined;
    const timer = setTimeout(() => setConflictMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [conflictMessage]);

  useEffect(() => {
    if (!assignmentMessage) return undefined;
    const timer = setTimeout(() => setAssignmentMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [assignmentMessage]);

  useEffect(() => {
    if (activePage !== "assignments") return undefined;
    const timer = setInterval(() => setAssignmentNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [activePage]);

  useEffect(() => {
    if (activePage === "assignments" && selectedAssignmentId) {
      loadAssignmentSubmissions(selectedAssignmentId);
      loadAssignmentRoster(selectedAssignmentId);
    }
  }, [activePage, selectedAssignmentId, facultyAssignments]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setProfileMessage("");
    setProfileError("");
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const res = await FacultyService.updateProfile({
        name: profile.name,
        department: profile.department,
        roll_number: profile.roll_number,
      });
      setProfileMessage(res.message || "Profile updated successfully.");
      if (res.profile?.name) setFacultyName(res.profile.name);
      if (res.profile?.profile_image_url) {
        setProfile((prev) => ({ ...prev, profile_image_url: res.profile.profile_image_url }));
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const res = await FacultyService.uploadProfilePhoto(file);
      setProfileMessage(res.message || "Profile photo uploaded successfully.");
      if (res.profile?.profile_image_url) {
        setProfile((prev) => ({ ...prev, profile_image_url: res.profile.profile_image_url }));
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handlePreferenceChange = (e) => {
    const { name, value } = e.target;
    setPreferenceForm((prev) => ({ ...prev, [name]: value }));
    setPreferenceMessage("");
    setPreferenceError("");
  };

  const handleQueryInput = (e) => {
    const { name, value } = e.target;
    setQueryForm((prev) => ({ ...prev, [name]: value }));
    setQueryMessage("");
    setQueryError("");
  };

  const submitQueryToAdmin = async (e) => {
    e.preventDefault();
    setQueryMessage("");
    setQueryError("");
    try {
      const res = await PreferenceService.createSupportQuery(queryForm);
      setQueryMessage(res.message || "Query submitted to admin.");
      setQueryForm({
        subject: "",
        body: "",
        category: "general",
        priority: "normal",
      });
      await loadMyQueries();
    } catch (err) {
      setQueryError(err.response?.data?.message || "Failed to submit query.");
    }
  };

  const handleTeacherSearch = async (e) => {
    const value = e.target.value;
    setTeacherSearch(value);
    await loadTeacherDirectory(value.trim());
  };

  const selectTeacherForMessage = (teacherId) => {
    setFacultyMessageForm((prev) => ({ ...prev, recipient_id: String(teacherId) }));
    setShowTeacherCompose(true);
    setFacultyMessageError("");
    setFacultyMessageFeedback("");
    setTimeout(() => {
      composeTeacherMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const handleFacultyMessageInput = (e) => {
    const { name, value } = e.target;
    setFacultyMessageForm((prev) => ({ ...prev, [name]: value }));
    setFacultyMessageError("");
    setFacultyMessageFeedback("");
  };

  const sendFacultyMessage = async (e) => {
    e.preventDefault();
    setFacultyMessageError("");
    setFacultyMessageFeedback("");
    try {
      const payload = {
        recipient_id: Number(facultyMessageForm.recipient_id),
        subject: facultyMessageForm.subject,
        body: facultyMessageForm.body,
      };
      const res = await PreferenceService.sendFacultyPeerMessage(payload);
      setFacultyMessageFeedback(res.message || "Message sent to faculty.");
      setFacultyMessageForm((prev) => ({
        ...prev,
        subject: "",
        body: "",
      }));
      await loadFacultyPeerInbox();
    } catch (err) {
      setFacultyMessageError(err.response?.data?.message || "Failed to send faculty message.");
    }
  };

  const handleConflictInput = (e) => {
    const { name, value } = e.target;
    setConflictForm((prev) => ({ ...prev, [name]: value }));
    setConflictError("");
    setConflictMessage("");
  };

  const submitFacultyConflict = async (e) => {
    e.preventDefault();
    setConflictError("");
    setConflictMessage("");
    try {
      const res = await PreferenceService.createFacultyConflict(conflictForm);
      setConflictMessage(res.message || "Conflict request submitted successfully.");
      setConflictForm({ title: "", description: "" });
      await loadFacultyConflicts();
    } catch (err) {
      setConflictError(err.response?.data?.message || "Failed to submit conflict request.");
    }
  };

  const handleAssignmentInput = (e) => {
    const { name, value, type, checked } = e.target;
    setAssignmentForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setAssignmentMessage("");
    setAssignmentError("");
  };

  const handleAssignmentAttachment = (e) => {
    const file = e.target.files?.[0] || null;
    setAssignmentForm((prev) => ({ ...prev, attachment: file }));
    setAssignmentError("");
  };

  const clearAssignmentAttachment = () => {
    setAssignmentForm((prev) => ({ ...prev, attachment: null }));
    if (assignmentFileInputRef.current) {
      assignmentFileInputRef.current.value = "";
    }
  };

  const submitFacultyAssignment = async (e) => {
    e.preventDefault();
    setSubmittingAssignment(true);
    setAssignmentMessage("");
    setAssignmentError("");
    try {
      const formData = new FormData();
      formData.append("title", assignmentForm.title);
      formData.append("subject", assignmentForm.subject);
      formData.append("description", assignmentForm.description || "");
      formData.append("semester", assignmentForm.semester || "");
      formData.append("department", assignmentForm.department || "");
      formData.append("year", assignmentForm.year || "");
      formData.append("section", assignmentForm.section || "");
      formData.append("due_at", assignmentForm.due_at);
      formData.append("reminder_enabled", String(assignmentForm.reminder_enabled));
      formData.append("reminder_days_before", assignmentForm.reminder_days_before || "1");
      formData.append("resource_links", assignmentForm.resource_links || "");
      if (assignmentForm.attachment) {
        formData.append("attachment", assignmentForm.attachment);
      }

      const res = await PreferenceService.createFacultyAssignment(formData);
      setAssignmentMessage(res.message || "Assignment posted successfully.");
      setAssignmentForm((prev) => ({
        ...prev,
        title: "",
        subject: "",
        description: "",
        year: "",
        section: "",
        due_at: "",
        resource_links: "",
        attachment: null,
      }));
      if (assignmentFileInputRef.current) {
        assignmentFileInputRef.current.value = "";
      }
      await loadFacultyAssignments();
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to post assignment.");
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handleSubmissionReviewDraft = (submissionId, key, value) => {
    setSubmissionReviewDrafts((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || {}),
        [key]: value,
      },
    }));
  };

  const saveSubmissionReview = async (submissionId) => {
    const draft = submissionReviewDrafts[submissionId] || {};
    try {
      const res = await PreferenceService.reviewFacultyAssignmentSubmission(submissionId, {
        status: draft.status || "reviewed",
        teacher_feedback: draft.teacher_feedback || "",
        grade: draft.grade || "",
      });
      setAssignmentMessage(res.message || "Submission updated.");
      await loadAssignmentSubmissions(selectedAssignmentId);
      await loadFacultyAssignments();
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to review submission.");
    }
  };

  const formatPostedRealtime = (isoString) => {
    if (!isoString) return "Posted time unavailable";
    const postedMs = new Date(isoString).getTime();
    if (Number.isNaN(postedMs)) return `Posted ${isoString}`;
    const diffMs = Math.max(0, assignmentNowMs - postedMs);
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return `Posted just now (${new Date(isoString).toLocaleString()})`;
    if (minutes < 60) return `Posted ${minutes} min ago (${new Date(isoString).toLocaleString()})`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Posted ${hours} hr ago (${new Date(isoString).toLocaleString()})`;
    const days = Math.floor(hours / 24);
    return `Posted ${days} day${days > 1 ? "s" : ""} ago (${new Date(isoString).toLocaleString()})`;
  };

  const handlePreferenceSlotChange = (index, key, value) => {
    setPreferenceForm((prev) => ({
      ...prev,
      slots: prev.slots.map((slot, idx) => (idx === index ? { ...slot, [key]: value } : slot)),
    }));
    setPreferenceMessage("");
    setPreferenceError("");
  };

  const addPreferenceSlot = () => {
    setPreferenceForm((prev) => {
      if (prev.slots.length >= 4) return prev;
      return {
        ...prev,
        slots: [...prev.slots, { day: "Monday", start_time: "", end_time: "" }],
      };
    });
  };

  const removePreferenceSlot = (index) => {
    setPreferenceForm((prev) => ({
      ...prev,
      slots: prev.slots.filter((_, idx) => idx !== index),
    }));
  };

  const handlePreferenceSubmit = async (e) => {
    e.preventDefault();
    const validSlots = (preferenceForm.slots || []).filter(
      (slot) => slot.day && slot.start_time && slot.end_time
    );
    if (validSlots.length === 0) {
      setPreferenceError("Add at least one valid day/time slot.");
      return;
    }
    if (validSlots.length > 4) {
      setPreferenceError("Maximum 4 classes per week are allowed.");
      return;
    }

    setSubmittingPreference(true);
    setPreferenceMessage("");
    setPreferenceError("");
    try {
      await PreferenceService.submitFacultyPreference({
        ...preferenceForm,
        slots: validSlots,
      });
      setPreferenceMessage("Preference submitted successfully. Admin will review it.");
      setPreferenceForm((prev) => ({
        ...prev,
        subject: "",
        student_count: "",
        year: "",
        section: "",
        details: "",
        slots: [{ day: "Monday", start_time: "", end_time: "" }],
      }));
      await loadMyPreferences();
    } catch (err) {
      setPreferenceError(err.response?.data?.message || "Failed to submit preference.");
    } finally {
      setSubmittingPreference(false);
    }
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
        setEventMessage(res.message || "Event updated successfully.");
      } else {
        const res = await EventService.createEvent(eventForm);
        setEventMessage(res.message || "Event created successfully.");
      }
      setEventForm({ title: "", date: selectedDate, description: "" });
      setEditingEventId(null);
      await loadCalendarEvents();
    } catch (err) {
      setEventError(err.response?.data?.message || "Failed to save event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title || "",
      date: event.date || selectedDate,
      description: event.description || "",
    });
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await EventService.deleteEvent(eventId);
      setEventMessage("Event deleted successfully.");
      if (editingEventId === eventId) {
        setEditingEventId(null);
        setEventForm((prev) => ({ ...prev, title: "", description: "" }));
      }
      await loadCalendarEvents();
    } catch (err) {
      setEventError(err.response?.data?.message || "Failed to delete event.");
    }
  };

  const renderContent = () => {
    if (activePage === "dashboard") {
      const toMinutes = (timeText) => {
        if (!timeText || !timeText.includes(":")) return -1;
        const [hh, mm] = timeText.split(":").map((part) => Number(part));
        if (Number.isNaN(hh) || Number.isNaN(mm)) return -1;
        return hh * 60 + mm;
      };

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const sortedTodaySchedule = [...todaySchedule].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
      const activeMySlot = sortedTodaySchedule.find(
        (slot) => toMinutes(slot.start_time) <= nowMinutes && nowMinutes < toMinutes(slot.end_time)
      );
      const nextMySlot = sortedTodaySchedule.find((slot) => toMinutes(slot.start_time) > nowMinutes);

      const liveRooms = roomLiveStatus?.rooms || [];
      const runningRoomClasses = liveRooms.filter((room) => room.status === "running" && room.running_class);
      const nextCampusClasses = liveRooms
        .filter((room) => room.next_class)
        .sort((a, b) => toMinutes(a.next_class.start_time) - toMinutes(b.next_class.start_time));

      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">My Classes Today</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{todaySchedule.length}</p>
              <p className="mt-1 text-xs text-slate-500">Scheduled teaching slots</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Running Campus Classes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{roomLiveStatus?.running_classes_count ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">
                {roomLiveStatus?.day || now.toLocaleDateString("en-US", { weekday: "long" })}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current Teaching Status</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{activeMySlot ? "In Class" : "Available"}</p>
              <p className="mt-1 text-xs text-slate-500">
                {activeMySlot ? `${activeMySlot.subject} • Room ${activeMySlot.room}` : "No active slot now"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Next Campus Slot</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{roomLiveStatus?.next_slot_time || "-"}</p>
              <p className="mt-1 text-xs text-slate-500">
                {nextMySlot ? `Your next class: ${nextMySlot.subject}` : "No upcoming class today"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Live Room Intelligence</h3>
                  <p className="mt-1 text-sm text-slate-500">Who is teaching right now, in which room, and for which subject.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadFacultyRoomLiveStatus();
                    loadFacultyTimetable();
                    loadInboxMessages();
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Refresh Live Data
                </button>
              </div>

              {loadingRoomLiveStatus ? (
                <p className="mt-4 text-sm text-slate-500">Loading live classrooms...</p>
              ) : roomLiveStatusError ? (
                <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {roomLiveStatusError}
                </div>
              ) : runningRoomClasses.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No classroom is currently running a live slot.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {runningRoomClasses.map((roomItem) => {
                    const slot = roomItem.running_class;
                    return (
                      <div key={`${roomItem.room}-${slot.id || slot.subject}`} className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-blue-900">
                            Room {roomItem.room} • {slot.start_time} - {slot.end_time}
                          </p>
                          <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Live
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-blue-900">
                          {slot.subject} | {slot.faculty_name || "Faculty"}
                        </p>
                        <p className="mt-1 text-xs text-blue-700">
                          Class: {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-base font-semibold text-slate-900">My Teaching Pulse</h4>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current Slot</p>
                  {activeMySlot ? (
                    <>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{activeMySlot.subject}</p>
                      <p className="text-xs text-slate-600">
                        {activeMySlot.start_time} - {activeMySlot.end_time} • Room {activeMySlot.room}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">No ongoing class right now.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Next Slot</p>
                  {nextMySlot ? (
                    <>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{nextMySlot.subject}</p>
                      <p className="text-xs text-slate-600">
                        {nextMySlot.start_time} - {nextMySlot.end_time} • Room {nextMySlot.room}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">No more classes scheduled today.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setActivePage("my-timetable")}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Open My Timetable
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage("all-classes")}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    View All Classes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage("conflicts")}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Report Conflict
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnnouncementCarousel
            messages={inboxMessages}
            loading={loadingInboxMessages}
            error={inboxError}
            title="Announcement Banner"
            subtitle="Important updates from admin for faculty."
            emptyMessage="No faculty announcements yet."
            onRefresh={() => {
              loadInboxMessages();
              loadFacultyRoomLiveStatus();
            }}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="text-base font-semibold text-slate-900">Upcoming Classroom Queue</h4>
            {loadingRoomLiveStatus ? (
              <p className="mt-4 text-sm text-slate-500">Loading upcoming classes...</p>
            ) : nextCampusClasses.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No upcoming room slots available.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {nextCampusClasses.slice(0, 6).map((roomItem) => (
                  <div key={`${roomItem.room}-${roomItem.next_class.id || roomItem.next_class.start_time}`} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {roomItem.next_class.start_time} • Room {roomItem.room} • {roomItem.next_class.subject}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {roomItem.next_class.faculty_name || "Faculty"} | {roomItem.next_class.department || "-"} / {roomItem.next_class.year || "-"} / {roomItem.next_class.section || "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "my-timetable") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">My Timetable</h3>
                <p className="text-sm text-slate-500 mt-1">See your complete slot allocation and today&apos;s classes.</p>
              </div>
              <input
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                placeholder="Semester (e.g. Odd 2026)"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          {timetableError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{timetableError}</div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">Today&apos;s Teaching Plan</h4>
            {loadingTimetable ? (
              <p className="text-sm text-slate-500 mt-3">Loading...</p>
            ) : todaySchedule.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No class assigned for today.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {todaySchedule.map((slot, idx) => (
                  <div key={`${slot.id || idx}`} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm font-semibold text-blue-900">
                      {slot.start_time} - {slot.end_time} | {slot.subject}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Room {slot.room} | {slot.department || "-"} {slot.year || "-"}-{slot.section || "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">Full Faculty Timetable</h4>
            {loadingTimetable ? (
              <p className="text-sm text-slate-500 mt-3">Loading...</p>
            ) : facultyTimetable.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No published timetable for selected semester.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Day</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Class</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyTimetable.map((slot, idx) => (
                      <tr key={`${slot.id || idx}`} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-sm text-slate-700">{slot.day}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {slot.start_time} - {slot.end_time}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{slot.subject}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{slot.room}</td>
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

    if (activePage === "all-classes") {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Institute Timetable</h3>
              <p className="text-sm text-slate-500 mt-1">View all published classes across departments.</p>
            </div>
            <input
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              placeholder="Semester (e.g. Odd 2026)"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>
          {loadingTimetable ? (
            <p className="text-sm text-slate-500 mt-4">Loading...</p>
          ) : instituteTimetable.length === 0 ? (
            <p className="text-sm text-slate-500 mt-4">No timetable found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Day</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Faculty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Room</th>
                  </tr>
                </thead>
                <tbody>
                  {instituteTimetable.map((slot, idx) => (
                    <tr key={`${slot.id || idx}`} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-sm text-slate-700">{slot.day}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {slot.start_time} - {slot.end_time}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{slot.subject}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{slot.faculty_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {slot.department || "-"} / {slot.year || "-"} / {slot.section || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{slot.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (activePage === "profile") {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_-28px_rgba(15,23,42,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.14),transparent_58%)]" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Faculty Workspace
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Faculty Profile</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Update your details used for timetable and administration.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Profile status</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">Ready to publish</p>
              </div>
            </div>

            {profileMessage && (
              <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {profileMessage}
              </div>
            )}
            {profileError && (
              <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {profileError}
              </div>
            )}

            {loadingProfile ? (
              <p className="mt-6 text-sm text-slate-500">Loading profile...</p>
            ) : (
              <form className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-5" onSubmit={handleProfileSave}>
                <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-200">Faculty profile</p>
                  <div className="mt-5 flex items-center gap-4">
                    <img
                      src={profile.profile_image_url || defaultAvatar}
                      alt="Faculty profile"
                      className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/35"
                    />
                    <div>
                      <p className="text-base font-semibold text-white">{profile.name || "Faculty Member"}</p>
                      <p className="mt-1 text-xs text-slate-200">{profile.department || "Department pending"}</p>
                    </div>
                  </div>
                  <label className="mt-5 inline-flex cursor-pointer items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20">
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                  <p className="mt-3 text-xs leading-relaxed text-slate-200">
                    Use a clear headshot (JPG/PNG/WEBP). Your photo is shown in timetable and faculty listings.
                  </p>
                </div>

                <div className="xl:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                    <input
                      name="email"
                      value={profile.email}
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Department</label>
                    <input
                      name="department"
                      value={profile.department}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Employee Number</label>
                    <input
                      name="roll_number"
                      value={profile.roll_number}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-600">Keep profile details accurate for conflict-free scheduling.</p>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className={`rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                        savingProfile ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "preferences") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Submit Preference</h3>
            <p className="text-sm text-slate-500 mt-1">
              Submit one subject with weekly teaching slots. Maximum 4 classes per week.
            </p>

            {preferenceMessage && <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{preferenceMessage}</div>}
            {preferenceError && <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{preferenceError}</div>}

            <form className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handlePreferenceSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                <input name="subject" value={preferenceForm.subject} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Number of Students</label>
                <input type="number" min="1" name="student_count" value={preferenceForm.student_count} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Semester</label>
                <input name="semester" value={preferenceForm.semester} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                <input name="department" value={preferenceForm.department} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                <input type="number" min="1" max="8" name="year" value={preferenceForm.year} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                <input name="section" value={preferenceForm.section} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="A" />
              </div>
              <div className="md:col-span-2 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Weekly Slots</label>
                  <button
                    type="button"
                    onClick={addPreferenceSlot}
                    disabled={preferenceForm.slots.length >= 4}
                    className={`px-3 py-1.5 rounded-md text-xs ${
                      preferenceForm.slots.length >= 4
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Add Slot
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {preferenceForm.slots.length}/4 slots added for this subject.
                </p>
                <div className="mt-3 space-y-3">
                  {preferenceForm.slots.map((slot, idx) => (
                    <div key={`slot-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Day</label>
                        <select
                          value={slot.day}
                          onChange={(e) => handlePreferenceSlotChange(idx, "day", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        >
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => handlePreferenceSlotChange(idx, "start_time", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">End Time</label>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => handlePreferenceSlotChange(idx, "end_time", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => removePreferenceSlot(idx)}
                          disabled={preferenceForm.slots.length === 1}
                          className={`w-full px-3 py-2.5 rounded-lg text-sm ${
                            preferenceForm.slots.length === 1
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : "bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Details</label>
                <textarea name="details" value={preferenceForm.details} onChange={handlePreferenceChange} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={submittingPreference} className={`px-4 py-2.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 ${submittingPreference ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {submittingPreference ? "Submitting..." : "Submit Preference"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">My Submitted Preferences</h4>
            {loadingMyPreferences ? (
              <p className="text-sm text-slate-500 mt-3">Loading...</p>
            ) : myPreferences.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No preferences submitted yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {myPreferences.map((pref) => (
                  <div key={pref.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">
                        {pref.day} | {pref.subject} | {pref.start_time} - {pref.end_time}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          pref.status === "approved"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : pref.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {pref.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Students: {pref.student_count || "-"}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Class: {pref.department || "-"} / {pref.year || "-"} / {pref.section || "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "assignments") {
      const selectedAssignment = facultyAssignments.find((row) => row.id === selectedAssignmentId);
      const submissionsByStudentId = new Map(
        assignmentSubmissions.map((row) => [row.student_id, row])
      );
      const rosterWithStatus = assignmentRoster.map((row) => {
        const submission = submissionsByStudentId.get(row.student_id) || null;
        return {
          ...row,
          submission,
          submitted: Boolean(submission),
        };
      });
      const submittedCount = rosterWithStatus.filter((row) => row.submitted).length;
      const pendingCount = Math.max(rosterWithStatus.length - submittedCount, 0);
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Assignment Studio</h3>
            <p className="text-sm text-slate-500 mt-1">
              Publish professional assignments with rich instructions, links, files, and deadline reminders.
            </p>

            {assignmentMessage && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {assignmentMessage}
              </div>
            )}
            {assignmentError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {assignmentError}
              </div>
            )}

            <form onSubmit={submitFacultyAssignment} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                name="title"
                value={assignmentForm.title}
                onChange={handleAssignmentInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Assignment title"
                required
              />
              <input
                name="subject"
                value={assignmentForm.subject}
                onChange={handleAssignmentInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Subject"
                required
              />
              <input
                name="semester"
                value={assignmentForm.semester}
                onChange={handleAssignmentInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Semester"
              />
              <input
                name="department"
                value={assignmentForm.department}
                onChange={handleAssignmentInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Department"
              />
              <input
                name="year"
                type="number"
                min="1"
                max="8"
                value={assignmentForm.year}
                onChange={handleAssignmentInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Year (optional)"
              />
              <input
                name="section"
                value={assignmentForm.section}
                onChange={handleAssignmentInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Section (optional)"
              />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Due Date & Time</label>
                <input
                  name="due_at"
                  type="datetime-local"
                  value={assignmentForm.due_at}
                  onChange={handleAssignmentInput}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reminder (days before)</label>
                <input
                  name="reminder_days_before"
                  type="number"
                  min="0"
                  max="14"
                  value={assignmentForm.reminder_days_before}
                  onChange={handleAssignmentInput}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <textarea
                name="description"
                rows={4}
                value={assignmentForm.description}
                onChange={handleAssignmentInput}
                className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Assignment instructions, rubrics, and expected outcome."
              />
              <textarea
                name="resource_links"
                rows={3}
                value={assignmentForm.resource_links}
                onChange={handleAssignmentInput}
                className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Resource links (one per line): video/audio/reference links"
              />
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <input
                  ref={assignmentFileInputRef}
                  type="file"
                  onChange={handleAssignmentAttachment}
                  className="text-sm"
                />
                {assignmentForm.attachment && (
                  <button
                    type="button"
                    onClick={clearAssignmentAttachment}
                    className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm hover:bg-red-100"
                  >
                    Cancel File
                  </button>
                )}
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="reminder_enabled"
                    checked={assignmentForm.reminder_enabled}
                    onChange={handleAssignmentInput}
                  />
                  Enable reminder
                </label>
                <button
                  type="submit"
                  disabled={submittingAssignment}
                  className={`rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 ${
                    submittingAssignment ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {submittingAssignment ? "Posting..." : "Post Assignment"}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-semibold text-slate-800">Published Assignments</h4>
                  <p className="text-xs text-slate-500 mt-1">Only assignments posted by you.</p>
                  <p className="text-xs text-slate-500">Click any assignment to view submitted students.</p>
                </div>
                <button
                  type="button"
                  onClick={loadFacultyAssignments}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
              {loadingFacultyAssignments ? (
                <p className="text-sm text-slate-500 mt-3">Loading assignments...</p>
              ) : facultyAssignments.length === 0 ? (
                <p className="text-sm text-slate-500 mt-3">No assignments posted yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {facultyAssignments.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setSelectedAssignmentId(row.id);
                        loadAssignmentSubmissions(row.id);
                        loadAssignmentRoster(row.id);
                      }}
                      className={`w-full text-left rounded-lg border p-3 ${
                        selectedAssignmentId === row.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{row.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{row.subject}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Due {new Date(row.due_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatPostedRealtime(row.created_at)}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Submissions: {row.submission_count || 0}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              {!selectedAssignment ? (
                <p className="text-sm text-slate-500">Select an assignment to view student submissions.</p>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-slate-800">{selectedAssignment.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{selectedAssignment.subject}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Due {new Date(selectedAssignment.due_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatPostedRealtime(selectedAssignment.created_at)}
                    </p>
                  </div>

                  <h5 className="text-sm font-semibold text-slate-800 mb-3">Students who submitted</h5>

                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                      <span>Enrolled: {rosterWithStatus.length}</span>
                      <span>Submitted: {submittedCount}</span>
                      <span>Pending: {pendingCount}</span>
                    </div>

                    {loadingAssignmentRoster ? (
                      <p className="text-sm text-slate-500 mt-3">Loading enrolled students...</p>
                    ) : rosterWithStatus.length === 0 ? (
                      <p className="text-sm text-slate-500 mt-3">
                        No enrolled students found for this teacher + subject + semester.
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Student</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Email</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Submitted At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rosterWithStatus.map((row) => (
                              <tr key={row.id} className="border-t border-slate-200">
                                <td className="px-3 py-2 text-sm text-slate-700">{row.student_name || "-"}</td>
                                <td className="px-3 py-2 text-sm text-slate-700">{row.student_email || "-"}</td>
                                <td className="px-3 py-2 text-sm">
                                  {row.submitted ? (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 text-xs">
                                      Submitted
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 text-xs">
                                      Not Submitted
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm text-slate-700">
                                  {row.submission?.submitted_at
                                    ? new Date(row.submission.submitted_at).toLocaleString()
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {loadingAssignmentSubmissions ? (
                    <p className="text-sm text-slate-500">Loading submissions...</p>
                  ) : assignmentSubmissions.length === 0 ? (
                    <p className="text-sm text-slate-500">No student has submitted this assignment yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {assignmentSubmissions.map((submission) => {
                        const draft = submissionReviewDrafts[submission.id] || {
                          status: submission.status || "submitted",
                          teacher_feedback: submission.teacher_feedback || "",
                          grade: submission.grade || "",
                        };
                        return (
                          <div key={submission.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-800">
                                {submission.student_name} ({submission.roll_number || "N/A"})
                              </p>
                              <span className="text-xs rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-700">
                                {submission.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Submitted on {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                            {submission.submission_text && (
                              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{submission.submission_text}</p>
                            )}
                            {submission.resource_links?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {submission.resource_links.map((link) => (
                                  <a
                                    key={link}
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-xs text-blue-700 hover:underline break-all"
                                  >
                                    {link}
                                  </a>
                                ))}
                              </div>
                            )}
                            {submission.attachment_url && (
                              <a
                                href={submission.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs text-blue-700 hover:underline"
                              >
                                Download file: {submission.attachment_name || "attachment"}
                              </a>
                            )}

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <select
                                value={draft.status}
                                onChange={(e) => handleSubmissionReviewDraft(submission.id, "status", e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              >
                                <option value="submitted">Submitted</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="needs_revision">Needs Revision</option>
                              </select>
                              <input
                                value={draft.grade}
                                onChange={(e) => handleSubmissionReviewDraft(submission.id, "grade", e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                placeholder="Grade (optional)"
                              />
                              <button
                                type="button"
                                onClick={() => saveSubmissionReview(submission.id)}
                                className="rounded-lg bg-slate-800 text-white hover:bg-slate-900 px-3 py-2 text-sm"
                              >
                                Save Review
                              </button>
                              <textarea
                                rows={2}
                                value={draft.teacher_feedback}
                                onChange={(e) =>
                                  handleSubmissionReviewDraft(
                                    submission.id,
                                    "teacher_feedback",
                                    e.target.value
                                  )
                                }
                                className="md:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                placeholder="Feedback for student..."
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "calendar") {
      const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
      const monthLabel = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });
      const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
      const startDay = monthStart.getDay();
      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const eventsForDate = (isoDate) => calendarEvents.filter((event) => event.date === isoDate);
      const selectedDayEvents = eventsForDate(selectedDate);

      const cells = [];
      for (let i = 0; i < startDay; i += 1) cells.push({ key: `e-${i}`, isoDate: null, day: null, events: [] });
      for (let d = 1; d <= daysInMonth; d += 1) {
        const isoDate = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        cells.push({ key: `d-${d}`, isoDate, day: d, events: eventsForDate(isoDate) });
      }

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-800">Faculty Calendar</h3>
              <p className="text-sm text-slate-500 mt-1">Plan your day using month view and day planner.</p>

              {eventMessage && <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{eventMessage}</div>}
              {eventError && <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{eventError}</div>}

              <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleEventSubmit}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Event Title</label>
                  <input name="title" value={eventForm.title} onChange={handleEventChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input type="date" name="date" value={eventForm.date} onChange={handleEventChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea name="description" rows={3} value={eventForm.description} onChange={handleEventChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={savingEvent} className={`px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 ${savingEvent ? "opacity-60 cursor-not-allowed" : ""}`}>
                    {savingEvent ? "Saving..." : editingEventId ? "Update Event" : "Add Event"}
                  </button>
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        setEventForm({ title: "", date: selectedDate, description: "" });
                      }}
                      className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h4 className="text-base font-semibold text-slate-800">Day Planner</h4>
              <p className="text-xs text-slate-500 mt-1">Selected date: {selectedDate}</p>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-slate-500 mt-4">No events for this day.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedDayEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                        {event.created_by === currentUserId && (
                          <div className="flex gap-1">
                            <button onClick={() => handleEditEvent(event)} className="px-2 py-1 text-xs rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteEvent(event.id)} className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200">
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Created by {event.creator_name} ({event.creator_role})
                      </p>
                      {event.description && <p className="text-sm text-slate-600 mt-2">{event.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-slate-800">{monthLabel}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                  className="px-2.5 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  className="px-2.5 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>

            {loadingCalendarEvents ? (
              <p className="text-sm text-slate-500">Loading events...</p>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map((w) => (
                    <div key={w} className="text-xs font-semibold text-slate-500 text-center py-2">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {cells.map((cell) => (
                    <button
                      type="button"
                      key={cell.key}
                      disabled={!cell.isoDate}
                      onClick={() => {
                        if (cell.isoDate) {
                          setSelectedDate(cell.isoDate);
                          if (!editingEventId) setEventForm((prev) => ({ ...prev, date: cell.isoDate }));
                        }
                      }}
                      className={`min-h-20 rounded-lg border p-2 text-left ${
                        !cell.isoDate
                          ? "border-transparent bg-transparent cursor-default"
                          : cell.isoDate === selectedDate
                            ? "border-blue-400 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      {cell.day && (
                        <>
                          <p className="text-xs font-semibold text-slate-700">{cell.day}</p>
                          {cell.events.length > 0 && (
                            <p className="text-[11px] text-blue-700 mt-1">{cell.events.length} event{cell.events.length > 1 ? "s" : ""}</p>
                          )}
                          {cell.events[0] && <p className="text-[11px] text-slate-600 mt-1 truncate">{cell.events[0].title}</p>}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "teachers") {
      const selectedTeacher = teacherDirectory.find(
        (teacher) => String(teacher.id) === String(facultyMessageForm.recipient_id)
      );
      const selectedTeacherName = selectedTeacher?.name || "None";

      return (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_52%)]" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                  Faculty Network
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">Teachers Directory</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Discover faculty contacts, message teachers quickly, and keep communication centralized.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    {teacherDirectory.length} teacher{teacherDirectory.length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    Selected: {selectedTeacherName}
                  </span>
                </div>
              </div>
              <input
                value={teacherSearch}
                onChange={handleTeacherSearch}
                placeholder="Search by name/email/department"
                className="w-full md:w-96 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            {teacherDirectoryError && (
              <div className="relative mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {teacherDirectoryError}
              </div>
            )}
          </div>

          {loadingTeacherDirectory ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm text-slate-500">Loading teachers...</p>
            </div>
          ) : teacherDirectory.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm text-slate-500">No other signed-up teachers found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
              {teacherDirectory.map((teacher) => (
                <div
                  key={teacher.id}
                  className={`w-full max-w-[350px] rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col ${
                    String(facultyMessageForm.recipient_id) === String(teacher.id)
                      ? "border-blue-300 ring-4 ring-blue-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="text-center">
                    {teacher.profile_image_url ? (
                      <img
                        src={teacher.profile_image_url}
                        alt={teacher.name}
                        className="h-16 w-16 rounded-full object-cover border border-slate-200 mx-auto ring-2 ring-slate-100"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full border border-slate-200 bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xl mx-auto ring-2 ring-slate-100">
                        {(teacher.name || "T").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="mt-4 h-px w-full bg-slate-200" />
                    <h4 className="mt-4 text-[1.35rem] leading-tight font-semibold text-slate-900 break-words">{teacher.name}</h4>
                    <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-slate-600">
                      {teacher.department || "Department not set"}
                    </p>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-center">
                    <p className="text-slate-700 break-words">
                      <span className="font-semibold text-slate-900">Email:</span> {teacher.email}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">Employee ID:</span> {teacher.roll_number || "-"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => selectTeacherForMessage(teacher.id)}
                    className="mt-6 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 px-3 py-2.5 text-base font-medium"
                  >
                    Message Teacher
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`grid grid-cols-1 ${showTeacherCompose ? "xl:grid-cols-2" : ""} gap-5`}>
            {showTeacherCompose && (
              <div ref={composeTeacherMessageRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-slate-900">Send Message to Teacher</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherCompose(false);
                      setFacultyMessageForm((prev) => ({ ...prev, recipient_id: "", subject: "", body: "" }));
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
                {selectedTeacher && (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Selected Teacher</p>
                    <p className="text-sm text-blue-900 mt-1 font-semibold">{selectedTeacher.name}</p>
                    <p className="text-xs text-blue-700 mt-0.5">{selectedTeacher.email}</p>
                  </div>
                )}
                <form onSubmit={sendFacultyMessage} className="mt-4 space-y-3">
                  <select
                    name="recipient_id"
                    value={facultyMessageForm.recipient_id}
                    onChange={handleFacultyMessageInput}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    required
                  >
                    <option value="" disabled>Select teacher</option>
                    {teacherDirectory.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </option>
                    ))}
                  </select>
                  <input
                    name="subject"
                    value={facultyMessageForm.subject}
                    onChange={handleFacultyMessageInput}
                    placeholder="Subject"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    required
                  />
                  <textarea
                    name="body"
                    rows={4}
                    value={facultyMessageForm.body}
                    onChange={handleFacultyMessageInput}
                    placeholder="Write your message..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    required
                  />
                  <button type="submit" className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5">
                    Send
                  </button>
                </form>

                {facultyMessageFeedback && (
                  <div className="mt-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {facultyMessageFeedback}
                  </div>
                )}
                {facultyMessageError && (
                  <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {facultyMessageError}
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Messages from Teachers</h4>
                  <p className="text-xs text-slate-500 mt-1">Direct faculty communication in one place.</p>
                </div>
                <button
                  type="button"
                  onClick={loadFacultyPeerInbox}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              {loadingFacultyInbox ? (
                <p className="text-sm text-slate-500 mt-4">Loading teacher messages...</p>
              ) : facultyInbox.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No messages from teachers yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {facultyInbox.map((msg) => (
                    <div key={msg.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{msg.subject}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        From {msg.sender_name} ({msg.sender_email}) | {new Date(msg.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "messages") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Contact Admin</h3>
            <p className="text-sm text-slate-500 mt-1">
              Share doubts, operational issues, or support requests with the admin team.
            </p>

            <form onSubmit={submitQueryToAdmin} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                name="subject"
                value={queryForm.subject}
                onChange={handleQueryInput}
                className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Subject"
                required
              />
              <select
                name="category"
                value={queryForm.category}
                onChange={handleQueryInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              >
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="technical">Technical</option>
                <option value="administrative">Administrative</option>
              </select>
              <select
                name="priority"
                value={queryForm.priority}
                onChange={handleQueryInput}
                className="rounded-lg border border-slate-300 px-3 py-2.5"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
              </select>
              <textarea
                name="body"
                rows={4}
                value={queryForm.body}
                onChange={handleQueryInput}
                className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2.5"
                placeholder="Write your query clearly..."
                required
              />
              <div className="md:col-span-2">
                <button type="submit" className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5">
                  Submit Query
                </button>
              </div>
            </form>

            {queryMessage && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {queryMessage}
              </div>
            )}
            {queryError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {queryError}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-800">My Submitted Queries</h4>
              <button
                type="button"
                onClick={loadMyQueries}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {loadingMyQueries ? (
              <p className="text-sm text-slate-500 mt-4">Loading your queries...</p>
            ) : myQueries.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No queries submitted yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {myQueries.map((query) => (
                  <div key={query.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{query.subject}</p>
                      <span className="text-xs rounded-full px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300">
                        {query.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {query.category} | {query.priority} priority | {new Date(query.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{query.body}</p>
                    {query.admin_note && (
                      <p className="text-sm text-slate-700 mt-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                        <span className="font-semibold">Admin Note:</span> {query.admin_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-800">Admin Announcements</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Announcements are centralized in Notifications to avoid duplicate views.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePage("notifications")}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Open Notifications
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "notifications") {
      return (
        <div className="space-y-4">
          <AnnouncementCarousel
            messages={inboxMessages}
            loading={loadingInboxMessages}
            error={inboxError}
            title="Faculty Notifications"
            subtitle="All admin announcements sent to faculty and to all users."
            emptyMessage="No notifications yet."
            onRefresh={loadInboxMessages}
          />

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-base font-semibold text-slate-800">All Announcement Notifications</h4>
            {inboxError ? (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {inboxError}
              </div>
            ) : loadingInboxMessages ? (
              <p className="text-sm text-slate-500 mt-4">Loading notifications...</p>
            ) : inboxMessages.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No notifications available.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {inboxMessages.map((msg) => (
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
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-800">Teacher Messages</h4>
              <button
                type="button"
                onClick={loadFacultyPeerInbox}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {loadingFacultyInbox ? (
              <p className="text-sm text-slate-500 mt-4">Loading teacher messages...</p>
            ) : facultyInbox.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">No teacher messages yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {facultyInbox.map((msg) => (
                  <div key={msg.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{msg.subject}</p>
                      <span className="text-xs rounded-full px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                        teacher
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      From {msg.sender_name} ({msg.sender_email}) | {new Date(msg.created_at).toLocaleString()}
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
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };

      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Conflict Request to Admin</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Report timetable, room, or operational conflicts directly to the Admin team for review and resolution.
                </p>
              </div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Destination: Admin
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-slate-700 uppercase">What to include</p>
              <p className="text-sm text-slate-600 mt-1">
                Mention class/room, date and time, conflict impact, and the support you need from Admin.
              </p>
            </div>

            <form onSubmit={submitFacultyConflict} className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Conflict Title</label>
                <input
                  name="title"
                  value={conflictForm.title}
                  onChange={handleConflictInput}
                  placeholder="e.g., Room clash for CSE-2 lecture on Friday"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message to Admin</label>
                <textarea
                  name="description"
                  rows={5}
                  value={conflictForm.description}
                  onChange={handleConflictInput}
                  placeholder="Describe the issue, affected class/day/time, current impact, and requested action from Admin."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <div>
                <button type="submit" className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5">
                  Send Conflict Request to Admin
                </button>
              </div>
            </form>

            {conflictMessage && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {conflictMessage}
              </div>
            )}
            {conflictError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {conflictError}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-800">Requests Sent to Admin</h4>
              <button
                type="button"
                onClick={loadFacultyConflicts}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {loadingFacultyConflicts ? (
              <p className="text-sm text-slate-500 mt-4">Loading conflict requests...</p>
            ) : facultyConflicts.length === 0 ? (
              <div className="mt-4 space-y-2">
                {conflictLoadError && (
                  <p className="text-sm text-amber-700">
                    {conflictLoadError}
                  </p>
                )}
                <p className="text-sm text-slate-500">No conflict requests submitted yet.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {conflictLoadError && (
                  <p className="text-sm text-amber-700">
                    {conflictLoadError}
                  </p>
                )}
                {facultyConflicts.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <span className={`text-xs rounded-full px-2.5 py-1 border ${statusClasses[item.status] || "bg-slate-100 text-slate-700 border-slate-300"}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted on {new Date(item.created_at).toLocaleString()}
                    </p>
                    {item.description && (
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{item.description}</p>
                    )}
                    {item.resolved_at && (
                      <p className="text-xs text-emerald-700 mt-2">
                        Resolved on {new Date(item.resolved_at).toLocaleString()}
                      </p>
                    )}
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
        <p className="text-sm text-slate-500 mt-2">Faculty module UI is ready. API integration for this section will be added next.</p>
      </div>
    );
  };

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activePage={activePage}
      onPageChange={setActivePage}
      pageTitle={sectionMessage}
      portalLabel="Faculty ERP Portal"
      userName={facultyName}
      userAvatarUrl={profile.profile_image_url}
      onLogout={onLogout}
    >
      {renderContent()}
    </DashboardLayout>
  );
}

export default FacultyDashboard;
