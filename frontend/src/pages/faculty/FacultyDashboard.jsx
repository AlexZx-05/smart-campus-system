import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PreferenceService from "../../services/PreferenceService";
import DashboardService from "../../services/DashboardService";
import FacultyService from "../../services/FacultyService";
import EventService from "../../services/EventService";
import AnnouncementCarousel from "../../components/AnnouncementCarousel";
import Queries from "../student/Queries";
import CalendarPage from "../student/CalendarPage";

const notificationAvatarPalette = [
  "from-cyan-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-400 to-pink-600",
  "from-orange-400 to-rose-600",
  "from-violet-400 to-indigo-600",
];
const LAST_SELECTED_TEACHER_KEY = "faculty_last_selected_teacher_id";

const notificationInitialsFrom = (name = "") =>
  name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "N";

const notificationTimeAgo = (iso) => {
  const value = new Date(iso).getTime();
  if (Number.isNaN(value)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

function FacultyDashboard({ onLogout }) {
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
  const [profileTab, setProfileTab] = useState("general");
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
  const [showTeacherProfilePanel, setShowTeacherProfilePanel] = useState(false);
  const [showTeacherAvatarPreview, setShowTeacherAvatarPreview] = useState(false);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
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
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
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
  const [quizGradeImporting, setQuizGradeImporting] = useState(true);
  const [questionType, setQuestionType] = useState("short_answer");
  const [allowStudentReplies, setAllowStudentReplies] = useState(true);
  const [allowStudentEditAnswer, setAllowStudentEditAnswer] = useState(false);
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
  const teacherMenuRef = useRef(null);
  const classroomTabContentRef = useRef(null);
  const classroomTabsRef = useRef(null);
  const classworkCreateMenuRef = useRef(null);

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "my-timetable", label: "My Timetable" },
    { key: "all-classes", label: "All Classes" },
    { key: "preferences", label: "Submit Preference" },
    { key: "assignments", label: "Classroom" },
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
    assignments: "Classroom",
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

  const refreshFacultyNotifications = async () => {
    await Promise.all([loadInboxMessages(), loadFacultyPeerInbox()]);
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
    if (activePage === "dashboard") {
      loadInboxMessages();
      loadFacultyTimetable();
      loadFacultyRoomLiveStatus();
    }
    if (activePage === "notifications") {
      loadInboxMessages();
      loadFacultyPeerInbox();
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
    if (!facultyMessageFeedback) return undefined;
    const timer = setTimeout(() => setFacultyMessageFeedback(""), 1800);
    return () => clearTimeout(timer);
  }, [facultyMessageFeedback]);

  useEffect(() => {
    if (activePage !== "teachers") return;
    if (!teacherDirectory.length) return;

    const currentRecipient = String(facultyMessageForm.recipient_id || "");
    if (currentRecipient && teacherDirectory.some((teacher) => String(teacher.id) === currentRecipient)) {
      try {
        localStorage.setItem(LAST_SELECTED_TEACHER_KEY, currentRecipient);
      } catch (_) {}
      return;
    }

    let nextTeacherId = "";

    try {
      const savedTeacherId = localStorage.getItem(LAST_SELECTED_TEACHER_KEY);
      if (savedTeacherId && teacherDirectory.some((teacher) => String(teacher.id) === String(savedTeacherId))) {
        nextTeacherId = String(savedTeacherId);
      }
    } catch (_) {}

    if (!nextTeacherId && facultyInbox.length) {
      const sortedInbox = [...facultyInbox].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latestMatchedTeacher = sortedInbox
        .map((msg) => {
          const senderEmail = (msg.sender_email || "").trim().toLowerCase();
          const senderName = (msg.sender_name || "").trim().toLowerCase();
          return teacherDirectory.find((teacher) => {
            const teacherEmail = (teacher.email || "").trim().toLowerCase();
            const teacherName = (teacher.name || "").trim().toLowerCase();
            return (teacherEmail && senderEmail === teacherEmail) || (teacherName && senderName === teacherName);
          });
        })
        .find(Boolean);
      if (latestMatchedTeacher?.id) nextTeacherId = String(latestMatchedTeacher.id);
    }

    if (!nextTeacherId && teacherDirectory[0]?.id) {
      nextTeacherId = String(teacherDirectory[0].id);
    }

    if (!nextTeacherId || nextTeacherId === currentRecipient) return;
    setFacultyMessageForm((prev) => ({ ...prev, recipient_id: nextTeacherId }));
    try {
      localStorage.setItem(LAST_SELECTED_TEACHER_KEY, nextTeacherId);
    } catch (_) {}
  }, [activePage, teacherDirectory, facultyInbox, facultyMessageForm.recipient_id]);

  useEffect(() => {
    if (!showTeacherMenu) return;
    const onMouseDown = (event) => {
      if (!teacherMenuRef.current) return;
      if (!teacherMenuRef.current.contains(event.target)) {
        setShowTeacherMenu(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showTeacherMenu]);

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
    if (selectedClassroomTab !== "stream" || !selectedClassroom?.id) {
      setShowAnnouncementModal(false);
    }
  }, [selectedClassroomTab, selectedClassroom?.id]);

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

  const handleTeacherSearch = async (e) => {
    const value = e.target.value;
    setTeacherSearch(value);
    await loadTeacherDirectory(value.trim());
  };

  const selectTeacherForMessage = (teacherId) => {
    setFacultyMessageForm((prev) => ({ ...prev, recipient_id: String(teacherId) }));
    try {
      localStorage.setItem(LAST_SELECTED_TEACHER_KEY, String(teacherId));
    } catch (_) {}
    setShowTeacherCompose(true);
    setShowTeacherProfilePanel(false);
    setShowTeacherMenu(false);
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
        subject: (facultyMessageForm.subject || "").trim() || "Faculty Chat",
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

  const facultyNotificationFeedItems = useMemo(() => {
    const announcementItems = (inboxMessages || []).map((msg) => ({
      id: `announce-${msg.id}`,
      actorName: msg.sender_name || "Admin",
      actionText: "sent an announcement",
      bodyText: msg.body || msg.subject || "",
      createdAt: msg.created_at,
      subject: msg.subject || "",
      kind: "announcement",
      roleTag: msg.recipient_role || "faculty",
    }));

    const teacherMessageItems = (facultyInbox || []).map((msg) => ({
      id: `teacher-${msg.id}`,
      actorName: msg.sender_name || "Teacher",
      actionText: "sent a teacher message",
      bodyText: msg.body || msg.subject || "",
      createdAt: msg.created_at,
      subject: msg.subject || "",
      kind: "teacher_message",
      senderEmail: msg.sender_email || "",
    }));

    return [...announcementItems, ...teacherMessageItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [inboxMessages, facultyInbox]);

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
    setQuizGradeImporting(true);
    setQuestionType("short_answer");
    setAllowStudentReplies(true);
    setAllowStudentEditAnswer(false);
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
    if (["assignment", "quiz_assignment"].includes(classworkCreateType) && !classworkDraft.due_at) {
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
      const fallbackDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const dueAtIso = classworkDraft.due_at ? new Date(classworkDraft.due_at).toISOString() : fallbackDue;
      formData.append("due_at", dueAtIso);
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
    setShowAnnouncementModal(false);
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
      const tabs = [
        { key: "general", label: "General" },
        { key: "professional", label: "Professional" },
        { key: "account", label: "Account" },
      ];
      const nameParts = (profile.name || "Faculty")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const profileInitials = nameParts.length >= 2
        ? `${nameParts[0][0] || ""}${nameParts[1][0] || ""}`.toUpperCase()
        : (nameParts[0] || "F").slice(0, 2).toUpperCase();

      return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Edit Profile</h3>
            <p className="mt-0.5 text-sm text-slate-500">Maintain your faculty information and professional details.</p>
          </div>

          {profileMessage && (
            <div className="mx-6 mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {profileMessage}
            </div>
          )}
          {profileError && (
            <div className="mx-6 mt-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {profileError}
            </div>
          )}

          {loadingProfile ? (
            <p className="px-6 py-6 text-sm text-slate-500">Loading profile...</p>
          ) : (
            <div className="p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {profile.profile_image_url ? (
                    <img
                      src={profile.profile_image_url}
                      alt="Faculty profile"
                      className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-slate-200 flex items-center justify-center text-2xl font-semibold text-slate-700 ring-1 ring-slate-200">
                      {profileInitials}
                    </div>
                  )}
                  <div className="min-w-[220px] flex-1">
                    <p className="text-[34px] leading-none font-semibold text-slate-900">{profile.name || "Faculty"}</p>
                    <p className="mt-1 text-sm text-slate-600">{profile.department || "Department pending"}</p>
                    <p className="text-sm text-slate-600">{profile.roll_number || "Employee number pending"}</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 border-b border-slate-200">
                <div className="flex flex-wrap gap-2 pb-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setProfileTab(tab.key)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        profileTab === tab.key
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {profileTab === "general" && (
                <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleProfileSave}>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Full Name</label>
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Email</label>
                    <input
                      name="email"
                      value={profile.email}
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-slate-500"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Department</label>
                    <input
                      name="department"
                      value={profile.department}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Employee Number</label>
                    <input
                      name="roll_number"
                      value={profile.roll_number}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-2 border-t border-slate-200 pt-3 mt-1">
                    <button
                      type="button"
                      onClick={loadProfile}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className={`rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 ${
                        savingProfile ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {profileTab === "professional" && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-800">Professional Snapshot</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Department and employee number are used for timetable allocation, classroom ownership, and faculty records.
                  </p>
                </div>
              )}

              {profileTab === "account" && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-800">Account</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Email is managed by authentication settings and remains read-only here.
                  </p>
                </div>
              )}
            </div>
          )}
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
                {!(selectedClassroomTab === "classwork" && showClassworkComposer) && (
                  <>
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
                  </>
                )}

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
                        <span>Open class meeting</span>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17 17 7" />
                            <path d="M9 7h8v8" />
                          </svg>
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(selectedClassroom.join_link || "")}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span>Copy class link</span>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <rect x="4" y="4" width="11" height="11" rx="2" />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={loadFacultyClassrooms}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span>Refresh classroom data</span>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 0 1 15.3-6.36L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-15.3 6.36L3 16" />
                            <path d="M3 21v-5h5" />
                          </svg>
                        </span>
                      </button>
                    </div>

                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-900">Stream</h4>
                    <button
                      type="button"
                      onClick={() => setShowAnnouncementModal(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100 px-5 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-200"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h3.75L19.81 7.94l-3.75-3.75L3 17.25V21z" />
                        <path d="m14.06 4.19 3.75 3.75" />
                      </svg>
                      <span>New announcement</span>
                    </button>
                  </div>

                  {selectedClassroomAnnouncements.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No announcements yet.
                    </div>
                  ) : (
                    <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                      {selectedClassroomAnnouncements.map((item) => (
                        <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                {(facultyName || "F").slice(0, 1).toUpperCase()}
                              </span>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                {selectedClassroom.faculty_name || facultyName || "Faculty"}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.body}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {showAnnouncementModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                        <div>
                          <h4 className="text-2xl font-semibold text-slate-900">Post</h4>
                          <p className="mt-1 text-sm text-slate-500">Share a quick update with your class stream.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAnnouncementModal(false)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                          aria-label="Close"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <form onSubmit={postClassroomAnnouncement} className="bg-slate-50 px-6 py-5">
                        <textarea
                          rows={7}
                          maxLength={1000}
                          value={classroomAnnouncementDraft}
                          onChange={(e) => setClassroomAnnouncementDraft(e.target.value)}
                          placeholder="Announce something to your class"
                          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          autoFocus
                        />

                        <div className="mt-3 flex items-center justify-between border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-1">
                            <button type="button" className="rounded-md px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">B</button>
                            <button type="button" className="rounded-md px-2 py-1.5 text-sm italic text-slate-600 hover:bg-slate-200">I</button>
                            <button type="button" className="rounded-md px-2 py-1.5 text-sm underline text-slate-600 hover:bg-slate-200">U</button>
                            <button type="button" className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-200">• List</button>
                          </div>
                          <span className="text-xs text-slate-500">{(classroomAnnouncementDraft || "").length}/1000</span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100" title="Attach file">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m21.44 11.05-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.48a3 3 0 0 1 4.24 4.24l-8.49 8.49a1 1 0 0 1-1.41-1.42l7.78-7.78" />
                              </svg>
                            </button>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100" title="Add link">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L10 5" />
                                <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L14 18" />
                              </svg>
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowAnnouncementModal(false)}
                              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!(classroomAnnouncementDraft || "").trim()}
                              className={`rounded-xl px-5 py-2 text-sm font-semibold ${
                                (classroomAnnouncementDraft || "").trim()
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "cursor-not-allowed bg-slate-300 text-slate-500"
                              }`}
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                </>
                )}

                {selectedClassroomTab === "classwork" && (
                  <div
                    className={`${
                      showClassworkComposer
                        ? "-mx-4 mt-0 overflow-hidden rounded-none border-x-0 border-y-0 bg-slate-50 md:-mx-6"
                        : "mt-4 rounded-2xl border border-slate-200 bg-white p-5"
                    }`}
                  >
                    {showClassworkComposer ? (
                      <form onSubmit={publishClassworkFromClassroom} className="min-h-[72vh] overflow-hidden bg-slate-50">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
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
                            <p className="text-[2rem] font-medium text-slate-900">
                              {classworkTypeLabelMap[classworkCreateType] || "Classwork"}
                            </p>
                          </div>
                          <button
                            type="submit"
                            disabled={
                              publishingClasswork ||
                              !classworkDraft.title.trim() ||
                              (["assignment", "quiz_assignment"].includes(classworkCreateType) && !classworkDraft.due_at)
                            }
                            className={`rounded-full px-6 py-2.5 text-base font-semibold ${
                              publishingClasswork ||
                              !classworkDraft.title.trim() ||
                              (["assignment", "quiz_assignment"].includes(classworkCreateType) && !classworkDraft.due_at)
                                ? "cursor-not-allowed bg-slate-300 text-slate-600"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {publishingClasswork ? "Publishing..." : classworkCreateType === "question" ? "Ask" : classworkCreateType === "material" ? "Post" : "Assign"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12">
                          {classworkCreateType === "quiz_assignment" ? (
                            <>
                              <div className="border-r border-slate-200 bg-slate-50 p-4 lg:col-span-9">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                  <input
                                    value={classworkDraft.title}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="Title *"
                                    className="w-full border-b border-red-300 bg-slate-50 px-3 py-2 text-2xl text-slate-900 outline-none placeholder:text-slate-500"
                                    required
                                  />
                                  <p className="mt-1 text-xs text-red-500">*Required</p>

                                  <textarea
                                    rows={7}
                                    value={classworkDraft.description}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Instructions (optional)"
                                    className="mt-4 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                                  />

                                  <div className="mt-2 flex items-center gap-2 border-b border-slate-200 pb-3 text-slate-600">
                                    <button type="button" className="rounded px-2 py-1 text-xl font-semibold hover:bg-slate-100">B</button>
                                    <button type="button" className="rounded px-2 py-1 text-xl italic hover:bg-slate-100">I</button>
                                    <button type="button" className="rounded px-2 py-1 text-xl underline hover:bg-slate-100">U</button>
                                    <button type="button" className="rounded px-2 py-1 text-sm hover:bg-slate-100">List</button>
                                    <button type="button" className="rounded px-2 py-1 text-sm hover:bg-slate-100">Strike</button>
                                  </div>

                                  <div className="mt-4 rounded-xl border border-slate-300 bg-white p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-3xl font-semibold leading-none text-slate-800 underline">Blank Quiz</p>
                                        <p className="mt-1 text-sm text-slate-600">Google Forms</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                                          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <path d="M14 2v6h6" />
                                            <path d="M9 13h6M9 17h6M9 9h1" />
                                          </svg>
                                        </span>
                                        <button type="button" className="text-slate-500 hover:text-slate-700">
                                          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6 6 18M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <p className="mt-4 text-sm text-slate-700">
                                    Classroom can import grades for assignments. Grade importing automatically limits each form to 1 response per user.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setQuizGradeImporting((prev) => !prev)}
                                    className="mt-3 inline-flex items-center gap-3"
                                  >
                                    <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${quizGradeImporting ? "bg-blue-600" : "bg-slate-300"}`}>
                                      <span className={`h-5 w-5 rounded-full bg-white transition ${quizGradeImporting ? "translate-x-5" : "translate-x-1"}`} />
                                    </span>
                                    <span className="text-sm font-medium text-slate-800">Grade importing</span>
                                  </button>
                                </div>

                                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <p className="text-xl font-semibold text-slate-900">Attach</p>
                                  <div className="mt-4 flex flex-wrap items-center gap-3">
                                    {["Drive", "YouTube", "Create", "Upload", "Link", "NotebookLM", "Gem"].map((item) => (
                                      <button
                                        key={item}
                                        type="button"
                                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-100"
                                        title={item}
                                      >
                                        +
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <aside className="space-y-4 bg-white p-4 lg:col-span-3">
                                <div>
                                  <p className="text-base font-medium text-slate-800">For</p>
                                  <div className="mt-2 truncate rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                                    {selectedClassroom.title}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Assign to</p>
                                  <div className="mt-2 rounded-full border border-slate-300 px-3 py-2.5 text-center text-sm text-blue-700">
                                    All students
                                  </div>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Points</p>
                                  <select
                                    value={classworkDraft.points}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, points: e.target.value }))}
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm"
                                  >
                                    <option value="100">100</option>
                                    <option value="50">50</option>
                                    <option value="25">25</option>
                                    <option value="10">10</option>
                                  </select>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Due</p>
                                  <input
                                    type="datetime-local"
                                    value={classworkDraft.due_at}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, due_at: e.target.value }))}
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm"
                                    required
                                  />
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Topic</p>
                                  <input
                                    value={classworkDraft.topic}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, topic: e.target.value }))}
                                    placeholder="No topic"
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm"
                                  />
                                </div>
                              </aside>
                            </>
                          ) : classworkCreateType === "question" ? (
                            <>
                              <div className="border-r border-slate-200 bg-slate-50 p-4 lg:col-span-9">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                                    <div className="lg:col-span-8">
                                      <label className="mb-1 block text-sm text-blue-700">Question*</label>
                                      <input
                                        value={classworkDraft.title}
                                        onChange={(e) => setClassworkDraft((prev) => ({ ...prev, title: e.target.value }))}
                                        className="w-full border-b border-blue-500 bg-slate-50 px-2 py-2 text-lg text-slate-900 outline-none"
                                        required
                                      />
                                      <p className="mt-1 text-xs text-red-500">*Required</p>
                                    </div>
                                    <div className="lg:col-span-4">
                                      <label className="mb-1 block text-sm text-slate-600">Question type</label>
                                      <select
                                        value={questionType}
                                        onChange={(e) => setQuestionType(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm"
                                      >
                                        <option value="short_answer">Short answer</option>
                                        <option value="multiple_choice">Multiple choice</option>
                                      </select>
                                    </div>
                                  </div>

                                  <textarea
                                    rows={7}
                                    value={classworkDraft.description}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Instructions (optional)"
                                    className="mt-4 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                                  />

                                  <div className="mt-2 flex items-center gap-2 border-b border-slate-200 pb-3 text-slate-600">
                                    <button type="button" className="rounded px-2 py-1 text-xl font-semibold hover:bg-slate-100">B</button>
                                    <button type="button" className="rounded px-2 py-1 text-xl italic hover:bg-slate-100">I</button>
                                    <button type="button" className="rounded px-2 py-1 text-xl underline hover:bg-slate-100">U</button>
                                    <button type="button" className="rounded px-2 py-1 text-sm hover:bg-slate-100">List</button>
                                    <button type="button" className="rounded px-2 py-1 text-sm hover:bg-slate-100">Strike</button>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <p className="text-xl font-semibold text-slate-900">Attach</p>
                                  <div className="mt-4 flex flex-wrap items-end gap-6">
                                    {["Drive", "YouTube", "Create", "Upload", "Link"].map((item) => (
                                      <button key={item} type="button" className="flex flex-col items-center gap-2 text-slate-700">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 bg-white text-lg">+</span>
                                        <span className="text-sm">{item}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <aside className="space-y-4 bg-white p-4 lg:col-span-3">
                                <div>
                                  <p className="text-base font-medium text-slate-800">For</p>
                                  <div className="mt-2 truncate rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                                    {selectedClassroom.title}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Assign to</p>
                                  <div className="mt-2 rounded-full border border-slate-300 px-3 py-2.5 text-center text-sm text-blue-700">
                                    All students
                                  </div>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Points</p>
                                  <select
                                    value={classworkDraft.points}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, points: e.target.value }))}
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm"
                                  >
                                    <option value="100">100</option>
                                    <option value="50">50</option>
                                    <option value="25">25</option>
                                    <option value="10">10</option>
                                  </select>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Due</p>
                                  <input
                                    type="datetime-local"
                                    value={classworkDraft.due_at}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, due_at: e.target.value }))}
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm"
                                  />
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Topic</p>
                                  <input
                                    value={classworkDraft.topic}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, topic: e.target.value }))}
                                    placeholder="No topic"
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm"
                                  />
                                </div>
                                <label className="flex items-center gap-3 pt-2 text-sm text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={allowStudentReplies}
                                    onChange={(e) => setAllowStudentReplies(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                  />
                                  Students can reply to each other
                                </label>
                                <label className="flex items-center gap-3 text-sm text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={allowStudentEditAnswer}
                                    onChange={(e) => setAllowStudentEditAnswer(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                  />
                                  Students can edit answer
                                </label>
                              </aside>
                            </>
                          ) : classworkCreateType === "material" ? (
                            <>
                              <div className="border-r border-slate-200 bg-slate-50 p-4 lg:col-span-9">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                  <input
                                    value={classworkDraft.title}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="Title *"
                                    className="w-full border-b border-red-300 bg-slate-50 px-3 py-2 text-2xl text-slate-900 outline-none placeholder:text-slate-500"
                                    required
                                  />
                                  <p className="mt-1 text-xs text-red-500">*Required</p>

                                  <textarea
                                    rows={7}
                                    value={classworkDraft.description}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Description (optional)"
                                    className="mt-4 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                                  />

                                  <div className="mt-2 flex items-center gap-2 border-b border-slate-200 pb-3 text-slate-600">
                                    <button type="button" className="rounded px-2 py-1 text-xl font-semibold hover:bg-slate-100">B</button>
                                    <button type="button" className="rounded px-2 py-1 text-xl italic hover:bg-slate-100">I</button>
                                    <button type="button" className="rounded px-2 py-1 text-xl underline hover:bg-slate-100">U</button>
                                    <button type="button" className="rounded px-2 py-1 text-sm hover:bg-slate-100">List</button>
                                    <button type="button" className="rounded px-2 py-1 text-sm hover:bg-slate-100">Strike</button>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <p className="text-xl font-semibold text-slate-900">Attach</p>
                                  <div className="mt-4 flex flex-wrap items-end gap-6">
                                    {["Drive", "YouTube", "Create", "Upload", "Link", "NotebookLM", "Gem"].map((item) => (
                                      <button key={item} type="button" className="flex flex-col items-center gap-2 text-slate-700">
                                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 bg-white text-lg">+</span>
                                        <span className="text-sm">{item}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <aside className="space-y-4 bg-white p-4 lg:col-span-3">
                                <div>
                                  <p className="text-base font-medium text-slate-800">For</p>
                                  <div className="mt-2 truncate rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                                    {selectedClassroom.title}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Assign to</p>
                                  <div className="mt-2 rounded-full border border-slate-300 px-3 py-2.5 text-center text-sm text-blue-700">
                                    All students
                                  </div>
                                </div>
                                <div>
                                  <p className="text-base font-medium text-slate-800">Topic</p>
                                  <input
                                    value={classworkDraft.topic}
                                    onChange={(e) => setClassworkDraft((prev) => ({ ...prev, topic: e.target.value }))}
                                    placeholder="No topic"
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm"
                                  />
                                </div>
                              </aside>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
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
      return <CalendarPage viewerRole="faculty" />;
    }

    if (activePage === "teachers") {
      const selectedTeacher = teacherDirectory.find(
        (teacher) => String(teacher.id) === String(facultyMessageForm.recipient_id)
      );
      const selectedTeacherName = selectedTeacher?.name || "No Active Conversation";
      const selectedTeacherInitial = (selectedTeacher?.name || "T").charAt(0).toUpperCase();
      const selectedTeacherMeta = selectedTeacher
        ? `${selectedTeacher.department || "Faculty"}${selectedTeacher.email ? ` • ${selectedTeacher.email}` : ""}`
        : "Select a teacher to begin conversation";
      const chatPreviewByTeacherId = (teacherDirectory || []).reduce((acc, teacher) => {
        const teacherEmail = (teacher.email || "").trim().toLowerCase();
        const teacherName = (teacher.name || "").trim().toLowerCase();
        const recent = (facultyInbox || [])
          .filter((msg) => {
            const senderEmail = (msg.sender_email || "").trim().toLowerCase();
            const senderName = (msg.sender_name || "").trim().toLowerCase();
            return (teacherEmail && senderEmail === teacherEmail) || (teacherName && senderName === teacherName);
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        acc[String(teacher.id)] = recent || null;
        return acc;
      }, {});
      const selectedTeacherConversation = selectedTeacher
        ? (facultyInbox || [])
            .filter((msg) => {
              const senderEmail = (msg.sender_email || "").trim().toLowerCase();
              const senderName = (msg.sender_name || "").trim().toLowerCase();
              const teacherEmail = (selectedTeacher.email || "").trim().toLowerCase();
              const teacherName = (selectedTeacher.name || "").trim().toLowerCase();
              return (teacherEmail && senderEmail === teacherEmail) || (teacherName && senderName === teacherName);
            })
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        : [];

      return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className={`grid grid-cols-1 xl:h-[calc(100vh-105px)] ${
              showTeacherProfilePanel && selectedTeacher
                ? "xl:grid-cols-[320px_minmax(0,1fr)_280px]"
                : "xl:grid-cols-[320px_minmax(0,1fr)]"
            }`}
          >
            <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0 xl:border-r">
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  {profile.profile_image_url ? (
                    <img src={profile.profile_image_url} alt={facultyName} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                      {(facultyName || "F").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-slate-900">{facultyName}</p>
                    <p className="truncate text-sm text-slate-500">Info account</p>
                  </div>
                </div>
                <input
                  value={teacherSearch}
                  onChange={handleTeacherSearch}
                  placeholder="Search by name/email/department"
                  className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <div className="mt-3 flex gap-2 rounded-full bg-slate-100 p-1 text-sm">
                  <span className="rounded-full bg-white px-4 py-1.5 font-medium text-blue-700 shadow-sm">All</span>
                  <span className="rounded-full px-4 py-1.5 text-slate-600">Personal</span>
                  <span className="rounded-full px-4 py-1.5 text-slate-600">Groups</span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {teacherDirectoryError ? (
                  <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{teacherDirectoryError}</div>
                ) : loadingTeacherDirectory ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading teachers...</p>
                ) : teacherDirectory.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No other signed-up teachers found.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {teacherDirectory.map((teacher) => {
                      const isSelected = String(facultyMessageForm.recipient_id) === String(teacher.id);
                      const preview = chatPreviewByTeacherId[String(teacher.id)];
                      const previewTime = preview?.created_at
                        ? new Date(preview.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "";
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => selectTeacherForMessage(teacher.id)}
                          className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                            isSelected ? "bg-slate-100 shadow-[inset_3px_0_0_0_#2563eb]" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {teacher.profile_image_url ? (
                              <img src={teacher.profile_image_url} alt={teacher.name} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                                {(teacher.name || "T").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[15px] font-semibold text-slate-900">{teacher.name}</p>
                                <p className="text-[11px] text-slate-400">{previewTime}</p>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{preview?.body || "Start conversation"}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-[#f2f4f8]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => selectedTeacher && setShowTeacherAvatarPreview(true)}
                    disabled={!selectedTeacher}
                    className={`${selectedTeacher ? "cursor-pointer" : "cursor-default"} rounded-full`}
                    aria-label="Open teacher avatar preview"
                  >
                    {selectedTeacher ? (
                      selectedTeacher.profile_image_url ? (
                        <img src={selectedTeacher.profile_image_url} alt={selectedTeacher.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-transparent transition hover:ring-violet-200" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700 ring-2 ring-transparent transition hover:ring-violet-200">
                          {selectedTeacherInitial}
                        </div>
                      )
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600">--</div>
                    )}
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => selectedTeacher && setShowTeacherProfilePanel(true)}
                      className={`truncate text-left text-[42px] leading-10 font-semibold tracking-tight ${
                        selectedTeacher ? "cursor-pointer text-slate-900 hover:text-blue-700" : "cursor-default text-slate-900"
                      }`}
                    >
                      {selectedTeacherName}
                    </button>
                    <p className="truncate text-sm text-slate-500">{selectedTeacherMeta}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadFacultyPeerInbox}
                    aria-label="Refresh messages"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="2" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </button>
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => selectedTeacher && setShowTeacherProfilePanel((prev) => !prev)}
                      disabled={!selectedTeacher}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Teacher info"
                    >
                      i
                    </button>
                    {selectedTeacher && (
                      <div className="pointer-events-none absolute right-0 top-11 z-20 w-72 translate-y-1 rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-0 shadow-xl transition duration-150 group-hover:translate-y-0 group-hover:opacity-100">
                        <div className="flex items-center gap-3">
                          {selectedTeacher.profile_image_url ? (
                            <img
                              src={selectedTeacher.profile_image_url}
                              alt={selectedTeacher.name}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">
                              {selectedTeacherInitial}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{selectedTeacher.name}</p>
                            <p className="truncate text-xs text-slate-500">{selectedTeacher.department || "Faculty"}</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                          <p>
                            <span className="font-semibold text-slate-800">Email:</span> {selectedTeacher.email || "-"}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Employee ID:</span> {selectedTeacher.roll_number || "-"}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Status:</span> Available for faculty communication
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">+</button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#eceff5] px-7 py-6">
                {loadingFacultyInbox ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Loading teacher messages...</p>
                ) : !selectedTeacher ? (
                  <div className="flex h-full items-start justify-center pt-12">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-7 text-center text-sm text-slate-600">
                      Select a teacher from the left list to open the chat.
                    </div>
                  </div>
                ) : selectedTeacherConversation.length === 0 ? (
                  <div className="mx-auto w-full max-w-4xl space-y-4 pt-10">
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                      <p className="text-base font-semibold text-slate-900">No messages from {selectedTeacher.name} yet.</p>
                      <p className="mt-1 text-sm text-slate-500">Start with one of these professional conversation openers.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFacultyMessageForm((prev) => ({
                            ...prev,
                            body: "Hello, I wanted to coordinate on today's teaching schedule.",
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Coordinate schedule
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFacultyMessageForm((prev) => ({
                            ...prev,
                            body: "Could we discuss the class plan for this week?",
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Discuss class plan
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFacultyMessageForm((prev) => ({
                            ...prev,
                            body: "Please share any updates for the students in your department.",
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Ask for updates
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFacultyMessageForm((prev) => ({
                            ...prev,
                            body: "Can we align on assessment timelines for this semester?",
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Align assessment timelines
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTeacherConversation.map((msg, idx) => (
                      <article key={msg.id} className="space-y-2">
                        <p className="px-2 text-xs text-slate-400">
                          {idx === 0 ? new Date(msg.created_at).toLocaleString() : ""}
                        </p>
                        <div className="flex items-start gap-2.5">
                        {selectedTeacher.profile_image_url ? (
                          <img src={selectedTeacher.profile_image_url} alt={selectedTeacher.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                            {selectedTeacherInitial}
                          </div>
                        )}
                        <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{msg.body}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div ref={composeTeacherMessageRef} className="border-t border-slate-200 bg-white px-4 py-4">
                <form
                  onSubmit={(e) => {
                    if (!selectedTeacher) return;
                    sendFacultyMessage(e);
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    name="body"
                    rows={1}
                    value={facultyMessageForm.body}
                    onChange={handleFacultyMessageInput}
                    placeholder={selectedTeacher ? "Type Your Message" : "Select a teacher first"}
                    className="max-h-24 min-h-[46px] flex-1 resize-none rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                    required
                    disabled={!selectedTeacher}
                  />
                  <button
                    type="button"
                    aria-label="Voice message"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                      <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Zm5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.92V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.08A7 7 0 0 1 5 11a1 1 0 0 1 2 0 5 5 0 1 0 10 0Z" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedTeacher}
                    aria-label="Send message"
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      selectedTeacher ? "bg-violet-500 text-white hover:bg-violet-600" : "cursor-not-allowed bg-slate-200 text-slate-500"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                      <path d="M3.4 20.6a1 1 0 0 1-1.34-1.2l2.1-6.14a1 1 0 0 1 .7-.64L14.6 10 4.86 7.38a1 1 0 0 1-.7-.64l-2.1-6.14A1 1 0 0 1 3.4-.6l18 11a1 1 0 0 1 0 1.7l-18 9.5Z" />
                    </svg>
                  </button>
                  <div ref={teacherMenuRef} className="relative">
                    <button
                      type="button"
                      aria-label="More actions"
                      onClick={() => setShowTeacherMenu((prev) => !prev)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                      </svg>
                    </button>
                    {showTeacherMenu && (
                      <div className="absolute bottom-12 right-0 z-30 w-56 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            setFacultyMessageForm((prev) => ({
                              ...prev,
                              body: "[Document] Please review the attached file.",
                            }));
                            setShowTeacherMenu(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl border border-emerald-400 px-3 py-2 text-left text-sm font-medium text-slate-100 hover:bg-slate-800"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-violet-400" aria-hidden="true">
                            <path d="M7 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5a2 2 0 0 0-.59-1.41l-4.5-4.5A2 2 0 0 0 12.5 2H7Zm5 1.5V8a1 1 0 0 0 1 1h4.5L12 3.5Z" />
                          </svg>
                          Document
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFacultyMessageForm((prev) => ({
                              ...prev,
                              body: "[Photos & videos] Sharing media from class activities.",
                            }));
                            setShowTeacherMenu(false);
                          }}
                          className="mt-1.5 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-100 hover:bg-slate-800"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-sky-400" aria-hidden="true">
                            <path d="M5 3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5Zm14 12H8.83l2.58-3.22a1 1 0 0 1 1.54-.04L15 14.5l1.6-2a1 1 0 0 1 1.55.03L19 13.8V15ZM9 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3 18a2 2 0 0 0 2 2h13a1 1 0 1 1 0 2H5a4 4 0 0 1-4-4v-1a1 1 0 1 1 2 0v1Z" />
                          </svg>
                          Photos & videos
                        </button>
                      </div>
                    )}
                  </div>
                </form>
                {facultyMessageFeedback && <p className="mt-2 text-xs text-emerald-600">{facultyMessageFeedback}</p>}
                {facultyMessageError && <p className="mt-2 text-xs text-red-600">{facultyMessageError}</p>}
              </div>
            </section>

            {showTeacherProfilePanel && selectedTeacher && (
              <aside className="hidden min-h-0 flex-col border-l border-slate-200 bg-white xl:flex">
                <div className="relative px-5 py-6 text-center">
                  <button
                    type="button"
                    onClick={() => setShowTeacherProfilePanel(false)}
                    aria-label="Close profile panel"
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 hover:bg-slate-200"
                  >
                    ×
                  </button>
                  {selectedTeacher.profile_image_url ? (
                    <img
                      src={selectedTeacher.profile_image_url}
                      alt={selectedTeacher.name}
                      className="mx-auto h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-2xl font-semibold text-rose-700">
                      {selectedTeacherInitial}
                    </div>
                  )}
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{selectedTeacher.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedTeacher.department || "Faculty"}</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button type="button" className="rounded-full bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700">
                      Video
                    </button>
                    <button type="button" className="rounded-full bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700">
                      Call
                    </button>
                    <button type="button" className="rounded-full bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700">
                      More
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Shared Media</p>
                    <button type="button" className="text-xs text-indigo-600">View All</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="h-20 rounded-xl bg-gradient-to-br from-cyan-200 to-blue-300" />
                    <div className="h-20 rounded-xl bg-gradient-to-br from-pink-200 to-violet-300" />
                    <div className="h-20 rounded-xl bg-gradient-to-br from-emerald-200 to-teal-300" />
                    <div className="h-20 rounded-xl bg-gradient-to-br from-amber-200 to-orange-300" />
                  </div>
                </div>

                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Shared Files</p>
                    <button type="button" className="text-xs text-indigo-600">View All</button>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">How To Be An Expert</div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">Dont Worry, Be Happy</div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">Where's My Money?</div>
                  </div>
                </div>
              </aside>
            )}
          </div>

          {showTeacherAvatarPreview && selectedTeacher && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
              onClick={() => setShowTeacherAvatarPreview(false)}
            >
              <div
                className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowTeacherAvatarPreview(false)}
                  aria-label="Close avatar preview"
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  ×
                </button>
                <div className="pt-4 text-center">
                  {selectedTeacher.profile_image_url ? (
                    <img
                      src={selectedTeacher.profile_image_url}
                      alt={selectedTeacher.name}
                      className="mx-auto h-64 w-64 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl bg-rose-100 text-6xl font-semibold text-rose-700">
                      {selectedTeacherInitial}
                    </div>
                  )}
                  <p className="mt-4 text-2xl font-semibold text-slate-900">{selectedTeacher.name}</p>
                  <p className="text-sm text-slate-500">{selectedTeacher.department || "Faculty"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activePage === "messages") {
      return <Queries />;
    }

    if (activePage === "notifications") {
      return (
        <div className="w-full space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">Notifications</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Real-time updates from admin announcements and teacher messages.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  Total: {facultyNotificationFeedItems.length}
                </span>
                <button
                  type="button"
                  onClick={refreshFacultyNotifications}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loadingInboxMessages || loadingFacultyInbox ? (
              <p className="px-5 py-6 text-sm text-slate-500">Loading notifications...</p>
            ) : inboxError ? (
              <div className="m-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {inboxError}
              </div>
            ) : facultyNotificationFeedItems.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">No notifications yet.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {facultyNotificationFeedItems.map((item, index) => (
                  <article key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/70">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                        notificationAvatarPalette[index % notificationAvatarPalette.length]
                      } text-sm font-semibold text-white`}
                    >
                      {notificationInitialsFrom(item.actorName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-cyan-600">{item.actorName}</p>
                          <p className="truncate text-sm text-slate-400">
                            {item.subject ? `${item.subject} · ` : ""}
                            {item.actionText}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium italic text-slate-400">
                          {notificationTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            item.kind === "teacher_message"
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border border-blue-200 bg-blue-50 text-blue-700"
                          }`}
                        >
                          {item.kind === "teacher_message" ? "teacher message" : item.roleTag}
                        </span>
                        {item.senderEmail && (
                          <span className="truncate text-xs text-slate-400">{item.senderEmail}</span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-base leading-6 text-slate-700">{item.bodyText}</p>
                    </div>
                  </article>
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


