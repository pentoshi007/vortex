import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon, UserPlusIcon, EnvelopeIcon, LockClosedIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
}

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register: registerUser } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>()

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Validation Error: Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await registerUser(data.username, data.email, data.password)
      toast.success('Account Created Successfully')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Registration error:', error)
      const message = error.response?.data?.message || 'Registration Failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl mb-6 border border-white/10 backdrop-blur-sm relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <UserPlusIcon className="w-10 h-10 text-primary relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Join <span className="text-primary">Vortex</span>
          </h1>
          <p className="text-gray-400 font-mono text-sm">Initialize Analyst Profile</p>
        </div>

        {/* Registration form */}
        <div className="glass-panel rounded-2xl p-8 animate-fade-in border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register('username', { 
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Min 3 characters' },
                    maxLength: { value: 50, message: 'Max 50 characters' },
                    pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Alphanumeric, hyphen, underscore only' }
                  })}
                  type="text"
                  id="username"
                  className={clsx(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl bg-background-darker border text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm",
                    errors.username 
                      ? "border-red-500/50 focus:border-red-500" 
                      : "border-white/10 focus:border-primary/50"
                  )}
                  placeholder="Choose username"
                  autoComplete="username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-400 font-mono">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
                  })}
                  type="email"
                  id="email"
                  className={clsx(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl bg-background-darker border text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm",
                    errors.email 
                      ? "border-red-500/50 focus:border-red-500" 
                      : "border-white/10 focus:border-primary/50"
                  )}
                  placeholder="Enter email"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400 font-mono">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Min 8 characters' }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={clsx(
                    "w-full pl-10 pr-12 py-2.5 rounded-xl bg-background-darker border text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm",
                    errors.password 
                      ? "border-red-500/50 focus:border-red-500" 
                      : "border-white/10 focus:border-primary/50"
                  )}
                  placeholder="Create password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400 font-mono">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className={clsx(
                    "w-full pl-10 pr-12 py-2.5 rounded-xl bg-background-darker border text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm",
                    errors.confirmPassword 
                      ? "border-red-500/50 focus:border-red-500" 
                      : "border-white/10 focus:border-primary/50"
                  )}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400 font-mono">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  <span>Creating Profile...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center pt-6 border-t border-white/5">
            <p className="text-gray-400 text-sm">
              Already have credentials?{' '}
              <Link 
                to="/login" 
                className="text-primary hover:text-primary-hover font-medium transition-colors hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in-up">
          <p className="text-gray-600 text-xs font-mono">
            SECURE REGISTRATION PROTOCOL • ENCRYPTED
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage