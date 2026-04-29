import { useEffect, useMemo, useState } from "react";
import PreferenceService from "../../services/PreferenceService";

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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Classrooms</h3>
            <p className="text-sm text-slate-500 mt-1">Teacher-created classrooms that you can join and use for assignments.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAssignments}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveClassroomTab("invites")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              activeClassroomTab === "invites" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Available to Join ({classroomInvites.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveClassroomTab("joined")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              activeClassroomTab === "joined" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Joined ({joinedClassrooms.length})
          </button>
        </div>

        {activeClassroomTab === "invites" ? (
          classroomInvites.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No new classrooms available to join right now.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {classroomInvites.map((room) => (
                <div key={room.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div
                    className="h-28 px-4 py-3 text-white relative"
                    style={{
                      backgroundImage: room.cover_image_url
                        ? `linear-gradient(120deg, rgba(244,63,94,0.76), rgba(249,115,22,0.78)), url('${room.cover_image_url}')`
                        : "linear-gradient(120deg, #fb7185, #f97316)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <span className="inline-flex rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">Active</span>
                    <p className="mt-3 text-lg font-semibold truncate">{room.title}</p>
                    <p className="text-xs mt-1 opacity-95 truncate">
                      {room.department || "-"} | Year {room.year || "-"} | {room.section || "-"}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-base font-semibold text-slate-800">{room.subject}</p>
                    <p className="text-sm text-slate-500 mt-1">{room.faculty_name}</p>
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                      {room.notification_message || "Teacher invited you to this classroom."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => joinClassroom(room.id)}
                        disabled={joiningClassroomId === room.id}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                          joiningClassroomId === room.id ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {joiningClassroomId === room.id ? "Joining..." : "Join Classroom"}
                      </button>
                      <a
                        href={room.join_link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Open Link
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : joinedClassrooms.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">You have not joined any classroom yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {joinedClassrooms.map((room) => (
              <div key={room.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                <p className="text-base font-semibold text-slate-800 truncate">{room.title || room.subject}</p>
                <p className="text-sm text-slate-600 mt-1">{room.subject}</p>
                <p className="text-sm text-slate-500 mt-1">{room.faculty_name}</p>
                <a
                  href={room.join_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white"
                >
                  Open Classroom
                </a>
              </div>
            ))}
          </div>
        )}
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
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-slate-800">Assignments</h3>
          <p className="text-sm text-slate-500 mt-2">
            No assignments found for your enrolled courses. Enroll in a course above first.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default Assignments;
