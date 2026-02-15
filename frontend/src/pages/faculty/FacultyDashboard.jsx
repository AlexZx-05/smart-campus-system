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
    day: "Monday",
    subject: "",
    student_count: "",
    start_time: "",
    end_time: "",
    semester: "Odd 2026",
    details: "",
  });
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [preferenceError, setPreferenceError] = useState("");
  const [submittingPreference, setSubmittingPreference] = useState(false);
  const [myPreferences, setMyPreferences] = useState([]);
  const [loadingMyPreferences, setLoadingMyPreferences] = useState(false);

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
  }, [activePage]);

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

  const handlePreferenceSubmit = async (e) => {
    e.preventDefault();
    setSubmittingPreference(true);
    setPreferenceMessage("");
    setPreferenceError("");
    try {
      await PreferenceService.submitFacultyPreference(preferenceForm);
      setPreferenceMessage("Preference submitted successfully. Admin will review it.");
      setPreferenceForm((prev) => ({
        ...prev,
        subject: "",
        student_count: "",
        start_time: "",
        end_time: "",
        details: "",
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
    if (activePage === "profile") {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800">Faculty Profile</h3>
          <p className="text-sm text-slate-500 mt-2">Update your details used for timetable and administration.</p>

          {profileMessage && <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{profileMessage}</div>}
          {profileError && <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</div>}

          {loadingProfile ? (
            <p className="text-sm text-slate-500 mt-4">Loading profile...</p>
          ) : (
            <form className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleProfileSave}>
              <div className="md:col-span-2 flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                <img src={profile.profile_image_url || defaultAvatar} alt="Faculty profile" className="h-16 w-16 rounded-full object-cover border border-slate-300" />
                <div>
                  <label className="inline-flex items-center px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer">
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input name="name" value={profile.name} onChange={handleProfileChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input name="email" value={profile.email} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-100 text-slate-500" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                <input name="department" value={profile.department} onChange={handleProfileChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Employee Number</label>
                <input name="roll_number" value={profile.roll_number} onChange={handleProfileChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={savingProfile} className={`px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 ${savingProfile ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}
        </div>
      );
    }

    if (activePage === "preferences") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Submit Preference</h3>
            <p className="text-sm text-slate-500 mt-1">Share your preferred teaching slots before timetable generation.</p>

            {preferenceMessage && <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{preferenceMessage}</div>}
            {preferenceError && <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{preferenceError}</div>}

            <form className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handlePreferenceSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Day</label>
                <select name="day" value={preferenceForm.day} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                <input type="time" name="start_time" value={preferenceForm.start_time} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                <input type="time" name="end_time" value={preferenceForm.end_time} onChange={handlePreferenceChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" required />
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

