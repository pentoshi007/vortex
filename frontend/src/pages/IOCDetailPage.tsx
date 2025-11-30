import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TagIcon,
  GlobeAltIcon,
  LinkIcon,
  DocumentTextIcon,
  FireIcon,
  TrophyIcon,
  ArrowLeftIcon,
  ShareIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CpuChipIcon,
  ServerIcon,
  UserGroupIcon,
  BugAntIcon,
  FingerPrintIcon,
  HashtagIcon
} from '@heroicons/react/24/outline'
import { api } from '../api'
import { useAuthStore } from '../stores/authStore'
import PermissionCheck from '../components/PermissionCheck'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const IOCDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthStore()
  
  const [showAddTagModal, setShowAddTagModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'enrichment' | 'timeline'>('overview')

  const { data: ioc, isLoading } = useQuery({
    queryKey: ['ioc', id],
    queryFn: () => api.iocs.get(id!).then(res => res.data),
    enabled: !!id,
  })

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: (tag: string) => api.iocs.update(id!, { action: 'add', tag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ioc', id] })
      toast.success('Tag added successfully')
      setNewTag('')
      setShowAddTagModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add tag')
    }
  })

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => api.iocs.update(id!, { action: 'remove', tag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ioc', id] })
      toast.success('Tag removed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove tag')
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Loading Header */}
        <div className="glass-panel rounded-xl p-6 h-48"></div>
        
        {/* Loading Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-xl p-6 h-64"></div>
            <div className="glass-panel rounded-xl p-6 h-64"></div>
          </div>
          <div className="space-y-6">
            <div className="glass-panel rounded-xl p-6 h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!ioc) {
    return (
      <div className="glass-panel rounded-xl p-12 text-center border border-white/10">
        <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">IOC Not Found</h1>
        <p className="text-gray-400 mb-6">The requested indicator could not be found or may have been removed.</p>
        <button
          onClick={() => navigate('/iocs')}
          className="px-6 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-hover transition-colors"
        >
          Back to Database
        </button>
      </div>
    )
  }

  const typeIcons = {
    ip: GlobeAltIcon,
    domain: LinkIcon,
    url: DocumentTextIcon,
    sha256: ShieldCheckIcon,
    md5: ShieldCheckIcon,
    sha1: ShieldCheckIcon,
  }

  const severityConfig = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: FireIcon, glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: ExclamationTriangleIcon, glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: ExclamationCircleIcon, glow: '' },
    low: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircleIcon, glow: '' },
    info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: InformationCircleIcon, glow: '' },
  }

  const IconComponent = typeIcons[ioc.type as keyof typeof typeIcons] || DocumentTextIcon
  const severityInfo = severityConfig[ioc.severity as keyof typeof severityConfig] || severityConfig.info
  const SeverityIcon = severityInfo.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleAddTag = () => {
    if (!newTag.trim()) {
      toast.error('Please enter a tag name')
      return
    }
    addTagMutation.mutate(newTag.trim())
  }

  const handleRemoveTag = (tag: string) => {
    removeTagMutation.mutate(tag)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-400'
    if (score >= 60) return 'text-orange-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-green-400'
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: EyeIcon },
    { id: 'sources', label: 'Sources', icon: ServerIcon },
    { id: 'enrichment', label: 'Enrichment', icon: CpuChipIcon },
    { id: 'timeline', label: 'Timeline', icon: ClockIcon },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={clsx("glass-panel rounded-xl p-6 border relative overflow-hidden", severityInfo.border)}>
        {/* Background Glow */}
        <div className={clsx("absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/3 pointer-events-none", severityInfo.bg.replace('/10', '/30'))}></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/iocs')}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5 hover:border-white/20"
              title="Back to Database"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            
            <div className={clsx("p-3 rounded-xl border", severityInfo.bg, severityInfo.border, severityInfo.color, severityInfo.glow)}>
              <IconComponent className="w-8 h-8" />
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">IOC Analysis</h1>
                {ioc.score >= 70 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-xs font-medium uppercase tracking-wider">
                    <TrophyIcon className="w-3 h-3" /> High Value Target
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                <span className="uppercase">{ioc.type}</span>
                <span className="text-gray-600">|</span>
                <span>ID: {ioc.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className={clsx("text-3xl font-bold font-mono", getScoreColor(ioc.score))}>
                {ioc.score}<span className="text-lg text-gray-600">/100</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Threat Score</div>
            </div>
            
            <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
            
            <div className="flex flex-col items-end gap-1">
              <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border", severityInfo.bg, severityInfo.color, severityInfo.border)}>
                <SeverityIcon className="w-4 h-4" />
                <span className="uppercase">{ioc.severity}</span>
              </div>
              <span className="text-xs text-gray-500">Risk Level</span>
            </div>
          </div>
        </div>

        {/* IOC Value Display */}
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/5 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-black/40 rounded-lg p-4 border border-white/10 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium flex items-center gap-2">
                <FingerPrintIcon className="w-3 h-3" />
                Indicator Value
              </div>
              <div className="text-white font-mono text-base sm:text-lg break-all select-all">
                {ioc.value}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(ioc.value)}
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5 hover:border-white/20"
                title="Copy to Clipboard"
              >
                <DocumentTextIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5 hover:border-white/20"
                title="Share Link"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex border-b border-white/10">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 relative',
                  isActive
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                )}
              >
                <TabIcon className={clsx("w-4 h-4", isActive ? "text-primary" : "text-gray-500")} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
                  <div className={clsx("text-2xl font-bold mb-1", getScoreColor(ioc.score))}>{ioc.score}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Threat Score</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{ioc.sources?.length || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Sources</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{ioc.tags?.length || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Tags</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {Math.max(0, Math.floor((new Date().getTime() - new Date(ioc.first_seen).getTime()) / (1000 * 60 * 60 * 24)))}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Days Active</div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="glass-panel rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-primary" />
                  Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Type</span>
                    <span className="text-white font-mono text-sm uppercase bg-white/5 px-2 py-1 rounded">{ioc.type}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Severity</span>
                    <span className={clsx("text-sm font-medium uppercase", severityInfo.color)}>{ioc.severity}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm">First Seen</span>
                    <span className="text-white text-sm font-mono">{formatDate(ioc.first_seen)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Last Seen</span>
                    <span className="text-white text-sm font-mono">{formatDate(ioc.last_seen)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Last Updated</span>
                    <span className="text-white text-sm font-mono">{formatDate(ioc.updated_at)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Status</span>
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="glass-panel rounded-xl p-6 border border-white/10 animate-fade-in">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ServerIcon className="w-5 h-5 text-primary" />
                Intelligence Sources
              </h3>
              {ioc.sources && ioc.sources.length > 0 ? (
                <div className="space-y-4">
                  {ioc.sources.map((source: any, index: number) => (
                    <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-colors group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary group-hover:bg-primary/20 transition-colors">
                            <GlobeAltIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-white font-bold capitalize">{source.name}</div>
                            <div className="text-gray-500 text-xs uppercase tracking-wider">External Feed</div>
                          </div>
                        </div>
                        {source.ref && (
                          <a
                            href={source.ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5"
                            title={`View source: ${source.name}`}
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm bg-black/20 rounded-lg p-3">
                        <div>
                          <span className="text-gray-500 text-xs block mb-1">First Reported</span>
                          <div className="text-white font-mono text-xs">{formatDate(source.first_seen)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block mb-1">Last Updated</span>
                          <div className="text-white font-mono text-xs">{formatDate(source.last_seen)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                  <ServerIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No source information available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'enrichment' && (
            <div className="glass-panel rounded-xl p-6 border border-white/10 animate-fade-in">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5 text-primary" />
                Threat Enrichment
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* VirusTotal Card */}
                <div className="bg-white/5 rounded-xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ShieldCheckIcon className="w-24 h-24" />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-[#394EFF]/20 rounded-lg border border-[#394EFF]/30">
                      <ShieldCheckIcon className="w-6 h-6 text-[#394EFF]" />
                    </div>
                    <div>
                      <div className="text-white font-bold">VirusTotal</div>
                      <div className="text-gray-500 text-xs">Malware Analysis</div>
                    </div>
                  </div>

                  {ioc.vt && typeof ioc.vt === 'object' && (ioc.vt.positives !== undefined || ioc.vt.last_fetched_at) ? (
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                        <span className="text-gray-400 text-sm">Detections</span>
                        <span className={clsx("font-mono font-bold", ioc.vt.positives > 0 ? "text-red-400" : "text-green-400")}>
                          {ioc.vt.positives || 0} <span className="text-gray-600">/</span> {ioc.vt.total || 0}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-500 text-xs block mb-1">Reputation</span>
                          <div className={clsx("font-medium text-sm", ioc.vt.reputation < 0 ? "text-red-400" : "text-green-400")}>
                            {ioc.vt.reputation ?? 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block mb-1">Last Scan</span>
                          <div className="text-white text-xs truncate">
                            {ioc.vt.last_fetched_at ? new Date(ioc.vt.last_fetched_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {ioc.vt.permalink && (
                        <a 
                          href={ioc.vt.permalink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full py-2 text-center text-xs font-medium text-[#394EFF] bg-[#394EFF]/10 hover:bg-[#394EFF]/20 rounded-lg transition-colors border border-[#394EFF]/20"
                        >
                          View Full Report
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No VirusTotal data available
                    </div>
                  )}
                </div>

                {/* AbuseIPDB Card */}
                <div className="bg-white/5 rounded-xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ExclamationTriangleIcon className="w-24 h-24" />
                  </div>

                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-[#FF9800]/20 rounded-lg border border-[#FF9800]/30">
                      <ExclamationTriangleIcon className="w-6 h-6 text-[#FF9800]" />
                    </div>
                    <div>
                      <div className="text-white font-bold">AbuseIPDB</div>
                      <div className="text-gray-500 text-xs">IP Reputation</div>
                    </div>
                  </div>

                  {ioc.abuseipdb && typeof ioc.abuseipdb === 'object' && (ioc.abuseipdb.abuse_confidence !== undefined || ioc.abuseipdb.last_fetched_at) ? (
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                        <span className="text-gray-400 text-sm">Confidence</span>
                        <span className={clsx("font-mono font-bold", (ioc.abuseipdb.abuse_confidence || 0) > 50 ? "text-red-400" : "text-green-400")}>
                          {ioc.abuseipdb.abuse_confidence || 0}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-500 text-xs block mb-1">Reports</span>
                          <div className="text-white font-medium text-sm">
                            {ioc.abuseipdb.total_reports || 0}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block mb-1">Country</span>
                          <div className="text-white text-xs truncate">
                            {ioc.abuseipdb.country_code || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {ioc.abuseipdb.isp && (
                        <div>
                          <span className="text-gray-500 text-xs block mb-1">ISP</span>
                          <div className="text-white text-xs truncate bg-black/20 p-1.5 rounded border border-white/5">
                            {ioc.abuseipdb.isp}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      {ioc.type === 'ip' ? 'No AbuseIPDB data available' : 'Only available for IP addresses'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="glass-panel rounded-xl p-6 border border-white/10 animate-fade-in">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-primary" />
                Activity Timeline
              </h3>
              
              <div className="relative pl-4 border-l border-white/10 space-y-8 ml-2">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-green-400 font-bold text-sm">First Observed</span>
                      <span className="text-gray-500 text-xs font-mono">{formatDate(ioc.first_seen)}</span>
                    </div>
                    <p className="text-gray-400 text-sm">Initial detection of this indicator in the system.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-background shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-blue-400 font-bold text-sm">Last Seen</span>
                      <span className="text-gray-500 text-xs font-mono">{formatDate(ioc.last_seen)}</span>
                    </div>
                    <p className="text-gray-400 text-sm">Most recent activity recorded for this indicator.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-purple-500 border-2 border-background shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-purple-400 font-bold text-sm">Last Updated</span>
                      <span className="text-gray-500 text-xs font-mono">{formatDate(ioc.updated_at)}</span>
                    </div>
                    <p className="text-gray-400 text-sm">Metadata or enrichment data was last refreshed.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-panel rounded-xl p-5 border border-white/10">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => copyToClipboard(ioc.value)}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/5 hover:border-white/20 text-sm font-medium"
              >
                <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                Copy Indicator
              </button>
              <Link
                to={`/lookup?indicator=${encodeURIComponent(ioc.value)}`}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/5 hover:border-white/20 text-sm font-medium"
              >
                <MagnifyingGlassIcon className="w-5 h-5 text-green-400" />
                External Lookup
              </Link>
              <Link
                to={`/iocs?q=${encodeURIComponent(ioc.value)}`}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/5 hover:border-white/20 text-sm font-medium"
              >
                <EyeIcon className="w-5 h-5 text-purple-400" />
                Find Related
              </Link>
            </div>
          </div>

          {/* Tags Management */}
          <div className="glass-panel rounded-xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tags</h3>
              <PermissionCheck requireAuth={true}>
                <button
                  onClick={() => setShowAddTagModal(true)}
                  className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
                  title="Add Tag"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </PermissionCheck>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {ioc.tags && ioc.tags.length > 0 ? (
                ioc.tags.map((tag: string) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-sm text-gray-300 group hover:border-white/20 transition-colors"
                  >
                    <HashtagIcon className="w-3 h-3 text-gray-500" />
                    <span>{tag}</span>
                    <PermissionCheck requireAuth={true}>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Tag"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </PermissionCheck>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm italic w-full text-center py-2">No tags assigned</p>
              )}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="glass-panel rounded-xl p-5 border border-white/10 relative overflow-hidden">
            <div className={clsx("absolute inset-0 opacity-5 pointer-events-none", severityInfo.bg)}></div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" />
              Risk Assessment
            </h3>
            
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    className="text-white/5 stroke-current"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    className={clsx("stroke-current transition-all duration-1000 ease-out", getScoreColor(ioc.score))}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={351.86}
                    strokeDashoffset={351.86 - (351.86 * ioc.score) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={clsx("text-3xl font-bold", getScoreColor(ioc.score))}>{ioc.score}</span>
                  <span className="text-[10px] text-gray-500 uppercase">Score</span>
                </div>
              </div>
              
              <div className={clsx("px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border mb-2", severityInfo.bg, severityInfo.color, severityInfo.border)}>
                {ioc.severity} Risk
              </div>
              
              <p className="text-center text-xs text-gray-500 px-4">
                Based on analysis of {ioc.sources?.length || 0} sources and enrichment data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Tag Modal */}
      {showAddTagModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add Tag</h3>
              <button onClick={() => setShowAddTagModal(false)} className="text-gray-500 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Tag Name</label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="e.g. apt29, malware, phishing"
                  className="w-full px-3 py-2 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowAddTagModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-primary text-background font-bold rounded-lg text-sm hover:bg-primary-hover transition-colors"
                >
                  Add Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IOCDetailPage
