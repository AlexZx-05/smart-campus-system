import { useEffect, useRef, useState } from "react";
import StudentService from "../../services/StudentService";

function Profile({ onProfileUpdated }) {
  const defaultAvatar =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
        <rect width='160' height='160' fill='#E2E8F0'/>
        <circle cx='80' cy='64' r='28' fill='#94A3B8'/>
        <rect x='36' y='102' width='88' height='40' rx='20' fill='#94A3B8'/>
      </svg>`
    );

  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    department: "",
    roll_number: "",
    year: "",
    section: "",
    profile_image_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await StudentService.getProfile();
      setProfile({
        name: data.name || "",
        email: data.email || "",
        department: data.department || "",
        roll_number: data.roll_number || "",
        year: data.year || "",
        section: data.section || "",
        profile_image_url: data.profile_image_url || "",
      });
      onProfileUpdated?.(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [message]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setMessage("");
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await StudentService.updateProfile({
        name: profile.name,
        department: profile.department,
        roll_number: profile.roll_number,
        year: profile.year || null,
        section: profile.section,
      });
      setMessage(res.message || "Profile updated successfully.");
      const updated = res.profile || profile;
      setProfile((prev) => ({
        ...prev,
        ...updated,
        profile_image_url: updated.profile_image_url || prev.profile_image_url,
      }));
      onProfileUpdated?.(updated);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    setError("");
    try {
      const res = await StudentService.uploadProfilePhoto(file);
      setMessage(res.message || "Profile photo uploaded successfully.");
      const updated = res.profile || {};
      setProfile((prev) => ({
        ...prev,
        profile_image_url: updated.profile_image_url || prev.profile_image_url,
      }));
      onProfileUpdated?.(updated);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload profile photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_-28px_rgba(15,23,42,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.14),transparent_58%)]" />
      <div className="relative p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Student Workspace
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Student Profile</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Keep your details current for accurate timetable, assignments, and campus communication.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Profile status</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">Editable</p>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading profile...</p>
        ) : (
          <form className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-5" onSubmit={handleSave}>
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-200">Student profile</p>
              <div className="mt-5 flex items-center gap-4">
                <img
                  src={profile.profile_image_url || defaultAvatar}
                  alt="Student profile"
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/35"
                />
                <div>
                  <p className="text-base font-semibold text-white">{profile.name || "Student"}</p>
                  <p className="mt-1 text-xs text-slate-200">{profile.department || "Department pending"}</p>
                  <p className="mt-1 text-xs text-slate-200">{profile.roll_number || "Roll number pending"}</p>
                </div>
              </div>
              <label className="mt-5 inline-flex cursor-pointer items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20">
                {uploading ? "Uploading..." : "Upload Photo"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
              <p className="mt-3 text-xs leading-relaxed text-slate-200">
                Use a clear headshot (JPG/PNG/WEBP). Your photo appears in student portal and profile menu.
              </p>
            </div>

            <div className="xl:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
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
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Roll Number</label>
                <input
                  name="roll_number"
                  value={profile.roll_number}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Year</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  name="year"
                  value={profile.year}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Section</label>
                <input
                  name="section"
                  value={profile.section}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">Use accurate details to avoid timetable and assignment mismatches.</p>
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                    saving ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Profile;
