import { useState } from "react";
import { useLibrary } from "../../context/LibraryContext";
import { Link } from "react-router-dom";

export default function Members() {
  const {
    user,
    members = [],
    addNotification,
    showAlert,
    showConfirm,
    addMember,
    updateMember,
    deleteMember,
  } = useLibrary();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // 🚀 LOADER STATE
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    avatar: "",
    status: "Active",
  });

  const isAdmin = user?.role === "admin";
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-20 animate-fade-in bg-bg-white rounded-2xl shadow-sm border border-border-color">
        <i className="fas fa-lock text-5xl text-danger mb-4 opacity-80"></i>
        <h2 className="text-3xl font-bold text-text-dark">Access Denied</h2>
        <p className="text-text-muted mt-2 mb-8">
          Only administrators have permission to view the Members Directory.
        </p>
        <Link
          to="/"
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#5b54e0] transition-colors inline-block"
        >
          Go Back to Dashboard
        </Link>
      </div>
    );
  }

  const handleOpenModal = (member = null) => {
    setShowPassword(false);
    if (member && member.id) {
      setEditingId(member.id);
      setFormData({
        name: member.name || "",
        username: member.username || "",
        email: member.email || "",
        phone: member.phone || "",
        password: "",
        avatar: member.avatar || "",
        status: member.status || "Active",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        avatar: "",
        status: "Active",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert(
          "Image size should be less than 2MB",
          "File Too Large",
          "error",
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () =>
        setFormData((prev) => ({ ...prev, avatar: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value.replace(/\s/g, "").toLowerCase();
    if (/^[a-z0-9_-]*$/.test(val))
      setFormData((prev) => ({ ...prev, username: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.username ||
      !formData.email ||
      !formData.phone ||
      (!editingId && !formData.password)
    ) {
      showAlert(
        "Please fill all required fields!",
        "Missing Fields",
        "warning",
      );
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      username: formData.username.replace(/\s/g, "").toLowerCase(),
      email: formData.email.replace(/\s/g, "").toLowerCase(),
    };

    if (editingId && !payload.password) delete payload.password;
    if (payload.password) {
      payload.password = payload.password.replace(/\s/g, "");
      if (!/^[a-zA-Z0-9@]+$/.test(payload.password)) {
        showAlert(
          "Password can only contain letters, numbers, and the '@' symbol. No spaces allowed.",
          "Invalid Password",
          "warning",
        );
        return;
      }
    }

    setIsSubmitting(true); // 🚀 LOADER START
    let success;
    if (editingId) {
      success = await updateMember(editingId, payload);
      if (success) showAlert("Updated successfully!", "Success", "success");
    } else {
      success = await addMember(payload);
      if (success)
        showAlert("Member added successfully!", "Success", "success");
    }
    setIsSubmitting(false); // 🚀 LOADER STOP
    if (success) handleCloseModal();
  };

  const handleDelete = (id, email, name) => {
    showConfirm(
      "Delete this member AND their account?",
      async () => {
        const success = await deleteMember(id);
        if (success)
          addNotification(
            "Member Deleted",
            `Account for ${name || email} has been permanently removed.`,
            "danger",
            "fa-trash",
            "admin",
          );
      },
      "Delete Member",
    );
  };

  const filteredMembers = members.filter(
    (m) =>
      (m.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="animate-fade-in relative w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">
            Members Directory
          </h1>
          <p className="text-text-muted mt-1">
            Manage library members and their access accounts.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#5b54e0] shadow-md transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
        >
          <i className="fa-solid fa-user-plus"></i> Add New Member
        </button>
      </div>

      <div className="bg-bg-white p-5 rounded-2xl shadow-sm border border-border-color mb-8">
        <div className="relative w-full max-w-md">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"></i>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden w-full">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-bg-light/50 text-primary border-b border-border-color text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold whitespace-nowrap">Member</th>
                <th className="p-4 font-semibold whitespace-nowrap">Contact</th>
                <th className="p-4 font-semibold whitespace-nowrap">
                  Joined Date
                </th>
                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                <th className="p-4 font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-text-muted font-medium"
                  >
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border-color hover:bg-black/5 transition-colors"
                  >
                    <td className="p-4 flex items-center gap-4 whitespace-nowrap">
                      <div className="w-12 h-12 rounded-full border border-border-color bg-bg-light overflow-hidden flex-shrink-0 shadow-inner">
                        <img
                          src={
                            member.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`
                          }
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-medium text-text-dark text-base">
                        {member.name}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-dark">
                        {member.email}
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        {member.phone}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-text-dark font-medium whitespace-nowrap">
                      {formatDate(member.joinDate)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${member.status === "Active" ? "bg-success/20 text-success" : member.status === "Inactive" ? "bg-warning/20 text-warning" : "bg-danger/20 text-danger"}`}
                      >
                        {member.status || "Active"}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(member)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                          title="Edit User"
                        >
                          <i className="fa-solid fa-edit"></i>
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(member.id, member.email, member.name)
                          }
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-danger/10 hover:text-danger transition-all cursor-pointer"
                          title="Delete User"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-bg-white w-full max-w-xl p-8 rounded-2xl shadow-xl border border-border-color max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-text-dark mb-6">
              {editingId ? "Edit Member Account" : "Create Member Account"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4 bg-bg-light p-3 rounded-lg border border-border-color">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/30 overflow-hidden bg-bg-white flex items-center justify-center flex-shrink-0 shadow-inner">
                    {formData.avatar ? (
                      <img
                        src={formData.avatar}
                        alt="Upload Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <i className="fa-solid fa-user text-text-muted text-2xl"></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    value={formData.username}
                    onChange={handleUsernameChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        email: e.target.value.replace(/\s/g, "").toLowerCase(),
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    maxLength="10"
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        phone: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Account Status
                  </label>
                  <select
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark cursor-pointer"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, status: e.target.value }))
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Deactivate">Deactivate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Password {editingId && "(Optional)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Text, number and @ only"
                      className="w-full p-3 pr-10 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          password: e.target.value.replace(/\s/g, ""),
                        }))
                      }
                      required={!editingId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      <i
                        className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                      ></i>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border-color">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg font-medium text-text-muted hover:bg-bg-light border border-border-color transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                {/* 🚀 BUTTON LOADER UPDATE */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-lg font-medium bg-primary text-white shadow-md transition-all flex items-center justify-center gap-2 ${isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-[#5b54e0] cursor-pointer"}`}
                >
                  {isSubmitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : null}{" "}
                  {isSubmitting
                    ? "Processing..."
                    : editingId
                      ? "Update Account"
                      : "Save & Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
