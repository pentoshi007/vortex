import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { 
  PlayIcon, 
  ArrowPathIcon, 
  ServerIcon, 
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CpuChipIcon,
  CircleStackIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { api } from '../api'
import UserManagement from '../components/UserManagement'
import toast from 'react-hot-toast'


const AdminPage = () => {
  const queryClient = useQueryClient()
  const [refreshInterval] = useState(30000) // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const { data: systemStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.getSystemStats().then(res => res.data),
    refetchInterval: refreshInterval,
  })



  // Use new combined runs endpoint
  const { data: allRuns, isLoading: allRunsLoading } = useQuery({
    queryKey: ['admin', 'all-runs'],
    queryFn: () => api.admin.getAllRuns().then(res => res.data),
    refetchInterval: refreshInterval,
  })

  // Auto-run check
  const { data: autoRunStatus } = useQuery({
    queryKey: ['admin', 'auto-run-check'],
    queryFn: () => api.admin.checkAutoRun().then(res => res.data),
    refetchInterval: 60000, // Check every minute
  })

  const { data: users } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.admin.getUsers().then(res => res.data),
    refetchInterval: 60000, // 1 minute
  })

  // Update last refresh time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const triggerIngestMutation = useMutation({
    mutationFn: (source: string = 'urlhaus') => api.admin.triggerIngest(source),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ingest-runs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-runs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      const result = data?.data?.result
      toast.success(`Ingestion completed: ${result?.new_count || 0} new, ${result?.updated_count || 0} updated`)
    },
    onError: (error: any) => {
      const message = error.code === 'ECONNABORTED' 
        ? 'Ingestion timed out - check logs for status'
        : error.response?.data?.message || 'Failed to trigger ingestion'
      toast.error(message)
    }
  })

  const triggerEnrichmentMutation = useMutation({
    mutationFn: () => api.admin.triggerEnrichment(10), // Process 10 IOCs max for free tier
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-runs'] })
      const result = data?.data?.result
      toast.success(`Enrichment completed: ${result?.enriched_count || 0} IOCs enriched`)
    },
    onError: (error: any) => {
      const message = error.code === 'ECONNABORTED' 
        ? 'Enrichment timed out - check logs for status'
        : error.response?.data?.message || 'Failed to trigger enrichment'
      toast.error(message)
    }
  })

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'running':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'failed':
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />
      case 'running':
        return <ClockIcon className="w-4 h-4 animate-spin" />
      case 'failed':
      case 'error':
        return <XCircleIcon className="w-4 h-4" />
      default:
        return <ClockIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header with live status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BoltIcon className="w-8 h-8 text-primary" />
            System Administration
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            Manage system resources, integrations, and user access
          </p>
        </div>
        <div className="flex items-center gap-4 bg-background-lighter px-4 py-2 rounded-lg border border-white/5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">System Status</div>
            <div className="text-sm font-medium text-green-400">OPERATIONAL</div>
          </div>
          <div className="h-8 w-px bg-white/10 mx-2"></div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Last Update</div>
            <div className="text-sm font-mono text-white">{lastRefresh.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="glass-panel rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <CpuChipIcon className="w-5 h-5 text-primary" />
          Resource Monitor
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background-darker rounded-xl p-4 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <CircleStackIcon className="w-16 h-16" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <ServerIcon className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Database Size</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {formatBytes((systemStats?.database?.total_size_mb ? systemStats.database.total_size_mb * 1024 * 1024 : 0))}
              </p>
            </div>
          </div>

          <div className="bg-background-darker rounded-xl p-4 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <ChartBarIcon className="w-16 h-16" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                  <ChartBarIcon className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Total IOCs</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {systemStats?.database?.collections?.indicators || 0}
              </p>
            </div>
          </div>

          <div className="bg-background-darker rounded-xl p-4 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <UserGroupIcon className="w-16 h-16" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <UserGroupIcon className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Active Users</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {(users?.total_users ?? users?.users?.length) || 0}
              </p>
            </div>
          </div>

          <div className="bg-background-darker rounded-xl p-4 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <ClockIcon className="w-16 h-16" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">24h Activity</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">
                  {systemStats?.recent_activity?.last_24h?.lookups || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Lookups performed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Operations */}
      <div className="glass-panel rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-primary" />
          System Operations
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <button
              onClick={() => triggerIngestMutation.mutate('urlhaus')}
              disabled={triggerIngestMutation.isPending}
              className="w-full flex items-center space-x-4 p-5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group text-left"
            >
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                <PlayIcon className={`w-6 h-6 text-blue-400 transition-transform ${
                  triggerIngestMutation.isPending ? 'animate-pulse' : 'group-hover:scale-110'
                }`} />
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">URLHaus Ingestion</div>
                <div className="text-gray-400 text-sm mt-1">
                  {triggerIngestMutation.isPending 
                    ? 'Fetching latest threat indicators...' 
                    : 'Fetch latest malware URLs and threat data'
                  }
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                  AUTO-INGEST
                </span>
              </div>
            </button>

            <button
              onClick={() => triggerEnrichmentMutation.mutate()}
              disabled={triggerEnrichmentMutation.isPending}
              className="w-full flex items-center space-x-4 p-5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group text-left"
            >
              <div className="flex-shrink-0 p-3 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                <ArrowPathIcon className={`w-6 h-6 text-green-400 transition-transform ${
                  triggerEnrichmentMutation.isPending ? 'animate-spin' : 'group-hover:scale-110'
                }`} />
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">Bulk Enrichment</div>
                <div className="text-gray-400 text-sm mt-1">
                  {triggerEnrichmentMutation.isPending 
                    ? 'Enriching IOCs with external intelligence...' 
                    : 'Enrich recent IOCs with VirusTotal & AbuseIPDB'
                  }
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                  ENRICHMENT
                </span>
              </div>
            </button>
          </div>

          <div className="bg-background-darker rounded-xl p-6 border border-white/5">
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Service Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-gray-300 text-sm">URLHaus Ingestion</span>
                <div className="flex items-center space-x-2">
                  {triggerIngestMutation.isPending ? (
                    <>
                      <ClockIcon className="w-4 h-4 text-yellow-400 animate-spin" />
                      <span className="text-yellow-400 text-xs font-mono">RUNNING</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-xs font-mono">READY</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-gray-300 text-sm">Bulk Enrichment</span>
                <div className="flex items-center space-x-2">
                  {triggerEnrichmentMutation.isPending ? (
                    <>
                      <ClockIcon className="w-4 h-4 text-yellow-400 animate-spin" />
                      <span className="text-yellow-400 text-xs font-mono">RUNNING</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-xs font-mono">READY</span>
                    </>
                  )}
                </div>
              </div>

              {/* Rate Limits */}
              {autoRunStatus?.rate_limits && (
                <div className="pt-2">
                  <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">API Quotas (Daily)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-white/5 border border-white/5">
                      <div className="text-gray-400 text-xs mb-1">VirusTotal</div>
                      <div className={`text-sm font-mono ${autoRunStatus.rate_limits.virustotal?.dailyRemaining < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {autoRunStatus.rate_limits.virustotal?.dailyRemaining || 0} left
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white/5 border border-white/5">
                      <div className="text-gray-400 text-xs mb-1">AbuseIPDB</div>
                      <div className={`text-sm font-mono ${autoRunStatus.rate_limits.abuseipdb?.dailyRemaining < 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {autoRunStatus.rate_limits.abuseipdb?.dailyRemaining || 0} left
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collection Stats */}
      {systemStats?.collection_counts && (
        <div className="glass-panel rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <CircleStackIcon className="w-5 h-5 text-primary" />
            Database Collections
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(systemStats.collection_counts).map(([collection, count]) => (
              <div key={collection} className="text-center p-4 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                <div className="text-2xl font-bold text-white font-mono mb-1">{count as number}</div>
                <div className="text-gray-400 text-xs uppercase tracking-wider">{collection}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operation History */}
      <div className="glass-panel rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-primary" />
            Operation Logs
          </h2>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin', 'all-runs'] })
              queryClient.invalidateQueries({ queryKey: ['admin', 'ingest-runs'] })
              toast.success('Refreshed operation logs')
            }}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
          >
            <ArrowPathIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-xs">Refresh</span>
          </button>
        </div>
        
        {allRunsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-400 text-sm">Loading logs...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.isArray(allRuns?.runs) && allRuns.runs.length > 0 ? (
              allRuns.runs.map((run: any) => (
                <div key={run.id || run._id} className="bg-background-darker rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusColor(run.status)}`}>
                        {getStatusIcon(run.status)}
                        <span className="capitalize">{run.status}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-mono border ${
                        run.operation === 'ingestion' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        {run.operation === 'ingestion' ? 'INGEST' : 'ENRICH'}
                      </span>
                      <span className="text-gray-400 text-sm">{run.source || 'Manual Trigger'}</span>
                    </div>
                    <div className="text-gray-500 text-xs font-mono">
                      {new Date(run.started_at).toLocaleString()}
                    </div>
                  </div>
                  
                  {run.operation === 'ingestion' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">New IOCs</span>
                        <div className="text-green-400 font-mono">{run.new_count || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">Updated</span>
                        <div className="text-blue-400 font-mono">{run.updated_count || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">Total Fetched</span>
                        <div className="text-white font-mono">{run.fetched_count || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">Duration</span>
                        <div className="text-gray-300 font-mono">
                          {run.duration_seconds ? `${Math.round(run.duration_seconds)}s` : '-'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">Processed</span>
                        <div className="text-blue-400 font-mono">{run.processed_count || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">Enriched</span>
                        <div className="text-green-400 font-mono">{run.enriched_count || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">Errors</span>
                        <div className="text-red-400 font-mono">{run.error_count || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <span className="text-gray-500 text-xs block mb-1">Duration</span>
                        <div className="text-gray-300 font-mono">
                          {run.duration_seconds ? `${Math.round(run.duration_seconds)}s` : '-'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {run.error && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mt-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <XCircleIcon className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 font-medium text-xs">Error Details</span>
                      </div>
                      <pre className="text-red-300/80 text-xs font-mono whitespace-pre-wrap pl-6">{run.error}</pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <ExclamationTriangleIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No operation logs found</p>
                <p className="text-gray-600 text-sm mt-1">System operations will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Management Section */}
      <UserManagement />
    </div>
  )
}

export default AdminPage
