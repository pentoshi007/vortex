import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  XCircleIcon,
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { api } from '../api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface User {
  id: string
  username: string
  email: string
  role: string
  created_at: string
  last_login?: string
}

const UserManagement = () => {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer'
  })

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.admin.getUsers().then(res => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => api.admin.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowCreateModal(false)
      resetForm()
      toast.success('User created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user')
    }
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.admin.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowEditModal(false)
      setSelectedUser(null)
      resetForm()
      toast.success('User updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user')
    }
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.admin.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowDeleteModal(false)
      setSelectedUser(null)
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    }
  })

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'viewer'
    })
    setShowPassword(false)
  }

  const handleCreateUser = () => {
    setShowCreateModal(true)
    resetForm()
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    })
    setShowEditModal(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const submitCreateUser = () => {
    if (!formData.username || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields')
      return
    }
    createUserMutation.mutate(formData)
  }

  const submitUpdateUser = () => {
    if (!selectedUser || !formData.email) {
      toast.error('Please fill in required fields')
      return
    }
    
    const updateData: any = {
      email: formData.email,
      role: formData.role
    }
    
    if (formData.password) {
      updateData.password = formData.password
    }
    
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: updateData
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'analyst':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'viewer':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <UserGroupIcon className="w-6 h-6 text-primary" />
            User Management
          </h2>
          <p className="text-gray-400 mt-1 text-sm">Manage system users, roles, and access permissions</p>
        </div>
        <button
          onClick={handleCreateUser}
          className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary-hover text-background font-bold rounded-lg transition-all shadow-neon hover:shadow-neon-hover"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-white">
              System Users ({(users?.total_users ?? users?.users?.length) || 0})
            </h3>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-3 text-sm">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-xs uppercase tracking-wider">User</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-xs uppercase tracking-wider">Created</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-xs uppercase tracking-wider">Last Login</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Array.isArray(users?.users) ? users.users : []).map((user: User) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{user.username}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={clsx(
                        'px-2.5 py-1 rounded-full text-xs font-medium border uppercase tracking-wider',
                        getRoleBadgeColor(user.role)
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm font-mono">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm font-mono">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-green-400 text-xs font-medium uppercase tracking-wider">Active</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                          title="Edit user"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                            title="Delete user"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PlusIcon className="w-5 h-5 text-primary" />
                Create New User
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-10 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background-darker border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCreateUser}
                  disabled={createUserMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-background font-bold rounded-xl transition-colors shadow-neon hover:shadow-neon-hover"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PencilIcon className="w-5 h-5 text-primary" />
                Edit User
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.username}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  New Password (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-10 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="Leave empty to keep current"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  disabled={selectedUser.id === currentUser?.id}
                  className="w-full px-4 py-2.5 bg-background-darker border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none disabled:opacity-50"
                >
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
                {selectedUser.id === currentUser?.id && (
                  <p className="text-yellow-400/70 text-xs mt-2 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    You cannot change your own role
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitUpdateUser}
                  disabled={updateUserMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-background font-bold rounded-xl transition-colors shadow-neon hover:shadow-neon-hover"
                >
                  {updateUserMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-md border border-red-500/30 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <TrashIcon className="w-5 h-5 text-red-500" />
                Delete User
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircleIcon className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h4 className="text-red-400 font-bold mb-1">Confirm Deletion</h4>
                  <p className="text-red-300/80 text-sm leading-relaxed">
                    Are you sure you want to delete <span className="text-white font-mono bg-white/10 px-1 rounded">{selectedUser.username}</span>? This action is irreversible and will remove all user data.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUserMutation.mutate(selectedUser.id)}
                  disabled={deleteUserMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-red-500/20"
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement