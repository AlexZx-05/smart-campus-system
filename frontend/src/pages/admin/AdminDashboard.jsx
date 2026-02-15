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
  const [generatedTimetable, setGeneratedTimetable] = useState([]);
  const [generatingTimetable, setGeneratingTimetable] = useState(false);
  const [timetableMessage, setTimetableMessage] = useState("");
  const [rooms, setRooms] = useState([
    { name: "A-101", capacity: 40 },
    { name: "A-102", capacity: 60 },
    { name: "B-201", capacity: 80 },
    { name: "B-202", capacity: 100 },
    { name: "C-301", capacity: 120 },
    { name: "Lab-1", capacity: 45 },
  ]);
  const [newRoom, setNewRoom] = useState({ name: "", capacity: "" });
  const [roomAssignments, setRoomAssignments] = useState({});
  const [adminUserId, setAdminUserId] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", description: "" });
  const [eventMessage, setEventMessage] = useState("");
  const [eventError, setEventError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "preferences", label: "Faculty Preferences" },
    { key: "timetable", label: "Generate Timetable" },
    { key: "rooms", label: "Rooms Management" },
    { key: "users", label: "User Management" },
    { key: "reports", label: "Reports" },
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
    reports: "Reports",
    notifications: "Notifications",
    conflicts: "Conflict Resolution",
    calendar: "Calendar Control",
  };

  const sectionMessage = pageTitleMap[activePage] || "Admin Dashboard";

  const loadPreferences = async () => {
    setLoadingPreferences(true);
    setPreferencesError("");
    try {
      const data = await PreferenceService.getAllFacultyPreferences();
      setPreferences(data);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load faculty preferences.";
      setPreferencesError(msg);
    } finally {
      setLoadingPreferences(false);
    }
  };

  useEffect(() => {
    if (activePage === "preferences") {
      loadPreferences();
    }
    if (activePage === "calendar") {
      loadCalendarEvents();
    }
  }, [activePage]);

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

  const updateStatus = async (id, status) => {
    try {
      await PreferenceService.updateFacultyPreferenceStatus(id, status);
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
      const res = await PreferenceService.generateTimetableFromPreferences();
      setGeneratedTimetable(res.timetable || []);
      const initialAssignments = {};
      (res.timetable || []).forEach((slot, idx) => {
        initialAssignments[`${slot.source_preference_id}-${idx}`] = slot.room;
      });
      setRoomAssignments(initialAssignments);
      setTimetableMessage(res.message || "Timetable generated.");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to generate timetable.";
      setPreferencesError(msg);
    } finally {
      setGeneratingTimetable(false);
    }
  };

  const handleRoomInput = (e) => {
    const { name, value } = e.target;
    setNewRoom((prev) => ({ ...prev, [name]: value }));
  };

  const addRoom = () => {
    const name = newRoom.name.trim();
    const capacity = parseInt(newRoom.capacity, 10);
    if (!name || !capacity || capacity <= 0) return;
    if (rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) return;
    setRooms((prev) => [...prev, { name, capacity }]);
    setNewRoom({ name: "", capacity: "" });
  };

  const removeRoom = (roomName) => {
    setRooms((prev) => prev.filter((r) => r.name !== roomName));
  };

  const assignRoom = (slotKey, roomName) => {
    setRoomAssignments((prev) => ({ ...prev, [slotKey]: roomName }));
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

  const renderContent = () => {
    if (activePage === "preferences") {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800">Faculty Preferences</h3>
          <p className="text-sm text-slate-500 mt-2">
            Review slot requests submitted by faculty before timetable generation.
          </p>

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
                      <td className="px-4 py-3 text-sm text-slate-700">{pref.subject || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{pref.student_count || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {pref.day} | {pref.start_time} - {pref.end_time}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{pref.semester}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{pref.details || "-"}</td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3">
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
                        </div>
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
              Use approved faculty preferences to generate a timetable draft for the college.
            </p>
            <button
              onClick={handleGenerateTimetable}
              disabled={generatingTimetable}
              className={`mt-4 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ${
                generatingTimetable ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {generatingTimetable ? "Generating..." : "Generate From Approved Preferences"}
            </button>
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
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Day</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Subject</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Faculty</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Time</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Section</th>
                      <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedTimetable.map((slot, idx) => (
                      <tr key={`${slot.source_preference_id}-${idx}`} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-sm text-slate-700">{slot.day}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{slot.subject}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{slot.faculty_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {slot.start_time} - {slot.end_time}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{slot.section}</td>
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

    if (activePage === "rooms") {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800">Rooms Management</h3>
            <p className="text-sm text-slate-500 mt-2">
              Manage room capacity and assign rooms to generated timetable slots based on class size.
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
              {rooms.map((room) => (
                <div key={room.name} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-sm text-slate-700">
                    {room.name} ({room.capacity})
                  </span>
                  <button
                    onClick={() => removeRoom(room.name)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
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
