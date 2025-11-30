import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface LoginForm {
  username: string
  password: string
}

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.username, data.password)
      toast.success('Access Granted')
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Authentication Failed: Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl mb-6 border border-white/10 backdrop-blur-sm relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <ShieldCheckIcon className="w-10 h-10 text-primary relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            <span className="text-primary">Vortex</span> Command Center
          </h1>
          <p className="text-gray-400 font-mono text-sm">Secure Access Required</p>
        </div>

        {/* Login form */}
        <div className="glass-panel rounded-2xl p-8 animate-fade-in border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register('username', { required: 'Username is required' })}
                  type="text"
                  id="username"
                  className={clsx(
                    "w-full pl-10 pr-4 py-3 rounded-xl bg-background-darker border text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm",
                    errors.username 
                      ? "border-red-500/50 focus:border-red-500" 
                      : "border-white/10 focus:border-primary/50"
                  )}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-400 font-mono">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={clsx(
                    "w-full pl-10 pr-12 py-3 rounded-xl bg-background-darker border text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm",
                    errors.password 
                      ? "border-red-500/50 focus:border-red-500" 
                      : "border-white/10 focus:border-primary/50"
                  )}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Initialize Session</span>
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-6 text-center pt-6 border-t border-white/5">
            <p className="text-gray-400 text-sm">
              New analyst?{' '}
              <Link 
                to="/register" 
                className="text-primary hover:text-primary-hover font-medium transition-colors hover:underline"
              >
                Request Access
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in-up">
          <p className="text-gray-600 text-xs font-mono">
            SECURE CONNECTION ESTABLISHED • ENCRYPTED
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
