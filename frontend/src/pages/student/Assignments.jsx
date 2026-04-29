import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

const classroomThemePool = [
  "from-slate-700 via-slate-600 to-slate-500",
  "from-orange-500 via-rose-500 to-fuchsia-500",
  "from-cyan-600 via-sky-600 to-indigo-600",
  "from-emerald-600 via-teal-600 to-cyan-600",
];

const classroomDetailThemes = [
  {
    hero: "from-slate-800 via-slate-700 to-slate-500",
    tabActiveText: "text-blue-700",
    tabUnderline: "bg-blue-600",
    pill: "border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-300 hover:bg-blue-100",
    iconWrap: "bg-blue-100 text-blue-700",
    subtleBtn: "text-blue-700 hover:bg-blue-50 hover:text-blue-800",
  },
  {
    hero: "from-orange-600 via-rose-500 to-fuchsia-500",
    tabActiveText: "text-rose-700",
    tabUnderline: "bg-rose-600",
    pill: "border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300 hover:bg-rose-100",
    iconWrap: "bg-rose-100 text-rose-700",
    subtleBtn: "text-rose-700 hover:bg-rose-50 hover:text-rose-800",
  },
  {
    hero: "from-cyan-700 via-sky-600 to-indigo-600",
    tabActiveText: "text-sky-700",
    tabUnderline: "bg-sky-600",
    pill: "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-300 hover:bg-sky-100",
    iconWrap: "bg-sky-100 text-sky-700",
    subtleBtn: "text-sky-700 hover:bg-sky-50 hover:text-sky-800",
  },
  {
    hero: "from-emerald-700 via-teal-600 to-cyan-600",
    tabActiveText: "text-emerald-700",
    tabUnderline: "bg-emerald-600",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100",
    iconWrap: "bg-emerald-100 text-emerald-700",
    subtleBtn: "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
  },
];

const availableClassroomDummy = [
  {
    id: "dummy-invite-1",
    title: "Operating Systems 2024",
    subject: "Operating Systems",
    faculty_name: "Dr. Dubacharla Gyaneshwar",
    department: "CSE",
    year: "3",
    section: "22 Batch",
    notification_message: "Join now to receive lab sheets and weekly tasks.",
    join_link: "#",
    isDummy: true,
  },
  {
    id: "dummy-invite-2",
    title: "LA 204: Psychology",
    subject: "Liberal Arts",
    faculty_name: "Shraddha Pradip Namjoshi",
    department: "IIITR",
    year: "2",
    section: "A",
    notification_message: "Classroom active for attendance, notes, and submissions.",
    join_link: "#",
    isDummy: true,
  },
];

const joinedClassroomDummy = [
  {
    id: "dummy-joined-1",
    title: "DBMS - Section B",
    subject: "Database Systems",
    faculty_name: "Prof. A. Sharma",
    department: "CSE",
    year: "3",
    section: "B",
    join_link: "#",
    isDummy: true,
  },
  {
    id: "dummy-joined-2",
    title: "CN Practice Classroom",
    subject: "Computer Networks",
    faculty_name: "Prof. N. Iyer",
    department: "CSE",
    year: "3",
    section: "B",
    join_link: "#",
    isDummy: true,
  },
];

function Assignments({ pendingJoinClassroomId = null, onHandledJoinLink }) {
  const [assignments, setAssignments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [classroomInvites, setClassroomInvites] = useState([]);
  const [joinedClassrooms, setJoinedClassrooms] = useState([]);
  const [joiningClassroomId, setJoiningClassroomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    submission_text: "",
    resource_links: "",
    attachment: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeClassroomTab, setActiveClassroomTab] = useState("invites");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [classroomDetailTab, setClassroomDetailTab] = useState("stream");
  const [selectedClassroomThemeIndex, setSelectedClassroomThemeIndex] = useState(0);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

  const loadAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const [assignmentRes, reminderRes, classroomInvRes, joinedClassRes] = await Promise.allSettled([
        PreferenceService.getStudentAssignments(),
        PreferenceService.getStudentAssignmentReminders(),
        PreferenceService.getStudentClassroomInvites(),
        PreferenceService.getStudentJoinedClassrooms(),
      ]);

      const assignmentRows = assignmentRes.status === "fulfilled" ? (assignmentRes.value || []) : [];
      const reminderRows = reminderRes.status === "fulfilled" ? (reminderRes.value || []) : [];
      const classroomInviteRows = classroomInvRes.status === "fulfilled" ? (classroomInvRes.value || []) : [];
      const joinedClassroomRows = joinedClassRes.status === "fulfilled" ? (joinedClassRes.value || []) : [];

      if (assignmentRes.status === "rejected") {
        setError(assignmentRes.reason?.response?.data?.message || "Failed to load assignments.");
      }

      setAssignments(assignmentRows);
      setReminders(reminderRows);
      setClassroomInvites(classroomInviteRows);
      setJoinedClassrooms(joinedClassroomRows);
      setSelectedAssignmentId((prev) => prev || assignmentRows[0]?.id || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  const joinClassroom = async (classroomId) => {
    setError("");
    setMessage("");
    setJoiningClassroomId(classroomId);
    try {
      const res = await PreferenceService.joinStudentClassroom(classroomId);
      setMessage(res.message || "Joined classroom successfully.");
      await loadAssignments();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join classroom.");
    } finally {
      setJoiningClassroomId(null);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    if (!pendingJoinClassroomId) return;

    const pendingId = String(pendingJoinClassroomId);
    const alreadyJoined = joinedClassrooms.some((room) => String(room.id) === pendingId);
    if (alreadyJoined) {
      setActiveClassroomTab("joined");
      setMessage("You already joined this classroom.");
      onHandledJoinLink?.();
      return;
    }

    const inviteMatch = classroomInvites.find((room) => String(room.id) === pendingId);
    if (inviteMatch && joiningClassroomId === null) {
      setActiveClassroomTab("invites");
      joinClassroom(inviteMatch.id).finally(() => {
        onHandledJoinLink?.();
      });
      return;
    }

    if (classroomInvites.length > 0 || joinedClassrooms.length > 0) {
      setError("This classroom link is not available for your branch/section or not active.");
      onHandledJoinLink?.();
    }
  }, [pendingJoinClassroomId, classroomInvites, joinedClassrooms, joiningClassroomId]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [message]);

  const selectedAssignment = useMemo(
    () => assignments.find((item) => item.id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );
  const inviteCards = useMemo(
    () => (classroomInvites.length > 0 ? classroomInvites : availableClassroomDummy),
    [classroomInvites]
  );
  const joinedCards = useMemo(
    () => (joinedClassrooms.length > 0 ? joinedClassrooms : joinedClassroomDummy),
    [joinedClassrooms]
  );

  useEffect(() => {
    if (!selectedAssignment) return;
    const links = (selectedAssignment.my_submission?.resource_links || []).join("\n");
    setSubmissionForm({
      submission_text: selectedAssignment.my_submission?.submission_text || "",
      resource_links: links,
      attachment: null,
    });
  }, [selectedAssignmentId, selectedAssignment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("submission_text", submissionForm.submission_text || "");
      formData.append("resource_links", submissionForm.resource_links || "");
      if (submissionForm.attachment) {
        formData.append("attachment", submissionForm.attachment);
      }
      const res = await PreferenceService.submitStudentAssignment(selectedAssignment.id, formData);
      setMessage(res.message || "Assignment submitted.");
      await loadAssignments();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name = "") => {
    const cleaned = String(name).trim();
    if (!cleaned) return "TC";
    return cleaned
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  };

  const openClassroomDetail = (room, themeIndex = 0) => {
    setSelectedClassroom(room);
    setSelectedClassroomThemeIndex(themeIndex % classroomDetailThemes.length);
    setClassroomDetailTab("stream");
    setOpenMenuId(null);
    setShowAnnouncementModal(false);
    setAnnouncementText("");
  };

  const detailRoom = selectedClassroom || null;

  if (detailRoom) {
    const activeDetailTheme =
      classroomDetailThemes[selectedClassroomThemeIndex % classroomDetailThemes.length] || classroomDetailThemes[0];
    const streamItems = [
      {
        id: "stream-1",
        title: `${detailRoom.faculty_name || "Teacher"} posted a new assignment: ${detailRoom.title || detailRoom.subject || "Class update"}`,
        date: "22 Apr 2024",
      },
      {
        id: "stream-2",
        title: `${detailRoom.faculty_name || "Teacher"} posted a new assignment: ${detailRoom.subject || "Classwork"}`,
        date: "19 Mar 2024",
      },
      {
        id: "stream-3",
        title: `${detailRoom.faculty_name || "Teacher"} posted a new assignment: Project details`,
        date: "22 Feb 2024",
      },
    ];

    return (
      <div className="overflow-visible rounded-2xl shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)]">
        <div className="sticky top-0 z-30 rounded-t-2xl border border-slate-200 border-b-slate-200/90 bg-white/95 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedClassroom(null)}
              className="py-4 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Back
            </button>
            {[
              { key: "stream", label: "Stream" },
              { key: "classwork", label: "Classwork" },
              { key: "people", label: "People" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setClassroomDetailTab(tab.key)}
                className={`relative py-4 text-[1.02rem] font-medium transition ${
                  classroomDetailTab === tab.key ? activeDetailTheme.tabActiveText : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
                {classroomDetailTab === tab.key && (
                  <span className={`absolute inset-x-0 -bottom-px h-[3px] rounded-full ${activeDetailTheme.tabUnderline}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[680px] rounded-b-2xl border border-t-0 border-slate-200 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
          <div className="mx-auto max-w-[1140px] space-y-5 px-4 pb-8 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
          {classroomDetailTab === "stream" && (
            <>
              <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r ${activeDetailTheme.hero} p-8 text-white shadow-[0_30px_70px_-36px_rgba(15,23,42,0.62)] sm:p-10`}>
                <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff 0, transparent 35%), radial-gradient(circle at 80% 40%, #fff 0, transparent 28%)" }} />
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <p className="text-3xl font-semibold tracking-tight sm:text-[3.3rem]">{detailRoom.title || "Classroom"}</p>
                  <p className="mt-2 text-xl font-medium text-white/90 sm:text-[2.1rem]">{detailRoom.section || "Batch"}</p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.42)]">
                  <p className="text-2xl font-semibold text-slate-900">Upcoming</p>
                  <p className="mt-3 text-base leading-7 text-slate-600">Woohoo, no work due soon.</p>
                  <button type="button" className={`mt-4 inline-flex rounded-lg px-2 py-1 text-base font-semibold transition ${activeDetailTheme.subtleBtn}`}>View all</button>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAnnouncementModal(true)}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm transition ${activeDetailTheme.pill}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" /></svg>
                    New announcement
                  </button>

                  {streamItems.map((item) => (
                    <article key={item.id} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_36px_-24px_rgba(15,23,42,0.45)]">
                      <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${activeDetailTheme.iconWrap}`}>
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="4" width="14" height="16" rx="2.5" />
                          <path d="M9 4.5h6M9 9.5h6M9 13.5h4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[1.12rem] font-semibold text-slate-800">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.date} (Edited {item.date})</p>
                      </div>
                      <button type="button" className="rounded-lg px-2 text-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">&#8942;</button>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}

          {classroomDetailTab === "classwork" && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
              <h4 className="text-2xl font-semibold text-slate-900">Classwork</h4>
              {(assignments || []).slice(0, 6).map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-lg font-semibold text-slate-800">{assignment.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{assignment.subject}</p>
                </div>
              ))}
              {assignments.length === 0 && <p className="text-sm text-slate-500">No classwork available yet.</p>}
            </div>
          )}

          {classroomDetailTab === "people" && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)]">
              <h4 className="text-2xl font-semibold text-slate-900">People</h4>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Teacher</p>
                <p className="mt-2 text-lg font-semibold text-slate-800">{detailRoom.faculty_name || "Faculty Name"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Class</p>
                <p className="mt-2 text-sm text-slate-700">
                  {[detailRoom.department, detailRoom.year ? `Year ${detailRoom.year}` : null, detailRoom.section].filter(Boolean).join(" | ") || "Academic classroom"}
                </p>
              </div>
            </div>
          )}
          </div>
        </div>

        {showAnnouncementModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[820px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_40px_90px_-30px_rgba(15,23,42,0.7)]">
              <div className="border-b border-slate-300 px-6 py-4">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-800">Post</h3>
              </div>

              <div className="px-6 py-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-inner">
                  <textarea
                    rows={5}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Announce something to your class"
                    className="w-full resize-none border-0 border-b border-blue-500/80 bg-transparent p-0 text-base text-slate-800 placeholder:text-blue-700/90 focus:outline-none"
                  />
                  <div className="mt-4 flex items-center gap-2 border-b border-blue-500/80 pb-2 text-slate-600">
                    <button type="button" className="rounded-md px-2 py-1 text-xl font-semibold hover:bg-slate-100">B</button>
                    <button type="button" className="rounded-md px-2 py-1 text-xl italic font-semibold hover:bg-slate-100">I</button>
                    <button type="button" className="rounded-md px-2 py-1 text-xl underline hover:bg-slate-100">U</button>
                    <button type="button" className="rounded-md px-2 py-1 hover:bg-slate-100" aria-label="Bulleted list">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="5" cy="7" r="1.2" fill="currentColor" />
                        <circle cx="5" cy="12" r="1.2" fill="currentColor" />
                        <circle cx="5" cy="17" r="1.2" fill="currentColor" />
                        <path d="M9 7h10M9 12h10M9 17h10" />
                      </svg>
                    </button>
                    <button type="button" className="rounded-md px-2 py-1 hover:bg-slate-100" aria-label="Strikethrough">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 12h16" />
                        <path d="M8 7c.7-1.4 2-2 4-2 2.7 0 4 1.2 4 3 0 1.2-.9 2-2.6 2.5l-2.8.9C8.8 12.1 8 13 8 14.5 8 16.4 9.5 18 12 18c1.9 0 3.3-.6 4.1-1.9" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-400 text-slate-600 transition hover:bg-slate-200"
                      aria-label="Attach from Drive"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 18h10l4-6-5-8H8L3 12l4 6Z" />
                        <path d="M8 4l4 8m4-8-4 8M3 12h18" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-600 text-slate-600 transition hover:bg-slate-200"
                      aria-label="Attach YouTube"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <rect x="3.5" y="6.5" width="17" height="11" rx="3.2" className="text-slate-600" />
                        <path d="M10 9.6v4.8l4.2-2.4L10 9.6Z" className="text-white" fill="white" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-400 text-slate-600 transition hover:bg-slate-200"
                      aria-label="Upload file"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 16V4" />
                        <path d="m7 9 5-5 5 5" />
                        <path d="M5 19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-400 text-slate-600 transition hover:bg-slate-200"
                      aria-label="Add link"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
                        <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAnnouncementModal(false);
                        setAnnouncementText("");
                      }}
                      className="rounded-lg px-3 py-2 text-lg font-medium text-blue-700 transition hover:bg-blue-50 hover:text-blue-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!announcementText.trim()}
                      className={`rounded-full px-7 py-2 text-lg font-semibold transition ${
                        announcementText.trim()
                          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                          : "bg-slate-300 text-slate-500"
                      }`}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-3xl font-semibold tracking-tight text-slate-900">Classrooms</h3>
            <p className="mt-1 text-sm text-slate-500">Teacher-created classrooms that you can join and use for assignments.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAssignments}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveClassroomTab("invites")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeClassroomTab === "invites"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            Available to Join ({classroomInvites.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveClassroomTab("joined")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeClassroomTab === "joined"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            Joined ({joinedClassrooms.length})
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {(activeClassroomTab === "invites" ? inviteCards : joinedCards).map((room, index) => {
            const cardTheme = classroomThemePool[index % classroomThemePool.length];
            const isInviteTab = activeClassroomTab === "invites";
            return (
              <article
                key={`${activeClassroomTab}-${room.id}`}
                onClick={() => openClassroomDetail(room, index)}
                className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`relative h-24 bg-gradient-to-r ${cardTheme} px-3.5 py-2.5 text-white`}
                  style={
                    room.cover_image_url
                      ? {
                          backgroundImage: `linear-gradient(120deg, rgba(2,6,23,0.56), rgba(15,23,42,0.25)), url('${room.cover_image_url}')`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <p className="truncate text-[1.35rem] font-semibold leading-tight">{room.title || room.subject}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-white/90">{room.subject}</p>
                  <span className="mt-1.5 inline-flex rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold">
                    {isInviteTab ? "Available to Join" : "Joined"}
                  </span>
                </div>

                <div className="space-y-2.5 p-3">
                  <div className="pointer-events-none absolute right-4 top-[56px]">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-md">
                      {room.faculty_photo_url ? (
                        <img
                          src={room.faculty_photo_url}
                          alt={room.faculty_name || "Teacher"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-500 text-lg font-semibold text-white">
                          {getInitials(room.faculty_name)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[1.05rem] font-semibold text-slate-800 leading-tight">{room.faculty_name || "Faculty Name"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[room.department, room.year ? `Year ${room.year}` : null, room.section].filter(Boolean).join(" | ") ||
                        "Academic classroom"}
                    </p>
                  </div>

                  {isInviteTab && (
                    <p className="line-clamp-2 min-h-8 text-xs text-slate-500">
                      {room.notification_message || "Teacher invited you to this classroom."}
                    </p>
                  )}

                  <div className="pt-1.5">
                    <div
                      className="relative flex items-center justify-end gap-2"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openClassroomDetail(room, index);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Open classroom"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="4" width="14" height="16" rx="2.5" />
                          <path d="M9 4.5h6M9 9.5h6M9 13.5h4" />
                          <path d="m14.5 16 1.5 1.5 2.5-3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openClassroomDetail(room, index);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Open classroom folder"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === `${activeClassroomTab}-${room.id}` ? null : `${activeClassroomTab}-${room.id}`));
                        }}
                        className="group relative rounded-lg border border-slate-300 px-2 py-1 text-base leading-none text-slate-600 hover:bg-slate-50"
                        aria-label="Open classroom options"
                      >
                        &#8942;
                        <span className="pointer-events-none absolute -top-9 right-0 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow transition group-hover:opacity-100">
                          More options
                        </span>
                      </button>
                    </div>

                    {openMenuId === `${activeClassroomTab}-${room.id}` && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-12 right-0 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                      >
                        {isInviteTab && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!room.isDummy) joinClassroom(room.id);
                              setOpenMenuId(null);
                            }}
                            disabled={joiningClassroomId === room.id || room.isDummy}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                              joiningClassroomId === room.id || room.isDummy
                                ? "cursor-not-allowed text-slate-400"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {room.isDummy ? "Join (dummy)" : joiningClassroomId === room.id ? "Joining..." : "Join Classroom"}
                          </button>
                        )}
                        <a
                          href={room.join_link || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          Open Link
                        </a>
                        <a
                          href={room.join_link || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          View Work
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">Reminder: Upcoming deadlines</p>
          <p className="text-sm text-amber-700 mt-1">
            {reminders.length} assignment(s) are scheduled for reminder today.
          </p>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm text-slate-500">Loading assignments...</p>
        </div>
      ) : assignments.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-3">
            {assignments.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                onClick={() => setSelectedAssignmentId(assignment.id)}
                className={`w-full text-left rounded-xl border p-4 shadow-sm transition ${
                  assignment.id === selectedAssignmentId
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-800">{assignment.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{assignment.subject}</p>
                  </div>
                  <span className="text-xs rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700">
                    {assignment.my_submission ? assignment.my_submission.status : "pending"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Due: {new Date(assignment.due_at).toLocaleString()} | Faculty: {assignment.created_by_name}
                </p>
                {assignment.description && (
                  <p className="text-sm text-slate-700 mt-2 line-clamp-2">{assignment.description}</p>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            {!selectedAssignment ? (
              <p className="text-sm text-slate-500">Select an assignment to view details.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{selectedAssignment.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{selectedAssignment.subject}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Due on {new Date(selectedAssignment.due_at).toLocaleString()}
                  </p>
                </div>

                {selectedAssignment.description && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAssignment.description}</p>
                )}

                {selectedAssignment.resource_links?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Reference Links</p>
                    <div className="mt-2 space-y-1">
                      {selectedAssignment.resource_links.map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-blue-600 hover:underline break-all"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAssignment.attachment_url && (
                  <a
                    href={selectedAssignment.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm text-blue-700 hover:underline"
                  >
                    Open teacher attachment: {selectedAssignment.attachment_name || "file"}
                  </a>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-200">
                  <textarea
                    rows={4}
                    value={submissionForm.submission_text}
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({ ...prev, submission_text: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    placeholder="Write your answer/work summary..."
                  />
                  <textarea
                    rows={3}
                    value={submissionForm.resource_links}
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({ ...prev, resource_links: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    placeholder="Submission links (one per line)"
                  />
                  <input
                    type="file"
                    onChange={(e) =>
                      setSubmissionForm((prev) => ({ ...prev, attachment: e.target.files?.[0] || null }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  {selectedAssignment.my_submission?.attachment_url && (
                    <a
                      href={selectedAssignment.my_submission.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-slate-600 hover:underline"
                    >
                      Last uploaded file: {selectedAssignment.my_submission.attachment_name}
                    </a>
                  )}
                  {selectedAssignment.my_submission?.teacher_feedback && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Teacher Feedback</p>
                      <p className="text-sm text-slate-700 mt-1">
                        {selectedAssignment.my_submission.teacher_feedback}
                      </p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full rounded-lg bg-blue-600 text-white px-4 py-2.5 hover:bg-blue-700 ${
                      submitting ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {submitting ? "Submitting..." : "Submit / Update Work"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Assignments;


