import { useState, useEffect } from 'react';
import { profilesAPI, authAPI, collegesAPI } from '../lib/supabaseApi';
import type { Profile, UserRole } from '../types/database';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  User,
  Mail,
  Shield,
  Search,
  X,
  CheckCircle,
  Lock,
  Building2,
  Layers
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';
import { formatRoleLabel, normalizeUserRole } from '../lib/roles';

const Users = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Faculty' as UserRole,
    /** College name from directory (stored in profiles.department). */
    department: '' as string,
    /** Faculty-only: department within the college (profiles.faculty_department). */
    faculty_department: '' as string,
  });

  const composeFullName = (firstName: string, middleName: string, lastName: string) =>
    [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');

  const extractNameParts = (user: Profile) => {
    const firstName = user.first_name?.trim() || '';
    const middleName = user.middle_initial?.trim() || '';
    const lastName = user.family_name?.trim() || '';
    if (firstName || middleName || lastName) {
      return { firstName, middleName, lastName };
    }

    const fullName = (user.full_name || '').trim();
    if (!fullName) {
      return { firstName: '', middleName: '', lastName: '' };
    }
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0], middleName: '', lastName: '' };
    }
    if (parts.length === 2) {
      return { firstName: parts[0], middleName: '', lastName: parts[1] };
    }
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await profilesAPI.getAll();
      setUsers(usersData);
      try {
        const colleges = await collegesAPI.getAll();
        setDepartments(colleges.filter((c) => c.is_active).map((c) => c.name));
      } catch {
        setDepartments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const roleAlreadyTakenAtCollege = (department: string, role: UserRole, excludeUserId?: string) => {
    if (!department) return false;
    const r = normalizeUserRole(role);
    // Allow multiple Department users (Faculty) per college.
    if (r === 'Faculty') return false;
    // Keep one College Admin (DeptHead) per college.
    if (r !== 'DeptHead') return false;
    return users.some((u) => {
      const ur = normalizeUserRole(u.role);
      if (u.department !== department) return false;
      if (u.id === excludeUserId) return false;
      return ur === r;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const firstName = formData.firstName.trim();
      const middleName = formData.middleName.trim();
      const lastName = formData.lastName.trim();
      const fullName = composeFullName(firstName, middleName, lastName);

      if (!firstName || !lastName) {
        setError('First Name and Last Name are required.');
        setSubmitting(false);
        return;
      }

      if (editingUser) {
        if (formData.role === 'Faculty' && !formData.faculty_department.trim()) {
          setError('Please enter a department.');
          setSubmitting(false);
          return;
        }
        if ((formData.role === 'Faculty' || formData.role === 'DeptHead') && !formData.department) {
          setError('Please select a college.');
          setSubmitting(false);
          return;
        }
        if (formData.department && roleAlreadyTakenAtCollege(formData.department, formData.role, editingUser.id)) {
          setError(
            'This college already has a College Admin. Only one College Admin is allowed per college.'
          );
          setSubmitting(false);
          return;
        }
        await profilesAPI.update(editingUser.id, {
          full_name: fullName,
          first_name: firstName,
          middle_initial: middleName || null,
          family_name: lastName,
          role: formData.role,
          department: formData.role === 'Admin' ? null : formData.department || null,
          faculty_department:
            formData.role === 'Faculty' ? formData.faculty_department.trim() || null : null
        });
        await collegesAPI.syncDeptHeadHandlerFromProfile(
          editingUser.id,
          formData.role,
          formData.role === 'DeptHead' ? formData.department || null : null
        );
        setSuccess('User updated successfully');
      } else {
        if (!formData.password || formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setSubmitting(false);
          return;
        }
        if (formData.role !== 'Admin' && (formData.role === 'Faculty' || formData.role === 'DeptHead') && !formData.department) {
          setError('Please select a college.');
          setSubmitting(false);
          return;
        }
        if (formData.role === 'Faculty' && !formData.faculty_department.trim()) {
          setError('Please enter a department.');
          setSubmitting(false);
          return;
        }
        if ((formData.role === 'Faculty' || formData.role === 'DeptHead') && roleAlreadyTakenAtCollege(formData.department, formData.role)) {
          setError(
            'This college already has a College Admin. Only one College Admin is allowed per college.'
          );
          setSubmitting(false);
          return;
        }

        const data = await authAPI.signUp(
          formData.email,
          formData.password,
          {
            firstName,
            middleName,
            lastName,
          },
          formData.role,
          formData.role === 'Admin' ? null : formData.department
        );
        if (data?.user?.id) {
          await profilesAPI.update(data.user.id, {
            full_name: fullName,
            first_name: firstName,
            middle_initial: middleName || null,
            family_name: lastName,
            department: formData.role === 'Admin' ? null : formData.department,
            faculty_department: formData.role === 'Faculty' ? formData.faculty_department.trim() : null
          });
          await collegesAPI.syncDeptHeadHandlerFromProfile(
            data.user.id,
            formData.role,
            formData.role === 'DeptHead' ? formData.department || null : null
          );
        }
        setSuccess('User created successfully. They can now sign in with their email and password.');
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    const { firstName, middleName, lastName } = extractNameParts(user);
    setFormData({
      firstName,
      middleName,
      lastName,
      email: user.email,
      password: '',
      role: normalizeUserRole(user.role),
      department: user.department || '',
      faculty_department: user.faculty_department || ''
    });
    setShowModal(true);
  };

  const executeDeleteUser = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setError('');
    setDeleteSubmitting(true);
    try {
      await collegesAPI.syncDeptHeadHandlerFromProfile(id, 'Admin', null);
      await profilesAPI.delete(id);
      setSuccess('User deleted successfully');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Faculty',
      department: '',
      faculty_department: ''
    });
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole) => {
    const r = normalizeUserRole(role);
    switch (r) {
      case 'Admin': return 'bg-red-100 text-red-700';
      case 'DeptHead': return 'bg-purple-100 text-purple-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black">Users</h1>
          <p className="text-base text-gray-500 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create User
        </button>
      </div>

      <CenteredAlert error={error || undefined} success={success || undefined} onClose={() => { setError(''); setSuccess(''); }} />

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-900 font-semibold">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-wmsu-black">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {formatRoleLabel(normalizeUserRole(user.role))}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.department || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {normalizeUserRole(user.role) === 'Faculty' && user.faculty_department?.trim()
                    ? user.faculty_department
                    : '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(user)}
                      className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="presentation"
          onClick={() => !deleteSubmitting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-user-title" className="text-lg font-semibold text-wmsu-black">
              Delete user?
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              This will remove{' '}
              <span className="font-medium text-gray-900">
                {deleteTarget.full_name}
              </span>{' '}
              <span className="text-gray-500">({deleteTarget.email})</span> from the system. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-gray-600 hover:text-wmsu-black disabled:opacity-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => void executeDeleteUser()}
                className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-md"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-wmsu-black">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Middle Initial/Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!!editingUser}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 ${
                    editingUser ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  required
                />
                {editingUser && (
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                )}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                      placeholder="Leave empty to keep current password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Send password reset email to ${editingUser.email}?`)) {
                          try {
                            await authAPI.resetPassword(editingUser.email);
                            setSuccess(`Password reset email sent to ${editingUser.email}`);
                          } catch (err: any) {
                            setError(err.message || 'Failed to send password reset email');
                          }
                        }
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                    >
                      Send Reset Email
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter new password or use "Send Reset Email" to let user reset it themselves
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const role = e.target.value as UserRole;
                    setFormData((prev) => ({
                      ...prev,
                      role,
                      ...(role === 'Admin'
                        ? { department: '', faculty_department: '' }
                        : role === 'DeptHead'
                          ? { faculty_department: '' }
                          : {}),
                    }));
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                >
                  <option value="Faculty">Department</option>
                  <option value="DeptHead">College Admin</option>
                  <option value="Admin">WMSU Admin</option>
                </select>
              </div>

              {(formData.role === 'Faculty' || formData.role === 'DeptHead') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    College
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    required={formData.role === 'Faculty' || formData.role === 'DeptHead'}
                  >
                    <option value="">Select college</option>
                    {departments.map((d) => (
                      <option key={d} value={d} disabled={roleAlreadyTakenAtCollege(d, formData.role, editingUser?.id)}>
                        {d}{roleAlreadyTakenAtCollege(d, formData.role, editingUser?.id) ? ' (already has a College Admin)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    A college can have multiple Department users. Only College Admin is limited to one per college.
                  </p>
                </div>
              )}

              {formData.role === 'Faculty' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Layers className="w-4 h-4 inline mr-2" />
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.faculty_department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, faculty_department: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-600 hover:text-wmsu-black disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingUser ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingUser ? 'Update User' : 'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

