import { useEffect, useRef, useState } from "react";
import StudentService from "../../services/StudentService";

function Profile({ onProfileUpdated }) {
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
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [showPhotoPopover, setShowPhotoPopover] = useState(false);
  const avatarMenuRef = useRef(null);

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

  useEffect(() => {
    if (!showPhotoPopover) return undefined;
    const handleOutsideClick = (event) => {
      if (!avatarMenuRef.current?.contains(event.target)) {
        setShowPhotoPopover(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showPhotoPopover]);

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
      setShowPhotoPopover(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload profile photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleProfileImageClick = async () => {
    if (!profile.profile_image_url) {
      fileInputRef.current?.click();
      return;
    }
    setShowPhotoPopover((prev) => !prev);
  };

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true);
    setMessage("");
    setError("");
    try {
      const res = await StudentService.removeProfilePhoto();
      setMessage(res.message || "Profile photo removed successfully.");
      const updated = res.profile || {};
      setProfile((prev) => ({
        ...prev,
        profile_image_url: updated.profile_image_url || "",
      }));
      onProfileUpdated?.(updated);
      setShowPhotoPopover(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove profile photo.");
    } finally {
      setRemovingPhoto(false);
    }
  };

  const tabs = [
    { key: "general", label: "General" },
    { key: "academic", label: "Academic" },
    { key: "account", label: "Account" },
  ];

  const nameParts = (profile.name || "Student")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const profileInitials = nameParts.length >= 2
    ? `${nameParts[0][0] || ""}${nameParts[1][0] || ""}`.toUpperCase()
    : (nameParts[0] || "S").slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Edit Profile</h3>
        <p className="mt-0.5 text-sm text-slate-500">Maintain your student information and account details.</p>
      </div>

      {message && (
        <div className="mx-6 mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mx-6 mt-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-6 py-6 text-sm text-slate-500">Loading profile...</p>
      ) : (
        <div className="p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative" ref={avatarMenuRef}>
                <button
                  type="button"
                  onClick={handleProfileImageClick}
                  disabled={uploading || removingPhoto}
                  className={`relative h-20 w-20 overflow-hidden rounded-2xl ring-1 ring-slate-200 ${
                    uploading || removingPhoto ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                  }`}
                  title="Profile photo options"
                >
                  {profile.profile_image_url ? (
                    <img
                      src={profile.profile_image_url}
                      alt="Student profile"
                      className="h-20 w-20 object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-slate-200 flex items-center justify-center text-2xl font-semibold text-slate-700">
                      {profileInitials}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white ring-2 ring-white">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </span>
                </button>

                {showPhotoPopover && (
                  <div className="absolute left-0 top-[92px] z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_-20px_rgba(15,23,42,0.5)]">
                    <div className="absolute -top-2 left-6 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white" />
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Profile Photo</p>
                    </div>
                    <div className="p-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || removingPhoto}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {uploading ? "Uploading..." : "Upload New Photo"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={!profile.profile_image_url || removingPhoto || uploading}
                      className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-40"
                    >
                      {removingPhoto ? "Removing..." : "Remove Photo"}
                    </button>
                    </div>
                    <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => setShowPhotoPopover(false)}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-[220px] flex-1">
                <p className="text-[34px] leading-none font-semibold text-slate-900">{profile.name || "Student"}</p>
                <p className="mt-1 text-sm text-slate-600">{profile.department || "Department pending"}</p>
                <p className="text-sm text-slate-600">
                  {profile.roll_number || "Roll number pending"} | {profile.year ? `Year ${profile.year}` : "Year -"}
                  {profile.section ? ` | Section ${profile.section}` : ""}
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </div>

          <div className="mt-4 border-b border-slate-200">
            <div className="flex flex-wrap gap-2 pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    activeTab === tab.key
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "general" && (
            <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleSave}>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">First Name</label>
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
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
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Roll Number</label>
                <input
                  name="roll_number"
                  value={profile.roll_number}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Year</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  name="year"
                  value={profile.year}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Section</label>
                <input
                  name="section"
                  value={profile.section}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div className="md:col-span-2 xl:col-span-3 flex items-center justify-end gap-2 border-t border-slate-200 pt-3 mt-1">
                <button
                  type="button"
                  onClick={loadProfile}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 ${
                    saving ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "academic" && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-800">Academic Snapshot</p>
              <p className="mt-2 text-sm text-slate-600">
                Department, year, section, and roll number are available in the General tab for editing.
              </p>
            </div>
          )}

          {activeTab === "account" && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-800">Account</p>
              <p className="mt-2 text-sm text-slate-600">
                Email is managed by admin authentication settings and is shown as read-only.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;
