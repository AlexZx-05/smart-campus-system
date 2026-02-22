import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PreferenceService from "../../services/PreferenceService";
import DashboardService from "../../services/DashboardService";
import FacultyService from "../../services/FacultyService";
import EventService from "../../services/EventService";

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

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "my-timetable", label: "My Timetable" },
    { key: "all-classes", label: "All Classes" },
    { key: "preferences", label: "Submit Preference" },
    { key: "assignments", label: "Assignments" },
    { key: "calendar", label: "Calendar" },
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
    messages: "Messages",
    teachers: "Teachers",
    conflicts: "Conflict Requests",
    profile: "Profile",
  };

  const teachers = [
    { name: "Dr. Ananya Mehta", dept: "Computer Science", subjects: "Data Structures, OS", email: "ananya.mehta@campus.edu" },
    { name: "Prof. Raghav Iyer", dept: "Electronics", subjects: "Digital Systems, VLSI", email: "raghav.iyer@campus.edu" },
    { name: "Dr. Neha Kapoor", dept: "Mathematics", subjects: "Linear Algebra, Statistics", email: "neha.kapoor@campus.edu" },
    { name: "Prof. Arjun Sen", dept: "Mechanical", subjects: "Thermodynamics, Design", email: "arjun.sen@campus.edu" },
  ];

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
    setEventError("");
    try {
      const data = await PreferenceService.getInboxMessages();
      setInboxMessages(data || []);
    } catch (err) {
      setEventError(err.response?.data?.message || "Failed to load messages.");
    } finally {
      setLoadingInboxMessages(false);
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
    if (activePage === "messages") loadInboxMessages();
    if (activePage === "my-timetable" || activePage === "all-classes") loadFacultyTimetable();
  }, [activePage]);

  useEffect(() => {
    if (activePage === "my-timetable" || activePage === "all-classes") {
      loadFacultyTimetable();
    }
  }, [semesterFilter]);

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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
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
        </div>
      );
    }

    if (activePage === "teachers") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Teachers Directory</h3>
            <p className="text-sm text-slate-500 mt-2">View faculty cards and quickly connect with colleagues.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((teacher) => (
              <div key={teacher.email} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-base font-semibold text-slate-800">{teacher.name}</h4>
                <p className="text-sm text-slate-500 mt-1">{teacher.dept}</p>
                <p className="text-sm text-slate-600 mt-3">
                  <span className="font-medium text-slate-700">Subjects:</span> {teacher.subjects}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium text-slate-700">Email:</span> {teacher.email}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activePage === "messages") {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Admin Messages</h3>
              <p className="text-sm text-slate-500 mt-1">
                Announcements sent to faculty and campus-wide updates.
              </p>
            </div>
            <button
              type="button"
              onClick={loadInboxMessages}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loadingInboxMessages ? (
            <p className="text-sm text-slate-500 mt-4">Loading messages...</p>
          ) : inboxMessages.length === 0 ? (
            <p className="text-sm text-slate-500 mt-4">No messages from admin yet.</p>
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
