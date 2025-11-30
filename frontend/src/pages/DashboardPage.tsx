import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TagIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  FireIcon,
  ChartBarIcon,
  ArrowPathIcon,
  TrophyIcon,
  CpuChipIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'
import { api } from '../api'
import { PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const DashboardPage = () => {
  const navigate = useNavigate()
  
  // State for interactivity
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Fetch overview metrics
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview, isFetched: overviewFetched } = useQuery({
    queryKey: ['metrics', 'overview'],
    queryFn: () => api.metrics.overview().then(res => res.data),
    refetchInterval: 120000,
    retry: 2,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })

  // Fetch time series data
  const { data: timeseriesData, isLoading: timeseriesLoading, isFetched: timeseriesFetched } = useQuery({
    queryKey: ['metrics', 'timeseries'],
    queryFn: () => api.metrics.timeSeries({ days: 30 }).then(res => res.data),
    refetchInterval: 180000,
    retry: 2,
    staleTime: 60000,
  })

  // Fetch recent IOCs
  const { data: recentIOCs, isLoading: iocsLoading, isFetched: iocsFetched } = useQuery({
    queryKey: ['iocs', 'recent'],
    queryFn: () => api.iocs.list({ per_page: 10, sort: 'created_at:desc' }).then(res => res.data),
    refetchInterval: 120000,
    retry: 1,
    staleTime: 30000,
  })

  // Combined loading state - show loading until all critical data is fetched
  const isInitialLoading = !overviewFetched || overviewLoading
  
  // Delay showing content to prevent flash of 0 values
  useEffect(() => {
    if (overviewFetched && overviewData) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => setShowContent(true), 100)
      return () => clearTimeout(timer)
    }
  }, [overviewFetched, overviewData])

  const severityColors = {
    critical: '#dc2626', // Red-600
    high: '#f43f5e',     // Rose-500 (Neon Red)
    medium: '#f59e0b',   // Amber-500
    low: '#10b981',      // Emerald-500
    info: '#3b82f6',     // Blue-500
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchOverview()])
      toast.success('Dashboard refreshed')
    } catch (error) {
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSeverityClick = (severity: string) => {
    navigate(`/iocs?severity=${severity}`)
  }

  const handleIOCClick = (iocId: string) => {
    navigate(`/iocs/${iocId}`)
  }

  const handleQuickSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/iocs?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const InteractiveKPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = 'primary',
    onClick,
    subtitle
  }: any) => (
    <div 
      className={clsx(
        "glass-panel rounded-xl p-6 relative overflow-hidden group transition-all duration-300",
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-neon' : ''
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      
      <div className="relative z-10">
        <div className="flex flex-col gap-3 mb-4">
          <div className={clsx("p-3 rounded-lg bg-opacity-20 w-fit", `bg-${color}/20`)}>
            <Icon className={clsx("w-6 h-6", `text-${color}`)} />
          </div>
          {trend && (
            <div className={clsx("flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-opacity-10 w-fit", trend === 'up' ? 'bg-green-500 text-green-400' : 'bg-red-500 text-red-400')}>
              {trend === 'up' ? <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> : <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />}
              {trendValue}%
            </div>
          )}
        </div>
        
        <h3 className="text-3xl font-bold text-white mb-1 font-mono">{formatNumber(value || 0)}</h3>
        <p className="text-gray-400 text-sm font-medium mb-2">{title}</p>
        
        <div className="flex items-center gap-2">
          {subtitle && <p className="text-gray-500 text-xs">{subtitle}</p>}
        </div>
      </div>
      
      {/* Glow effect */}
      <div className={clsx("absolute -bottom-4 -left-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity", `bg-${color}`)}></div>
    </div>
  )

  // Full-screen loading state for initial load
  if (isInitialLoading || !showContent) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="relative">
          {/* Animated logo */}
          <div className="w-32 h-32 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <img 
              src="/logo.svg" 
              alt="Loading..." 
              className="w-24 h-24 relative z-10 animate-pulse" 
            />
          </div>
        </div>
        <div className="mt-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Loading Command Center
            </span>
          </h2>
          <p className="text-gray-400 text-sm font-mono mb-2">Fetching threat intelligence data...</p>
          <p className="text-gray-500 text-xs">This may take a moment</p>
        </div>
        {/* Loading progress bar */}
        <div className="mt-8 w-64">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full animate-loading-bar"></div>
          </div>
        </div>
        {/* Status indicators */}
        <div className="mt-6 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              overviewFetched ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            )}></div>
            <span className="text-gray-500">Metrics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              timeseriesFetched ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            )}></div>
            <span className="text-gray-500">Charts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              iocsFetched ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            )}></div>
            <span className="text-gray-500">Threats</span>
          </div>
        </div>
      </div>
    )
  }

  // Normalize overview metrics
  const totalIOCs = overviewData?.ioc_metrics?.total ?? overviewData?.total_iocs ?? 0
  const severityCounts: Record<string, number> = overviewData?.ioc_metrics?.by_severity ?? overviewData?.severity_counts ?? {}
  const recent24h = overviewData?.ioc_metrics?.recent_24h ?? overviewData?.recent_iocs_24h ?? 0
  const topTags: Array<{ name: string; count: number }> = overviewData?.tag_metrics?.top_tags ?? overviewData?.top_tags ?? []

  // Prepare charts data
  const severityData = Object.entries(severityCounts).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: severityColors[severity as keyof typeof severityColors] || '#6b7280'
  }))

  // Prepare chart data - show last 7 days for velocity
  const rawChartData = timeseriesData?.ioc_timeseries ?? []
  const chartData = rawChartData.slice(-7).map((row: any) => ({
    date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    iocs: row.total ?? 0
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <CpuChipIcon className="w-8 h-8 text-primary animate-pulse-slow" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Command Center
            </span>
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            System Status: <span className="text-green-400">OPERATIONAL</span> | Threat Level: <span className="text-yellow-400">ELEVATED</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search Intelligence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
              className="pl-10 pr-4 py-2.5 bg-background-lighter border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-full sm:w-64 transition-all group-hover:border-white/20"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2 group-hover:text-primary transition-colors" />
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 glass-panel hover:bg-white/5 text-white rounded-lg transition-all disabled:opacity-50 border border-white/10 hover:border-primary/30"
          >
            <ArrowPathIcon className={clsx("w-4 h-4", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InteractiveKPICard
          title="Total Indicators"
          value={totalIOCs}
          icon={ShieldCheckIcon}
          color="primary"
          onClick={() => navigate('/iocs')}
          subtitle="Global Database"
        />
        <InteractiveKPICard
          title="Critical Threats"
          value={severityCounts?.critical || 0}
          icon={ExclamationTriangleIcon}
          color="red-500"
          onClick={() => handleSeverityClick('critical')}
          subtitle="Requires Attention"
        />
        <InteractiveKPICard
          title="New (24h)"
          value={recent24h}
          icon={ClockIcon}
          color="green-500"
          trend="up"
          trendValue="12"
          onClick={() => navigate('/iocs?timeframe=24h')}
          subtitle="Fresh Intelligence"
        />
        <InteractiveKPICard
          title="Active Tags"
          value={Array.isArray(topTags) ? topTags.length : 0}
          icon={TagIcon}
          color="purple-500"
          onClick={() => navigate('/tags')}
          subtitle="Threat Categories"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Threat Distribution (Swapped) */}
          <div className="glass-panel rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <ChartPieIcon className="w-5 h-5 text-primary" />
              Threat Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#0B1120',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-white">{totalIOCs}</span>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {severityData.map((item) => (
                  <div 
                    key={item.name}
                    onClick={() => handleSeverityClick(item.name)}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}></div>
                      <span className="text-sm text-gray-300 capitalize group-hover:text-white transition-colors">{item.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ingestion Velocity (Swapped & Improved) */}
          <div className="glass-panel rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-primary" />
                Ingestion Velocity
              </h3>
              <div className="flex items-center gap-3">
                {chartData.length > 0 && (
                  <span className="text-xs text-primary font-mono">
                    {chartData.reduce((sum: number, d: any) => sum + d.iocs, 0).toLocaleString()} total
                  </span>
                )}
                <span className="text-xs text-gray-500 font-mono">Last 7 Days</span>
              </div>
            </div>
            <div className="h-72 w-full">
              {timeseriesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <span className="text-gray-500 text-sm">Loading chart...</span>
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        backgroundColor: '#0B1120',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '8px 12px'
                      }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                      formatter={(value: number) => [value.toLocaleString(), 'IOCs Ingested']}
                    />
                    <Bar
                      dataKey="iocs"
                      fill="url(#colorBar)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <ChartBarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No ingestion data for the past 7 days</p>
                    <p className="text-gray-600 text-xs mt-1">Run ingestion from Admin Panel to see velocity chart</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Live Feed */}
          <div className="glass-panel rounded-xl p-6 border border-white/10 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-accent" />
                Live Threats
              </h3>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
              </span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {iocsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background-lighter border border-white/5 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-6 bg-white/10 rounded"></div>
                        <div className="flex-1 h-4 bg-white/10 rounded"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-16 h-5 bg-white/5 rounded"></div>
                        <div className="w-16 h-5 bg-white/5 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentIOCs?.iocs?.length === 0 ? (
                <div className="text-center py-8">
                  <FireIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No threats detected</p>
                  <p className="text-gray-600 text-xs mt-1">Run ingestion to populate data</p>
                </div>
              ) : recentIOCs?.iocs?.slice(0, 8).map((ioc: any) => (
                <div 
                  key={ioc.id}
                  onClick={() => handleIOCClick(ioc.id)}
                  className="group p-4 rounded-xl bg-background-lighter border border-white/5 hover:border-primary/30 hover:shadow-neon-hover transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={clsx(
                        "flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded border uppercase tracking-wider font-bold",
                        ioc.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                        ioc.severity === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' :
                        'text-blue-400 border-blue-500/30 bg-blue-500/10'
                      )}>
                        {ioc.type}
                      </span>
                      <div className="text-sm font-mono text-white truncate group-hover:text-primary transition-colors">
                        {ioc.value}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-500 whitespace-nowrap">{formatTimeAgo(ioc.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ioc.tags && ioc.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {ioc.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-400 font-mono group-hover:border-white/20 transition-colors">
                              #{tag}
                            </span>
                          ))}
                          {ioc.tags.length > 3 && (
                            <span className="text-[10px] text-gray-500">+{ioc.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-600 italic">No tags</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg">
                      <TrophyIcon className="w-3 h-3 text-yellow-500" />
                      <span className="font-mono">{ioc.score}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => navigate('/iocs')}
                className="w-full py-3 mt-4 text-sm text-center text-primary hover:text-white border border-primary/20 hover:bg-primary/10 rounded-lg transition-all"
              >
                View All Intelligence
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
