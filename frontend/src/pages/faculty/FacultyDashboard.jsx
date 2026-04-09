import { useEffect, useMemo, useRef, useState } from "react";
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
  const [expandedPreferenceSubject, setExpandedPreferenceSubject] = useState(null);
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
  const [classroomForm, setClassroomForm] = useState({
    title: "",
    subject: "",
    semester: "Odd 2026",
    department: "",
    year: "",
    section: "",
    description: "",
    join_link: "",
    cover_image: null,
  });
  const [showCreateClassroomModal, setShowCreateClassroomModal] = useState(false);
  const [classroomTheme, setClassroomTheme] = useState("sunset");
  const classroomThemePresets = [
    { key: "sunset", className: "linear-gradient(120deg, #fb7185, #f97316)" },
    { key: "ocean", className: "linear-gradient(120deg, #0ea5e9, #2563eb)" },
    { key: "mint", className: "linear-gradient(120deg, #10b981, #0ea5e9)" },
    { key: "violet", className: "linear-gradient(120deg, #8b5cf6, #ec4899)" },
    { key: "slate", className: "linear-gradient(120deg, #334155, #0f172a)" },
  ];
  const classroomFileInputRef = useRef(null);
  const [facultyClassrooms, setFacultyClassrooms] = useState([]);
  const [loadingFacultyClassrooms, setLoadingFacultyClassrooms] = useState(false);
  const [submittingClassroom, setSubmittingClassroom] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [isEditingSelectedClassroom, setIsEditingSelectedClassroom] = useState(false);
  const [savingSelectedClassroom, setSavingSelectedClassroom] = useState(false);
  const [classroomAccessEmails, setClassroomAccessEmails] = useState([]);
  const [loadingClassroomAccessEmails, setLoadingClassroomAccessEmails] = useState(false);
  const [newClassroomAccessEmail, setNewClassroomAccessEmail] = useState("");
  const [savingClassroomAccessEmail, setSavingClassroomAccessEmail] = useState(false);
  const [removingClassroomAccessEmailId, setRemovingClassroomAccessEmailId] = useState(null);
  const [selectedClassroomTab, setSelectedClassroomTab] = useState("stream");
  const [classroomAnnouncementDraft, setClassroomAnnouncementDraft] = useState("");
  const [classroomAnnouncementsById, setClassroomAnnouncementsById] = useState({});
  const [classroomPeople, setClassroomPeople] = useState([]);
  const [loadingClassroomPeople, setLoadingClassroomPeople] = useState(false);
  const [showClassworkComposer, setShowClassworkComposer] = useState(false);
  const [publishingClasswork, setPublishingClasswork] = useState(false);
  const [showClassworkCreateMenu, setShowClassworkCreateMenu] = useState(false);
  const [classworkCreateType, setClassworkCreateType] = useState("assignment");
  const [classworkDraft, setClassworkDraft] = useState({
    title: "",
    description: "",
    due_at: "",
    points: "100",
    topic: "",
  });
  const [showPeopleInviteForm, setShowPeopleInviteForm] = useState(false);
  const [selectedClassroomForm, setSelectedClassroomForm] = useState({
    title: "",
    subject: "",
    semester: "",
    department: "",
    year: "",
    section: "",
    description: "",
    join_link: "",
  });
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
  const classroomTabContentRef = useRef(null);
  const classroomTabsRef = useRef(null);
  const classworkCreateMenuRef = useRef(null);

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
      setClassroomForm((prev) => ({
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

  const loadFacultyClassrooms = async () => {
    setLoadingFacultyClassrooms(true);
    setAssignmentError("");
    try {
      const data = await PreferenceService.getFacultyClassrooms();
      setFacultyClassrooms(data || []);
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to load classrooms.");
    } finally {
      setLoadingFacultyClassrooms(false);
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
      loadFacultyClassrooms();
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

  useEffect(() => {
    if (!selectedClassroom?.id) return;
    const freshRoom = facultyClassrooms.find((room) => room.id === selectedClassroom.id);
    if (!freshRoom) {
      setSelectedClassroom(null);
      return;
    }
    if (freshRoom !== selectedClassroom) {
      setSelectedClassroom(freshRoom);
    }
  }, [facultyClassrooms, selectedClassroom]);

  useEffect(() => {
    if (!selectedClassroom?.id) {
      setClassroomAccessEmails([]);
      setNewClassroomAccessEmail("");
      setSelectedClassroomTab("stream");
      setClassroomPeople([]);
      return;
    }
    loadClassroomAccessEmails(selectedClassroom.id);
  }, [selectedClassroom?.id]);

  useEffect(() => {
    if (!selectedClassroom?.id || selectedClassroomTab !== "people") return;
    loadSelectedClassroomPeople(selectedClassroom);
  }, [selectedClassroom?.id, selectedClassroomTab]);

  useEffect(() => {
    if (selectedClassroomTab !== "classwork") {
      setShowClassworkCreateMenu(false);
      setShowClassworkComposer(false);
    }
  }, [selectedClassroomTab]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!showClassworkCreateMenu) return;
      if (classworkCreateMenuRef.current?.contains(event.target)) return;
      setShowClassworkCreateMenu(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showClassworkCreateMenu]);

  useEffect(() => {
    if (!selectedClassroom) {
      setIsEditingSelectedClassroom(false);
      setSelectedClassroomForm({
        title: "",
        subject: "",
        semester: "",
        department: "",
        year: "",
        section: "",
        description: "",
        join_link: "",
      });
      return;
    }
    setSelectedClassroomForm({
      title: selectedClassroom.title || "",
      subject: selectedClassroom.subject || "",
      semester: selectedClassroom.semester || "",
      department: selectedClassroom.department || "",
      year: selectedClassroom.year?.toString() || "",
      section: selectedClassroom.section || "",
      description: selectedClassroom.description || "",
      join_link: selectedClassroom.join_link || "",
    });
  }, [selectedClassroom]);

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

  const handleClassroomInput = (e) => {
    const { name, value } = e.target;
    setClassroomForm((prev) => ({ ...prev, [name]: value }));
    setAssignmentMessage("");
    setAssignmentError("");
  };

  const handleClassroomCover = (e) => {
    const file = e.target.files?.[0] || null;
    setClassroomForm((prev) => ({ ...prev, cover_image: file }));
    setAssignmentError("");
  };

  const clearClassroomCover = () => {
    setClassroomForm((prev) => ({ ...prev, cover_image: null }));
    if (classroomFileInputRef.current) {
      classroomFileInputRef.current.value = "";
    }
  };

  const submitFacultyClassroom = async (e) => {
    e.preventDefault();
    setSubmittingClassroom(true);
    setAssignmentMessage("");
    setAssignmentError("");
    try {
      const safeJoinLink = (classroomForm.join_link || "").trim() || "https://classroom.google.com";
      const formData = new FormData();
      formData.append("title", classroomForm.title);
      formData.append("subject", classroomForm.subject);
      formData.append("semester", classroomForm.semester || "");
      formData.append("department", classroomForm.department || "");
      formData.append("year", classroomForm.year || "");
      formData.append("section", classroomForm.section || "");
      formData.append("description", classroomForm.description || "");
      formData.append("join_link", safeJoinLink);
      formData.append("theme", classroomTheme);
      if (classroomForm.cover_image) {
        formData.append("cover_image", classroomForm.cover_image);
      }

      const res = await PreferenceService.createFacultyClassroom(formData);
      setAssignmentMessage(res.message || "Classroom created successfully.");
      if (res?.data?.id) {
        setFacultyClassrooms((prev) => [res.data, ...prev.filter((item) => item.id !== res.data.id)]);
        setSelectedClassroom(res.data);
        setSelectedClassroomTab("stream");
      }
      setClassroomForm((prev) => ({
        ...prev,
        title: "",
        subject: "",
        year: "",
        section: "",
        description: "",
        join_link: "",
        cover_image: null,
      }));
      setClassroomTheme("sunset");
      setShowCreateClassroomModal(false);
      if (classroomFileInputRef.current) classroomFileInputRef.current.value = "";
      await loadFacultyClassrooms();
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to create classroom.");
    } finally {
      setSubmittingClassroom(false);
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

  const preferenceStatusClasses = {
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const subjectPreferenceGroups = useMemo(() => {
    const groups = new Map();
    myPreferences.forEach((pref) => {
      const displaySubject = (pref.subject || "Untitled Subject").trim() || "Untitled Subject";
      const key = displaySubject.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          subject: displaySubject,
          entries: [],
          latestAtMs: 0,
          student_count: pref.student_count || "",
          department: pref.department || "",
          year: pref.year || "",
          section: pref.section || "",
        });
      }
      const group = groups.get(key);
      const entryTimeMs = new Date(pref.created_at || pref.updated_at || 0).getTime();
      group.entries.push(pref);
      if (entryTimeMs > group.latestAtMs) group.latestAtMs = entryTimeMs;
      if (!group.student_count && pref.student_count) group.student_count = pref.student_count;
      if (!group.department && pref.department) group.department = pref.department;
      if (!group.year && pref.year) group.year = pref.year;
      if (!group.section && pref.section) group.section = pref.section;
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => {
          const aTime = new Date(a.created_at || a.updated_at || 0).getTime();
          const bTime = new Date(b.created_at || b.updated_at || 0).getTime();
          return bTime - aTime;
        }),
      }))
      .sort((a, b) => b.latestAtMs - a.latestAtMs);
  }, [myPreferences]);

  useEffect(() => {
    if (subjectPreferenceGroups.length === 0) {
      setExpandedPreferenceSubject(null);
      return;
    }
    if (expandedPreferenceSubject && !subjectPreferenceGroups.some((group) => group.key === expandedPreferenceSubject)) {
      setExpandedPreferenceSubject(null);
    }
  }, [subjectPreferenceGroups, expandedPreferenceSubject]);

  const getClassroomCoverBackground = (room, fallbackIndex = 0, isHero = false) => {
    if (!room) return "linear-gradient(120deg, #0f172a, #1e293b)";

    if (room.cover_image_url) {
      const overlay = isHero
        ? "linear-gradient(120deg, rgba(15,23,42,0.46), rgba(15,23,42,0.24))"
        : "linear-gradient(120deg, rgba(15,23,42,0.35), rgba(15,23,42,0.2))";
      return `${overlay}, url('${room.cover_image_url}')`;
    }

    const presetFromTheme = classroomThemePresets.find((preset) => preset.key === room.theme)?.className;
    return presetFromTheme || classroomThemePresets[fallbackIndex % classroomThemePresets.length].className;
  };

  const selectedClassroomMetaText = useMemo(() => {
    if (!selectedClassroom) return "";
    const department = isEditingSelectedClassroom ? selectedClassroomForm.department : selectedClassroom.department;
    const year = isEditingSelectedClassroom ? selectedClassroomForm.year : selectedClassroom.year;
    const section = isEditingSelectedClassroom ? selectedClassroomForm.section : selectedClassroom.section;
    return [department, year ? `Year ${year}` : null, section].filter(Boolean).join(" | ");
  }, [
    selectedClassroom,
    isEditingSelectedClassroom,
    selectedClassroomForm.department,
    selectedClassroomForm.year,
    selectedClassroomForm.section,
  ]);

  const selectedClassroomAssignments = useMemo(() => {
    if (!selectedClassroom) return [];
    const norm = (v) => (v || "").toString().trim().toLowerCase();
    return (facultyAssignments || []).filter((row) => {
      if (norm(row.subject) !== norm(selectedClassroom.subject)) return false;
      if (selectedClassroom.semester && norm(row.semester) !== norm(selectedClassroom.semester)) return false;
      return true;
    });
  }, [selectedClassroom, facultyAssignments]);

  const selectedClassroomAnnouncements = useMemo(() => {
    if (!selectedClassroom?.id) return [];
    return classroomAnnouncementsById[selectedClassroom.id] || [];
  }, [selectedClassroom?.id, classroomAnnouncementsById]);

  const handleSelectedClassroomField = (e) => {
    const { name, value } = e.target;
    setSelectedClassroomForm((prev) => ({ ...prev, [name]: value }));
    setAssignmentMessage("");
    setAssignmentError("");
  };

  const startEditingSelectedClassroom = () => {
    if (!selectedClassroom) return;
    setSelectedClassroomForm({
      title: selectedClassroom.title || "",
      subject: selectedClassroom.subject || "",
      semester: selectedClassroom.semester || "",
      department: selectedClassroom.department || "",
      year: selectedClassroom.year?.toString() || "",
      section: selectedClassroom.section || "",
      description: selectedClassroom.description || "",
      join_link: selectedClassroom.join_link || "",
    });
    setIsEditingSelectedClassroom(true);
  };

  const cancelEditingSelectedClassroom = () => {
    setIsEditingSelectedClassroom(false);
    setAssignmentError("");
  };

  const saveSelectedClassroomDetails = async () => {
    if (!selectedClassroom?.id) return;
    setSavingSelectedClassroom(true);
    setAssignmentMessage("");
    setAssignmentError("");
    try {
      const payload = {
        title: selectedClassroomForm.title,
        subject: selectedClassroomForm.subject,
        semester: selectedClassroomForm.semester || "",
        department: selectedClassroomForm.department || "",
        year: selectedClassroomForm.year || "",
        section: selectedClassroomForm.section || "",
        description: selectedClassroomForm.description || "",
        join_link: selectedClassroomForm.join_link || "",
      };
      const res = await PreferenceService.updateFacultyClassroom(selectedClassroom.id, payload);
      const updated = res?.data || null;
      if (updated) {
        setFacultyClassrooms((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedClassroom(updated);
      }
      setAssignmentMessage(res?.message || "Classroom details updated.");
      setIsEditingSelectedClassroom(false);
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to update classroom details.");
    } finally {
      setSavingSelectedClassroom(false);
    }
  };

  const loadClassroomAccessEmails = async (classroomId) => {
    if (!classroomId) {
      setClassroomAccessEmails([]);
      return;
    }
    setLoadingClassroomAccessEmails(true);
    setAssignmentError("");
    try {
      const data = await PreferenceService.getFacultyClassroomAccessEmails(classroomId);
      setClassroomAccessEmails(data || []);
    } catch (err) {
      setClassroomAccessEmails([]);
      setAssignmentError(err.response?.data?.message || "Failed to load classroom access emails.");
    } finally {
      setLoadingClassroomAccessEmails(false);
    }
  };

  const loadSelectedClassroomPeople = async (classroom) => {
    if (!classroom?.subject) {
      setClassroomPeople([]);
      return;
    }
    setLoadingClassroomPeople(true);
    setAssignmentError("");
    try {
      const data = await PreferenceService.getFacultyCourseEnrollments({
        subject: classroom.subject,
        semester: classroom.semester || undefined,
      });
      setClassroomPeople(data || []);
    } catch (err) {
      setClassroomPeople([]);
      setAssignmentError(err.response?.data?.message || "Failed to load classroom students.");
    } finally {
      setLoadingClassroomPeople(false);
    }
  };

  const addStudentAccessEmail = async (e) => {
    e.preventDefault();
    if (!selectedClassroom?.id) return;
    const email = (newClassroomAccessEmail || "").trim().toLowerCase();
    if (!email) {
      setAssignmentError("Enter a student email.");
      return;
    }
    setSavingClassroomAccessEmail(true);
    setAssignmentMessage("");
    setAssignmentError("");
    try {
      const res = await PreferenceService.addFacultyClassroomAccessEmail(selectedClassroom.id, email);
      const added = res?.data;
      if (added) {
        setClassroomAccessEmails((prev) => {
          const exists = prev.some((row) => row.id === added.id || row.student_email === added.student_email);
          if (exists) return prev;
          return [added, ...prev];
        });
      } else {
        await loadClassroomAccessEmails(selectedClassroom.id);
      }
      setNewClassroomAccessEmail("");
      setAssignmentMessage(res?.message || "Student access email added.");
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to add student access email.");
    } finally {
      setSavingClassroomAccessEmail(false);
    }
  };

  const removeStudentAccessEmail = async (accessEmailId) => {
    if (!selectedClassroom?.id || !accessEmailId) return;
    setRemovingClassroomAccessEmailId(accessEmailId);
    setAssignmentMessage("");
    setAssignmentError("");
    try {
      const res = await PreferenceService.removeFacultyClassroomAccessEmail(selectedClassroom.id, accessEmailId);
      setClassroomAccessEmails((prev) => prev.filter((row) => row.id !== accessEmailId));
      setAssignmentMessage(res?.message || "Student access email removed.");
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to remove student access email.");
    } finally {
      setRemovingClassroomAccessEmailId(null);
    }
  };

  const classworkCreateItems = [
    { key: "assignment", label: "Assignment" },
    { key: "quiz_assignment", label: "Quiz assignment" },
    { key: "question", label: "Question" },
    { key: "material", label: "Material" },
    { key: "reuse_post", label: "Reuse post" },
    { key: "topic", label: "Topic" },
  ];

  const classworkTypeLabelMap = {
    assignment: "Assignment",
    quiz_assignment: "Quiz assignment",
    question: "Question",
    material: "Material",
    reuse_post: "Reuse post",
    topic: "Topic",
  };

  const openClassworkComposer = (typeKey) => {
    setClassworkCreateType(typeKey);
    setShowClassworkComposer(true);
    setShowClassworkCreateMenu(false);
    setClassworkDraft({ title: "", description: "", due_at: "", points: "100", topic: "" });
    setAssignmentMessage("");
    setAssignmentError("");
  };

  const publishClassworkFromClassroom = async (e) => {
    e.preventDefault();
    if (!selectedClassroom) return;
    if (!classworkDraft.title.trim()) {
      setAssignmentError("Title is required.");
      return;
    }
    if (!classworkDraft.due_at) {
      setAssignmentError("Due date and time is required.");
      return;
    }

    setPublishingClasswork(true);
    setAssignmentMessage("");
    setAssignmentError("");
    try {
      const prefix = classworkTypeLabelMap[classworkCreateType] || "Classwork";
      const title = classworkCreateType === "assignment" ? classworkDraft.title.trim() : `[${prefix}] ${classworkDraft.title.trim()}`;
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subject", selectedClassroom.subject || "");
      formData.append("description", classworkDraft.description || "");
      formData.append("semester", selectedClassroom.semester || "");
      formData.append("department", selectedClassroom.department || "");
      formData.append("year", selectedClassroom.year || "");
      formData.append("section", selectedClassroom.section || "");
      formData.append("due_at", new Date(classworkDraft.due_at).toISOString());
      formData.append("reminder_enabled", "true");
      formData.append("reminder_days_before", "1");
      formData.append("resource_links", "");
      const res = await PreferenceService.createFacultyAssignment(formData);
      setAssignmentMessage(res?.message || `${prefix} published successfully.`);
      setShowClassworkComposer(false);
      setClassworkDraft({ title: "", description: "", due_at: "", points: "100", topic: "" });
      await loadFacultyAssignments();
    } catch (err) {
      setAssignmentError(err.response?.data?.message || "Failed to publish classwork.");
    } finally {
      setPublishingClasswork(false);
    }
  };

  const postClassroomAnnouncement = (e) => {
    e.preventDefault();
    if (!selectedClassroom?.id) return;
    const text = (classroomAnnouncementDraft || "").trim();
    if (!text) return;
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      body: text,
      created_at: new Date().toISOString(),
    };
    setClassroomAnnouncementsById((prev) => ({
      ...prev,
      [selectedClassroom.id]: [newItem, ...(prev[selectedClassroom.id] || [])],
    }));
    setClassroomAnnouncementDraft("");
    setAssignmentMessage("Announcement posted in stream.");
    setAssignmentError("");
  };

  const handleClassroomTabChange = (tabKey) => {
    setSelectedClassroomTab(tabKey);
    setTimeout(() => {
      const target = classroomTabsRef.current || classroomTabContentRef.current;
      if (!target) return;
      const scrollContainer = target.closest("main");
      if (scrollContainer) {
        const top = Math.max(0, target.offsetTop - 12);
        scrollContainer.scrollTo({ top, behavior: "smooth" });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 40);
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
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

            <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handlePreferenceSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
                <input
                  name="subject"
                  value={preferenceForm.subject}
                  onChange={handlePreferenceChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Number of Students</label>
                <input
                  type="number"
                  min="1"
                  name="student_count"
                  value={preferenceForm.student_count}
                  onChange={handlePreferenceChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Semester</label>
                <input
                  name="semester"
                  value={preferenceForm.semester}
                  onChange={handlePreferenceChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Department</label>
                <input
                  name="department"
                  value={preferenceForm.department}
                  onChange={handlePreferenceChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Year</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  name="year"
                  value={preferenceForm.year}
                  onChange={handlePreferenceChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Section</label>
                <input
                  name="section"
                  value={preferenceForm.section}
                  onChange={handlePreferenceChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="A"
                />
              </div>
              <div className="md:col-span-2 rounded-md border border-slate-200 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Weekly Slots</label>
                  <button
                    type="button"
                    onClick={addPreferenceSlot}
                    disabled={preferenceForm.slots.length >= 4}
                    className={`rounded-md px-3 py-1.5 text-xs ${
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
                <div className="mt-2.5 space-y-2.5">
                  {preferenceForm.slots.map((slot, idx) => (
                    <div key={`slot-${idx}`} className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Day</label>
                        <select
                          value={slot.day}
                          onChange={(e) => handlePreferenceSlotChange(idx, "day", e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => handlePreferenceSlotChange(idx, "start_time", e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">End Time</label>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => handlePreferenceSlotChange(idx, "end_time", e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={() => removePreferenceSlot(idx)}
                          disabled={preferenceForm.slots.length === 1}
                          className={`w-full rounded-md px-3 py-2 text-sm ${
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Details</label>
                <textarea
                  name="details"
                  value={preferenceForm.details}
                  onChange={handlePreferenceChange}
                  rows={2}
                  placeholder="Optional notes for admin (special requirements, constraints, etc.)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-end border-t border-slate-200 pt-3">
                <button
                  type="submit"
                  disabled={submittingPreference}
                  className={`rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
                    submittingPreference ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
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
              <div className="mt-4 space-y-2.5">
                {subjectPreferenceGroups.map((group) => {
                  const isExpanded = expandedPreferenceSubject === group.key;
                  const latestStatus = group.entries[0]?.status || "pending";
                  return (
                    <div key={group.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedPreferenceSubject((prev) => (prev === group.key ? null : group.key))}
                        aria-expanded={isExpanded}
                        aria-controls={`pref-group-${group.key}`}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{group.subject}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {group.entries.length} preferred slot{group.entries.length > 1 ? "s" : ""} submitted
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs ${
                              preferenceStatusClasses[latestStatus] || "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            {latestStatus}
                          </span>
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          >
                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="m5 8 5 5 5-5" />
                            </svg>
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div id={`pref-group-${group.key}`} className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs text-slate-600">
                            Class: {group.department || "-"} / {group.year || "-"} / {group.section || "-"} | Students:{" "}
                            {group.student_count || "-"}
                          </p>
                          <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
                            {group.entries.map((pref) => (
                              <div key={pref.id} className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-800">
                                    {pref.day} | {pref.start_time} - {pref.end_time}
                                  </p>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-xs ${
                                      preferenceStatusClasses[pref.status] ||
                                      "bg-slate-100 text-slate-700 border-slate-300"
                                    }`}
                                  >
                                    {pref.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  Submitted: {pref.created_at ? new Date(pref.created_at).toLocaleString() : "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activePage === "assignments") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            {!selectedClassroom && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Classrooms</h3>
                  <p className="text-sm text-slate-500 mt-1">Manage classes, meeting links, and assignment communication.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadFacultyClassrooms}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateClassroomModal(true)}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    + New class
                  </button>
                </div>
              </div>
            )}

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

            {selectedClassroom ? (
              <div className="mt-2">
                <div
                  className="overflow-hidden rounded-2xl border border-slate-200"
                  style={{
                    backgroundImage: getClassroomCoverBackground(
                      selectedClassroom,
                      Math.max(
                        0,
                        facultyClassrooms.findIndex((room) => room.id === selectedClassroom.id)
                      ),
                      true
                    ),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="px-6 py-6 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedClassroom(null)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                        Back to Classrooms
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={isEditingSelectedClassroom ? cancelEditingSelectedClassroom : startEditingSelectedClassroom}
                          className="rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                        >
                          {isEditingSelectedClassroom ? "Cancel Edit" : "Edit Details"}
                        </button>
                        <a
                          href={selectedClassroom.join_link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                        >
                          Open Live Class
                        </a>
                      </div>
                    </div>
                    <p className="mt-5 text-3xl font-semibold tracking-tight">
                      {isEditingSelectedClassroom ? selectedClassroomForm.title || "Untitled Classroom" : selectedClassroom.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-100">
                      {isEditingSelectedClassroom ? selectedClassroomForm.subject || "Subject" : selectedClassroom.subject}
                    </p>
                    <p className="mt-1 text-xs text-slate-200">{selectedClassroomMetaText}</p>
                    <p className="mt-1 text-xs font-medium text-slate-100">
                      Teacher: {selectedClassroom.faculty_name || facultyName || "Faculty"}
                    </p>
                  </div>
                </div>

                <div className="sticky top-[-1rem] z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur md:top-[-1.5rem] md:-mx-6 md:px-6">
                  <div ref={classroomTabsRef} className="flex flex-wrap items-center gap-2">
                    {[
                      { key: "stream", label: "Stream" },
                      { key: "classwork", label: "Classwork" },
                      { key: "people", label: "People" },
                      { key: "grades", label: "Grades" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => handleClassroomTabChange(tab.key)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                          selectedClassroomTab === tab.key
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div ref={classroomTabContentRef} className="scroll-mt-20" />

                {selectedClassroomTab === "stream" && (
                <>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-lg font-semibold text-slate-900">Classroom Overview</h4>
                    {isEditingSelectedClassroom ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Class Name</span>
                            <input
                              name="title"
                              value={selectedClassroomForm.title}
                              onChange={handleSelectedClassroomField}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                              required
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Subject</span>
                            <input
                              name="subject"
                              value={selectedClassroomForm.subject}
                              onChange={handleSelectedClassroomField}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                              required
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Section</span>
                            <input
                              name="section"
                              value={selectedClassroomForm.section}
                              onChange={handleSelectedClassroomField}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Semester</span>
                            <input
                              name="semester"
                              value={selectedClassroomForm.semester}
                              onChange={handleSelectedClassroomField}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Department</span>
                            <input
                              name="department"
                              value={selectedClassroomForm.department}
                              onChange={handleSelectedClassroomField}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Year</span>
                            <input
                              type="number"
                              min="1"
                              max="8"
                              name="year"
                              value={selectedClassroomForm.year}
                              onChange={handleSelectedClassroomField}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                            />
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Online Meeting Link</span>
                            <input
                              name="join_link"
                              value={selectedClassroomForm.join_link}
                              onChange={handleSelectedClassroomField}
                              placeholder="https://meet.google.com/abc-defg-hij"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</span>
                          <textarea
                            name="description"
                            rows={4}
                            value={selectedClassroomForm.description}
                            onChange={handleSelectedClassroomField}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                          />
                        </label>
                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                          <button
                            type="button"
                            onClick={cancelEditingSelectedClassroom}
                            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveSelectedClassroomDetails}
                            disabled={savingSelectedClassroom}
                            className={`rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${
                              savingSelectedClassroom ? "cursor-not-allowed opacity-60" : ""
                            }`}
                          >
                            {savingSelectedClassroom ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {selectedClassroom.description || "No class description added yet."}
                        </p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Section</p>
                            <p className="font-medium text-slate-800">{selectedClassroom.section || "-"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Semester</p>
                            <p className="font-medium text-slate-800">{selectedClassroom.semester || "-"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Department</p>
                            <p className="font-medium text-slate-800">{selectedClassroom.department || "-"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Year</p>
                            <p className="font-medium text-slate-800">{selectedClassroom.year || "-"}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="text-base font-semibold text-slate-900">Quick Actions</h4>
                    <div className="mt-3 space-y-2">
                      <a
                        href={selectedClassroom.join_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Open class meeting
                        <span>{">"}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(selectedClassroom.join_link || "")}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Copy class link
                        <span>#</span>
                      </button>
                      <button
                        type="button"
                        onClick={loadFacultyClassrooms}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Refresh classroom data
                        <span>R</span>
                      </button>
                    </div>

                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="text-base font-semibold text-slate-900">Stream</h4>
                  <form onSubmit={postClassroomAnnouncement} className="mt-3">
                    <textarea
                      rows={3}
                      value={classroomAnnouncementDraft}
                      onChange={(e) => setClassroomAnnouncementDraft(e.target.value)}
                      placeholder="Post an announcement for this classroom..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Post Announcement
                      </button>
                    </div>
                  </form>

                  {selectedClassroomAnnouncements.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No announcements yet.</p>
                  ) : (
                    <div className="mt-3 max-h-60 space-y-2.5 overflow-y-auto pr-1">
                      {selectedClassroomAnnouncements.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{item.body}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </>
                )}

                {selectedClassroomTab === "classwork" && (
                  <div className={`mt-4 border border-slate-200 bg-white ${showClassworkComposer ? "-mx-4 overflow-hidden rounded-none border-x-0 md:-mx-6" : "rounded-2xl p-5"}`}>
                    {showClassworkComposer ? (
                      <form onSubmit={publishClassworkFromClassroom} className="overflow-hidden bg-slate-50">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowClassworkComposer(false)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                              title="Close"
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                            <p className="text-xl font-medium text-slate-900">
                              {classworkTypeLabelMap[classworkCreateType] || "Classwork"}
                            </p>
                          </div>
                          <button
                            type="submit"
                            disabled={publishingClasswork || !classworkDraft.title.trim() || !classworkDraft.due_at}
                            className={`rounded-full px-5 py-2 text-sm font-semibold ${
                              publishingClasswork || !classworkDraft.title.trim() || !classworkDraft.due_at
                                ? "cursor-not-allowed bg-slate-300 text-slate-600"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {publishingClasswork ? "Publishing..." : "Assign"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12">
                          <div className="border-r border-slate-200 bg-slate-50 p-4 lg:col-span-9">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <input
                                value={classworkDraft.title}
                                onChange={(e) => setClassworkDraft((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Title *"
                                className="w-full border-b border-red-300 px-1 py-2 text-xl text-slate-900 outline-none placeholder:text-slate-400"
                                required
                              />
                              <p className="mt-1 text-xs text-red-500">*Required</p>

                              <textarea
                                rows={8}
                                value={classworkDraft.description}
                                onChange={(e) => setClassworkDraft((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Instructions (optional)"
                                className="mt-4 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                              />

                              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-sm font-medium text-slate-800">Attach</p>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                  {["Drive", "YouTube", "Create", "Upload", "Link", "NotebookLM", "Gem"].map((item) => (
                                    <button
                                      key={item}
                                      type="button"
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                                    >
                                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px]">+</span>
                                      {item}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <aside className="space-y-3 bg-white p-4 lg:col-span-3">
                            <div>
                              <p className="text-sm text-slate-700">For</p>
                              <div className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                {selectedClassroom.title}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-slate-700">Assign to</p>
                              <div className="mt-1 rounded-full border border-slate-300 px-3 py-2 text-center text-sm text-blue-700">
                                All students
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-slate-700">Points</p>
                              <select
                                value={classworkDraft.points}
                                onChange={(e) => setClassworkDraft((prev) => ({ ...prev, points: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                              >
                                <option value="100">100</option>
                                <option value="50">50</option>
                                <option value="25">25</option>
                                <option value="10">10</option>
                              </select>
                            </div>
                            <div>
                              <p className="text-sm text-slate-700">Due</p>
                              <input
                                type="datetime-local"
                                value={classworkDraft.due_at}
                                onChange={(e) => setClassworkDraft((prev) => ({ ...prev, due_at: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                                required
                              />
                            </div>
                            <div>
                              <p className="text-sm text-slate-700">Topic</p>
                              <input
                                value={classworkDraft.topic}
                                onChange={(e) => setClassworkDraft((prev) => ({ ...prev, topic: e.target.value }))}
                                placeholder="No topic"
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                              />
                            </div>
                          </aside>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="text-base font-semibold text-slate-900">Classwork</h4>
                          <div className="relative" ref={classworkCreateMenuRef}>
                            <button
                              type="button"
                              onClick={() => setShowClassworkCreateMenu((prev) => !prev)}
                              className="inline-flex items-center gap-2 rounded-full border-2 border-blue-500 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                              <span className="text-lg leading-none">+</span>
                              <span>Create</span>
                            </button>

                            {showClassworkCreateMenu && (
                              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                {classworkCreateItems.map((item) => (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => openClassworkComposer(item.key)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-800 hover:bg-slate-50"
                                  >
                                    <span>{item.label}</span>
                                    <span className="text-slate-400">+</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            {selectedClassroomAssignments.length} item{selectedClassroomAssignments.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {selectedClassroomAssignments.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-500">No assignments posted yet for this classroom.</p>
                        ) : (
                          <div className="mt-3 space-y-2.5">
                            {selectedClassroomAssignments.map((item) => (
                              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Subject: {item.subject} | Due: {item.due_at ? new Date(item.due_at).toLocaleString() : "No due date"}
                                </p>
                                {item.description && <p className="mt-2 text-sm text-slate-700">{item.description}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedClassroomTab === "people" && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="border-b border-slate-200 pb-5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-2xl font-semibold text-slate-900">Teachers</h4>
                        <button
                          type="button"
                          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title="Manage teacher access"
                        >
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="3.5" />
                            <path d="M20 8v6" />
                            <path d="M17 11h6" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                          {(selectedClassroom.faculty_name || facultyName || "F").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                            {selectedClassroom.faculty_name || facultyName || "Faculty"}
                          </p>
                          <p className="text-xs text-slate-500">{profile.email || "Teacher account"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-2xl font-semibold text-slate-900">Students</h4>
                        <button
                          type="button"
                          onClick={() => setShowPeopleInviteForm((prev) => !prev)}
                          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title="Invite students"
                        >
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="3.5" />
                            <path d="M20 8v6" />
                            <path d="M17 11h6" />
                          </svg>
                        </button>
                      </div>

                      {showPeopleInviteForm && (
                        <form onSubmit={addStudentAccessEmail} className="mt-3 flex items-center gap-2">
                          <input
                            type="email"
                            value={newClassroomAccessEmail}
                            onChange={(e) => setNewClassroomAccessEmail(e.target.value)}
                            placeholder="student@college.edu"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={savingClassroomAccessEmail}
                            className={`rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
                              savingClassroomAccessEmail ? "cursor-not-allowed opacity-60" : ""
                            }`}
                          >
                            {savingClassroomAccessEmail ? "Inviting..." : "Invite"}
                          </button>
                        </form>
                      )}

                      {loadingClassroomAccessEmails ? (
                        <p className="mt-3 text-sm text-slate-500">Loading invited students...</p>
                      ) : classroomAccessEmails.length === 0 ? (
                        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <p className="text-sm text-slate-600">Add students to this class</p>
                          <button
                            type="button"
                            onClick={() => setShowPeopleInviteForm(true)}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="3.5" />
                              <path d="M20 8v6" />
                              <path d="M17 11h6" />
                            </svg>
                            Invite students
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-4">
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">Invited by Email</p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {classroomAccessEmails.length}
                              </span>
                            </div>
                            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                              {classroomAccessEmails.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                  <p className="truncate pr-2 text-sm text-slate-700">{entry.student_email}</p>
                                  <button
                                    type="button"
                                    onClick={() => removeStudentAccessEmail(entry.id)}
                                    disabled={removingClassroomAccessEmailId === entry.id}
                                    className={`rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 ${
                                      removingClassroomAccessEmailId === entry.id ? "cursor-not-allowed opacity-60" : ""
                                    }`}
                                  >
                                    {removingClassroomAccessEmailId === entry.id ? "..." : "Remove"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-slate-200 pt-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">Joined Students</p>
                              <button
                                type="button"
                                onClick={() => loadSelectedClassroomPeople(selectedClassroom)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                Refresh
                              </button>
                            </div>
                            {loadingClassroomPeople ? (
                              <p className="text-sm text-slate-500">Loading students...</p>
                            ) : classroomPeople.length === 0 ? (
                              <p className="text-sm text-slate-500">No students joined yet.</p>
                            ) : (
                              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                                {classroomPeople.map((row) => (
                                  <div key={row.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                                    <p className="text-sm font-medium text-slate-800">{row.student_name || "Student"}</p>
                                    <p className="mt-0.5 text-xs text-slate-600">{row.student_email || "-"}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedClassroomTab === "grades" && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="text-base font-semibold text-slate-900">Grades</h4>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Assignments</p>
                        <p className="text-lg font-semibold text-slate-800">{selectedClassroomAssignments.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
                        <p className="text-lg font-semibold text-slate-800">{classroomPeople.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Stream Posts</p>
                        <p className="text-lg font-semibold text-slate-800">{selectedClassroomAnnouncements.length}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-600">
                      Gradebook analytics can be extended here with submission-level marks and averages.
                    </p>
                  </div>
                )}
              </div>
            ) : loadingFacultyClassrooms ? (
              <p className="text-sm text-slate-500 mt-4">Loading classrooms...</p>
            ) : facultyClassrooms.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-700">No classrooms yet</p>
                <p className="mt-1 text-xs text-slate-500">Click `+ New class` to create your first classroom.</p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {facultyClassrooms.map((room, index) => (
                  <div
                    key={room.id}
                    className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => {
                      setSelectedClassroom(room);
                      setSelectedClassroomTab("stream");
                    }}
                  >
                    <div
                      className="relative h-28 px-4 py-3 text-white"
                      style={{
                        backgroundImage: getClassroomCoverBackground(room, index),
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <span className="inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                        Active
                      </span>
                      <p className="mt-2 text-xl font-semibold leading-tight truncate">{room.title}</p>
                      <p className="text-xs mt-1 opacity-95 truncate">{room.section || room.semester || "Classroom"}</p>
                    </div>
                    <div className="px-4 py-4 min-h-[88px]">
                      <p className="truncate text-lg font-semibold text-slate-900">{room.subject}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {[room.department, room.year ? `Year ${room.year}` : null].filter(Boolean).join(" | ") || "Academic classroom"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">{room.faculty_name || facultyName}</p>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 border-t border-slate-200 bg-slate-50/70 px-3 py-2.5">
                      <a
                        href={room.join_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-700"
                        title="Open class link"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M15 8a5 5 0 1 0-4.9 6" />
                          <path d="M16 19h6" />
                          <path d="M19 16v6" />
                        </svg>
                      </a>
                      <a
                        href={room.join_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-700"
                        title="Open classroom"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                      </a>
                      <div className="rounded-lg p-2 text-slate-400" title="Cloud classroom">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M7 18a4 4 0 0 1-.4-8A5 5 0 0 1 16.3 8a3.8 3.8 0 0 1 .7 7.5" />
                          <path d="M12 12v7" />
                          <path d="m9.5 16.5 2.5 2.5 2.5-2.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showCreateClassroomModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
              <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <h4 className="text-lg font-semibold uppercase tracking-wide text-slate-900">Create a New Classroom</h4>
                  <button
                    type="button"
                    onClick={() => setShowCreateClassroomModal(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close create classroom dialog"
                    title="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12" />
                      <path d="M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={submitFacultyClassroom} className="max-h-[78vh] overflow-y-auto px-5 py-4">
                  <div>
                    <h5 className="text-base font-semibold text-slate-900">1. Class Details</h5>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Class name</span>
                        <input
                          name="title"
                          value={classroomForm.title}
                          onChange={handleClassroomInput}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                          placeholder="e.g., Data Structures - CSE 3A"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Section</span>
                        <input
                          name="section"
                          value={classroomForm.section}
                          onChange={handleClassroomInput}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                          placeholder="e.g., Section A (2022-2026)"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Subject</span>
                        <input
                          name="subject"
                          value={classroomForm.subject}
                          onChange={handleClassroomInput}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                          placeholder="e.g., Computer Networks"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Semester</span>
                        <input
                          name="semester"
                          value={classroomForm.semester}
                          onChange={handleClassroomInput}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                          placeholder="e.g., B.Tech Sem 5 (Odd 2026)"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Department</span>
                        <input
                          name="department"
                          value={classroomForm.department}
                          onChange={handleClassroomInput}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                          placeholder="e.g., Computer Science & Engineering"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Year</span>
                        <input
                          name="year"
                          type="number"
                          min="1"
                          max="8"
                          value={classroomForm.year}
                          onChange={handleClassroomInput}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                          placeholder="e.g., 3"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Class link</span>
                        <input
                          name="join_link"
                          value={classroomForm.join_link}
                          onChange={handleClassroomInput}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                          placeholder="e.g., https://meet.google.com/abc-defg-hij"
                        />
                        <span className="mt-1 block text-xs text-slate-500">
                          Add Google Meet / Zoom / Microsoft Teams classroom link. If left blank, default classroom link is used.
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="text-base font-semibold text-slate-900">2. Class Appearance</h5>
                      <button
                        type="button"
                        onClick={() => classroomFileInputRef.current?.click()}
                        className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Select from Gallery
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {classroomThemePresets.map((preset) => (
                        <button
                          type="button"
                          key={preset.key}
                          onClick={() => setClassroomTheme(preset.key)}
                          className={`h-14 rounded-lg border transition ${classroomTheme === preset.key ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200 hover:border-slate-300"}`}
                          style={{ background: preset.className }}
                        />
                      ))}
                    </div>

                    <input
                      ref={classroomFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleClassroomCover}
                      className="hidden"
                    />

                    {classroomForm.cover_image && (
                      <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="truncate pr-3 text-xs text-slate-700">{classroomForm.cover_image.name}</p>
                        <button
                          type="button"
                          onClick={clearClassroomCover}
                          className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description (optional)</span>
                      <textarea
                        name="description"
                        rows={3}
                        value={classroomForm.description}
                        onChange={handleClassroomInput}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                        placeholder="Brief class intro, rules, or plan."
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateClassroomModal(false)}
                      className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingClassroom}
                      className={`rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${
                        submittingClassroom ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      {submittingClassroom ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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

