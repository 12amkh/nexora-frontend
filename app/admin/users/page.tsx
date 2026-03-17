"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/components/ToastProvider";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  agent_count: number;
  schedule_count: number;
  paddle_customer_id: string | null;
  paddle_subscription_status: string | null;
}

export default function AdminUsers() {
  const router = useRouter();
  const { pushToast, updateToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [togglingUserState, setTogglingUserState] = useState(false);
  const [pendingStatusUser, setPendingStatusUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        await loadUsers();
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { status?: number } }).response?.status === "number" &&
          (error as { response?: { status?: number } }).response?.status === 403
        ) {
          router.push("/dashboard");
        }
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const loadUsers = async () => {
    const res = await api.get("/admin/users?limit=100");
    setUsers(res.data.data);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      await loadUsers();
      return;
    }

    try {
      const res = await api.get(`/admin/users/search?q=${query}`);
      setUsers(res.data.data);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleChangePlan = async (userId: number, newPlan: string) => {
    setChangingPlan(true);
    const userName = selectedUser?.name || "User";
    const toastId = pushToast({
      title: `Updating ${userName}`,
      description: `Changing the account plan to ${newPlan}.`,
      tone: "loading",
      dismissible: false,
    });
    try {
      await api.post(`/admin/users/${userId}/change-plan?plan=${newPlan}`);
      await loadUsers();
      setSelectedUser(null);
      updateToast(toastId, {
        title: "Plan updated",
        description: `${userName} is now on the ${newPlan} plan.`,
        tone: "success",
        dismissible: true,
      });
    } catch (error) {
      console.error("Failed to change plan:", error);
      updateToast(toastId, {
        title: "Couldn't update plan",
        description: "Please try changing the plan again.",
        tone: "error",
        dismissible: true,
      });
    } finally {
      setChangingPlan(false);
    }
  };

  const handleDeactivate = async (userId: number) => {
    const targetUser = pendingStatusUser ?? selectedUser;
    const isActive = targetUser?.is_active ?? true;
    const userName = targetUser?.name || "User";
    const toastId = pushToast({
      title: `${isActive ? "Deactivating" : "Reactivating"} ${userName}`,
      description: isActive ? "Removing access for this user account." : "Restoring access for this user account.",
      tone: "loading",
      dismissible: false,
    });
    setTogglingUserState(true);
    try {
      await api.post(`/admin/users/${userId}/${isActive ? "deactivate" : "reactivate"}`);
      await loadUsers();
      setSelectedUser(null);
      setPendingStatusUser(null);
      updateToast(toastId, {
        title: isActive ? "User deactivated" : "User reactivated",
        description: `${userName} was updated successfully.`,
        tone: "success",
        dismissible: true,
      });
    } catch (error) {
      console.error("Failed to deactivate user:", error);
      updateToast(toastId, {
        title: isActive ? "Couldn't deactivate user" : "Couldn't reactivate user",
        description: "Please try again.",
        tone: "error",
        dismissible: true,
      });
    } finally {
      setTogglingUserState(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <div className="flex-1 pl-[220px]">
          <div className="p-8 text-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <ConfirmDialog
        open={!!pendingStatusUser}
        title={
          pendingStatusUser
            ? `${pendingStatusUser.is_active ? "Deactivate" : "Reactivate"} ${pendingStatusUser.name}?`
            : "Update user status?"
        }
        description={
          pendingStatusUser?.is_active
            ? "This will prevent the user from accessing their account until they are reactivated."
            : "This will restore the user's access to their account."
        }
        warning="This only changes account access. Existing agents and schedules remain in place."
        confirmLabel={pendingStatusUser?.is_active ? "Deactivate user" : "Reactivate user"}
        cancelLabel="Cancel"
        destructive={pendingStatusUser?.is_active ?? false}
        loading={togglingUserState}
        onConfirm={() => {
          if (pendingStatusUser) void handleDeactivate(pendingStatusUser.id);
        }}
        onCancel={() => {
          if (!togglingUserState) setPendingStatusUser(null);
        }}
      />
      <Sidebar />
      <div className="flex-1 pl-[220px]">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-4">Manage Users</h1>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 bg-bg-2 border border-border rounded-lg text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Users List */}
            <div className="lg:col-span-2">
              <div className="bg-bg-2 border border-border rounded-lg overflow-hidden">
                <div className="divide-y divide-border">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-4 cursor-pointer transition ${
                        selectedUser?.id === user.id
                          ? "bg-accent/20 border-l-2 border-accent"
                          : "hover:bg-bg-3"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-text">{user.name}</p>
                          <p className="text-text-2 text-sm">{user.email}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.plan === "free"
                              ? "bg-text-3/20 text-text-2"
                              : user.plan === "starter"
                              ? "bg-accent/20 text-accent"
                              : user.plan === "pro"
                              ? "bg-green/20 text-green"
                              : "bg-accent/20 text-accent"
                          }`}
                        >
                          {user.plan.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-text-3 text-xs space-x-4">
                        <span>{user.agent_count} agents</span>
                        <span>{user.schedule_count} schedules</span>
                        <span>{user.is_active ? "✓ Active" : "✗ Inactive"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Detail Panel */}
            {selectedUser && (
              <div className="bg-bg-2 border border-border rounded-lg p-6 h-fit sticky top-8">
                <h2 className="text-lg font-semibold text-text mb-4">User Details</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-text-2 text-sm">Name</p>
                    <p className="text-text font-semibold">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-text-2 text-sm">Email</p>
                    <p className="text-text font-semibold">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-text-2 text-sm">Current Plan</p>
                    <p className="text-text font-semibold capitalize">
                      {selectedUser.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-2 text-sm">Agents</p>
                    <p className="text-text font-semibold">{selectedUser.agent_count}</p>
                  </div>
                  <div>
                    <p className="text-text-2 text-sm">Schedules</p>
                    <p className="text-text font-semibold">{selectedUser.schedule_count}</p>
                  </div>
                  {selectedUser.paddle_customer_id && (
                    <div>
                      <p className="text-text-2 text-sm">Subscription Status</p>
                      <p className="text-text font-semibold capitalize">
                        {selectedUser.paddle_subscription_status || "None"}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-text-2 text-sm">Created</p>
                    <p className="text-text text-sm">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Change Plan */}
                <div className="mb-6">
                  <label className="text-text-2 text-sm block mb-2">Change Plan</label>
                  <select
                    value={selectedUser.plan}
                    onChange={(e) => handleChangePlan(selectedUser.id, e.target.value)}
                    disabled={changingPlan}
                    className="w-full px-3 py-2 bg-bg-3 border border-border rounded text-text focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                {/* Actions */}
                <button
                  onClick={() => setPendingStatusUser(selectedUser)}
                  className="w-full px-4 py-2 bg-red/20 text-red rounded-lg hover:bg-red/30 transition font-medium"
                >
                  {selectedUser.is_active ? "Deactivate User" : "Reactivate User"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
