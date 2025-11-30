import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { UserCircleIcon, KeyIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, CalendarIcon, EnvelopeIcon, UserIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/authStore'
import { apiClient } from '../api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const ProfilePage = () => {
  const { user } = useAuthStore()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>()

  const newPassword = watch('newPassword')

  const onSubmitPasswordChange = async (data: ChangePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await apiClient.post('/api/auth/change-password', {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      })
      
      toast.success('Password changed successfully')
      reset()
      setIsChangingPassword(false)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 glass-panel rounded-xl">
          <div className="text-gray-400">Please log in to view your profile</div>
        </div>
      </div>
    )
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="p-4 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl border border-white/10 backdrop-blur-sm relative group">
          <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
          <UserCircleIcon className="w-12 h-12 text-primary relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Analyst Profile</h1>
          <p className="text-gray-400 mt-1 font-mono text-sm">ID: {user.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Information */}
          <div className="glass-panel rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-primary" />
              Account Details
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Username</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-background-darker border border-white/5 rounded-xl text-white group hover:border-primary/30 transition-colors">
                    <UserIcon className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
                    <span className="font-mono">{user.username}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Email Address</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-background-darker border border-white/5 rounded-xl text-white group hover:border-primary/30 transition-colors">
                    <EnvelopeIcon className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
                    <span className="font-mono">{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Role & Access</label>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Member Since</label>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                    <span>{new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Active Permissions</label>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-white/5 text-gray-300 border border-white/10"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Account Stats */}
          <div className="glass-panel rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-6">Session Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-background-darker rounded-xl border border-white/5">
                <span className="text-gray-400 text-sm">Last Login</span>
                <span className="text-white font-mono text-sm">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-background-darker rounded-xl border border-white/5">
                <span className="text-gray-400 text-sm">Account Status</span>
                <span className="text-green-400 font-mono text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-8">
          <div className="glass-panel rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Security</h2>
              </div>
            </div>

            {!isChangingPassword ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm mb-6">
                  Regularly updating your password helps keep your account secure.
                </p>
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 font-medium"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmitPasswordChange)} className="space-y-4 animate-fade-in">
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('currentPassword', { required: 'Required' })}
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={clsx(
                        "w-full px-4 py-2.5 bg-background-darker border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm",
                        errors.currentPassword ? "border-red-500/50" : "border-white/10 focus:border-primary/50"
                      )}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-xs text-red-400">{errors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('newPassword', { 
                        required: 'Required',
                        minLength: { value: 8, message: 'Min 8 chars' }
                      })}
                      type={showNewPassword ? 'text' : 'password'}
                      className={clsx(
                        "w-full px-4 py-2.5 bg-background-darker border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm",
                        errors.newPassword ? "border-red-500/50" : "border-white/10 focus:border-primary/50"
                      )}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-xs text-red-400">{errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword', { 
                        required: 'Required',
                        validate: value => value === newPassword || 'Mismatch'
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={clsx(
                        "w-full px-4 py-2.5 bg-background-darker border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm",
                        errors.confirmPassword ? "border-red-500/50" : "border-white/10 focus:border-primary/50"
                      )}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 text-sm"
                  >
                    {isLoading ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false)
                      reset()
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage