"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ email: "", firstName: "", lastName: "", company: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const role = (session?.user as { role?: string } | undefined)?.role;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || role !== "admin") {
      router.push("/");
      return;
    }
    fetchUsers();
  }, [session, status, role, router, fetchUsers]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create user");
        setFormLoading(false);
        return;
      }

      setFormData({ email: "", firstName: "", lastName: "", company: "" });
      setShowAddForm(false);
      fetchUsers();
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setFormLoading(false);
    }
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="page-wrapper">
        <Navbar activeLink="admin" />
        <div className="content-area">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (role !== "admin") {
    return null;
  }

  return (
    <div className="page-wrapper">
      <Navbar activeLink="admin" />
      <div className="content-area">
        <div className="admin-header">
          <h1>User Management</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "Add User"}
          </button>
        </div>

        {showAddForm && (
          <div className="admin-form-panel">
            <h3>Invite New User</h3>
            {formError && <div className="error-box">{formError}</div>}
            <form onSubmit={handleAddUser}>
              <div className="admin-form-grid">
                <div>
                  <label>Email *</label>
                  <input
                    className="input-field"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label>Company</label>
                  <input
                    className="input-field"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label>First Name</label>
                  <input
                    className="input-field"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label>Last Name</label>
                  <input
                    className="input-field"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={formLoading}>
                {formLoading ? "Sending Invite..." : "Send Invite"}
              </button>
            </form>
          </div>
        )}

        <div className="table-scroll-wrapper">
          <table className="tab-data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.firstName || "-"}</td>
                  <td>{user.lastName || "-"}</td>
                  <td>{user.company || "-"}</td>
                  <td>
                    <span className={`status-badge ${user.role === "admin" ? "warning" : "neutral"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? "success" : "error"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    {user.email !== session?.user?.email && (
                      <button
                        className={`btn btn-sm ${user.isActive ? "btn-danger" : "btn-primary"}`}
                        onClick={() => toggleUserActive(user.id, user.isActive)}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="color-muted" style={{ textAlign: "center", padding: "20px" }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
