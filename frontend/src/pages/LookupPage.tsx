import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ClockIcon,
  TagIcon,
  LinkIcon,
  EyeIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { api } from '../api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface LookupResult {
  lookup_id: string
  ioc: {
    id: string
    type: string
    value: string
    sources: Array<{
      name: string
      first_seen: string
      last_seen: string
      ref: string
    }>
    score: number
    severity: string
    vt?: {
      last_fetched_at: string
      positives: number
      total: number
      categories: string[]
      reputation: number
      title: string
      final_url: string | null
      permalink: string
      last_analysis_stats: {
        malicious: number
        suspicious: number
        undetected: number
        harmless: number
        timeout: number
      }
    }
    abuseipdb?: {
      abuse_confidence: number
      country_code: string
      usage_type: string
      isp: string
      domain: string
      total_reports: number
      num_distinct_users: number
    }
    tags: string[]
    first_seen: string
    last_seen: string
    created_at: string
    updated_at: string
  }
  status: string
  error: string | null
}

const LookupPage = () => {
  const [indicator, setIndicator] = useState('')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showRawData, setShowRawData] = useState(false)

  // Fetch available tags for tagging
  const { data: availableTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list().then(res => res.data)
  })

  const lookupMutation = useMutation({
    mutationFn: (indicator: string) => api.lookup.perform(indicator),
    onSuccess: (response) => {
      setResult(response.data)
      setSelectedTags([]) // Reset selected tags
      toast.success('Threat intelligence lookup completed')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lookup failed')
    },
  })

  // Tag IOC mutation
  const tagMutation = useMutation({
    mutationFn: ({ iocId, tags }: { iocId: string, tags: string[] }) => 
      api.iocs.bulkTag({ ioc_ids: [iocId], tag_names: tags }),
    onSuccess: () => {
      toast.success('Tags applied successfully')
      // Refresh the lookup result to show updated tags
      if (result) {
        lookupMutation.mutate(indicator)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to apply tags')
    }
  })

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (indicator.trim()) {
      setResult(null) // Clear previous results
      lookupMutation.mutate(indicator.trim())
    }
  }

  const handleApplyTags = () => {
    if (result && selectedTags.length > 0) {
      tagMutation.mutate({ iocId: result.ioc.id, tags: selectedTags })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'low':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <ExclamationCircleIcon className="w-5 h-5" />
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5" />
      case 'medium':
        return <InformationCircleIcon className="w-5 h-5" />
      case 'low':
        return <CheckCircleIcon className="w-5 h-5" />
      default:
        return <InformationCircleIcon className="w-5 h-5" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'url':
        return <LinkIcon className="w-5 h-5" />
      case 'domain':
        return <GlobeAltIcon className="w-5 h-5" />
      case 'ip':
        return <ServerIcon className="w-5 h-5" />
      case 'hash':
        return <DocumentTextIcon className="w-5 h-5" />
      default:
        return <EyeIcon className="w-5 h-5" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getVTScoreColor = (malicious: number, total: number) => {
    const ratio = malicious / total
    if (ratio >= 0.7) return 'text-red-400'
    if (ratio >= 0.4) return 'text-orange-400'
    if (ratio >= 0.1) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BoltIcon className="w-8 h-8 text-primary" />
            Intelligence Lookup
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            Deep analysis and enrichment for Indicators of Compromise
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="glass-panel rounded-xl p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30"></div>
        
        <form onSubmit={handleLookup} className="max-w-3xl mx-auto space-y-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={indicator}
                onChange={(e) => setIndicator(e.target.value)}
                placeholder="Enter IP, Domain, URL, or Hash..."
                className="w-full pl-12 pr-4 py-4 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono text-lg shadow-xl transition-all"
              />
              <MagnifyingGlassIcon className="absolute left-4 w-6 h-6 text-gray-500 group-focus-within:text-primary transition-colors" />
              
              <button
                type="submit"
                disabled={lookupMutation.isPending || !indicator.trim()}
                className="absolute right-2 px-6 py-2 bg-primary hover:bg-primary-hover text-background font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {lookupMutation.isPending ? (
                  <>
                    <ClockIcon className="w-5 h-5 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <BoltIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-center gap-4 text-xs text-gray-500 font-mono">
            <span>IPv4/IPv6</span>
            <span>•</span>
            <span>DOMAINS</span>
            <span>•</span>
            <span>URLS</span>
            <span>•</span>
            <span>HASHES (MD5/SHA)</span>
          </div>
        </form>
      </div>

      {/* Enhanced Results Display */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Threat Overview */}
          <div className="glass-panel rounded-xl p-6 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className={clsx("p-3 rounded-xl bg-opacity-10 border", getSeverityColor(result.ioc.severity))}>
                  {getTypeIcon(result.ioc.type)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    Threat Analysis Report
                    <span className={clsx(
                      'px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider',
                      getSeverityColor(result.ioc.severity)
                    )}>
                      {result.ioc.severity} Risk
                    </span>
                  </h2>
                  <p className="text-gray-400 text-sm mt-1 font-mono">{result.ioc.value}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-lg transition-colors border border-white/10 flex items-center gap-2"
                >
                  <CodeBracketIcon className="w-4 h-4" />
                  {showRawData ? 'Hide JSON' : 'View JSON'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-background-darker rounded-xl p-4 border border-white/5">
                    <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">First Seen</span>
                    <div className="text-white font-mono text-sm">{formatDate(result.ioc.first_seen)}</div>
                  </div>
                  <div className="bg-background-darker rounded-xl p-4 border border-white/5">
                    <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Last Seen</span>
                    <div className="text-white font-mono text-sm">{formatDate(result.ioc.last_seen)}</div>
                  </div>
                </div>

                {/* Tags */}
                <div className="bg-background-darker rounded-xl p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <TagIcon className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-semibold">Threat Classification</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {result.ioc.tags.length > 0 ? (
                      result.ioc.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 rounded-lg text-xs font-mono bg-white/5 text-gray-300 border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-sm">No tags assigned</span>
                    )}
                  </div>

                  {/* Tag Management */}
                  {availableTags && availableTags.length > 0 && (
                    <div className="border-t border-white/5 pt-4">
                      <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Add Tags</h4>
                      <div className="flex flex-wrap gap-2 mb-4 max-h-32 overflow-y-auto custom-scrollbar">
                        {Array.isArray(availableTags) ? availableTags.filter((tag: any) => 
                          !result.ioc.tags.includes(tag.name)
                        ).map((tag: any) => (
                          <label key={tag.id} className="cursor-pointer group">
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={selectedTags.includes(tag.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTags([...selectedTags, tag.name])
                                } else {
                                  setSelectedTags(selectedTags.filter(t => t !== tag.name))
                                }
                              }}
                            />
                            <span 
                              className={clsx(
                                "px-2 py-1 rounded text-xs border transition-all inline-block",
                                selectedTags.includes(tag.name) 
                                  ? "bg-primary/20 border-primary text-primary" 
                                  : "bg-white/5 border-white/10 text-gray-400 group-hover:border-white/20 group-hover:text-gray-300"
                              )}
                            >
                              {tag.name}
                            </span>
                          </label>
                        )) : null}
                      </div>
                      
                      {selectedTags.length > 0 && (
                        <button
                          onClick={handleApplyTags}
                          disabled={tagMutation.isPending}
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium w-full sm:w-auto"
                        >
                          {tagMutation.isPending ? 'Applying...' : `Apply ${selectedTags.length} Tags`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Score & Sources */}
              <div className="space-y-6">
                {/* Threat Score */}
                <div className="bg-background-darker rounded-xl p-6 border border-white/5 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ChartBarIcon className="w-24 h-24" />
                  </div>
                  <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4 relative z-10">Threat Score</h3>
                  <div className="relative z-10 inline-flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        className="text-white/5"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className={clsx(
                          result.ioc.score >= 70 ? 'text-red-500' :
                          result.ioc.score >= 40 ? 'text-orange-500' :
                          result.ioc.score >= 20 ? 'text-yellow-500' : 'text-green-500'
                        )}
                        strokeWidth="8"
                        strokeDasharray={365}
                        strokeDashoffset={365 - (365 * result.ioc.score) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <span className="text-3xl font-bold text-white block">{result.ioc.score}</span>
                    </div>
                  </div>
                </div>

                {/* Sources */}
                <div className="bg-background-darker rounded-xl p-6 border border-white/5">
                  <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Intelligence Sources</h3>
                  <div className="space-y-3">
                    {result.ioc.sources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                        <span className="text-white text-sm capitalize">{source.name}</span>
                        <a 
                          href={source.ref} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-hover transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* External Intelligence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VirusTotal */}
            {result.ioc.vt && (
              <div className="glass-panel rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">VirusTotal Analysis</h3>
                  </div>
                  <a 
                    href={result.ioc.vt.permalink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                  </a>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-background-darker rounded-xl border border-white/5">
                    <span className="text-gray-400 text-sm">Detection Ratio</span>
                    <div className="text-right">
                      <div className={clsx(
                        'text-xl font-bold',
                        getVTScoreColor(result.ioc.vt.positives, result.ioc.vt.total)
                      )}>
                        {result.ioc.vt.positives} / {result.ioc.vt.total}
                      </div>
                      <div className="text-xs text-gray-500">Security Vendors</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                      <div className="text-red-400 font-bold text-lg">{result.ioc.vt.last_analysis_stats.malicious}</div>
                      <div className="text-red-400/70 text-xs uppercase tracking-wider">Malicious</div>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                      <div className="text-orange-400 font-bold text-lg">{result.ioc.vt.last_analysis_stats.suspicious}</div>
                      <div className="text-orange-400/70 text-xs uppercase tracking-wider">Suspicious</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                      <div className="text-green-400 font-bold text-lg">{result.ioc.vt.last_analysis_stats.harmless}</div>
                      <div className="text-green-400/70 text-xs uppercase tracking-wider">Harmless</div>
                    </div>
                    <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 text-center">
                      <div className="text-gray-400 font-bold text-lg">{result.ioc.vt.last_analysis_stats.undetected}</div>
                      <div className="text-gray-400/70 text-xs uppercase tracking-wider">Undetected</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AbuseIPDB */}
            {result.ioc.abuseipdb && Object.keys(result.ioc.abuseipdb).length > 0 && (
              <div className="glass-panel rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <ExclamationTriangleIcon className="w-6 h-6 text-orange-400" />
                  <h3 className="text-lg font-semibold text-white">AbuseIPDB Intelligence</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-background-darker rounded-xl p-4 border border-white/5 col-span-full">
                    <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Abuse Confidence</span>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-orange-400">{result.ioc.abuseipdb.abuse_confidence}%</span>
                      <span className="text-gray-400 text-sm mb-1">confidence score</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 mt-3">
                      <div 
                        className="bg-orange-400 h-1.5 rounded-full" 
                        style={{ width: `${result.ioc.abuseipdb.abuse_confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-background-darker rounded-xl p-4 border border-white/5">
                    <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">ISP / Organization</span>
                    <div className="text-white text-sm font-medium truncate" title={result.ioc.abuseipdb.isp}>
                      {result.ioc.abuseipdb.isp}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">{result.ioc.abuseipdb.domain}</div>
                  </div>

                  <div className="bg-background-darker rounded-xl p-4 border border-white/5">
                    <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Location & Usage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{result.ioc.abuseipdb.country_code}</span>
                      <span className="text-gray-400 text-xs">•</span>
                      <span className="text-white text-sm font-medium">{result.ioc.abuseipdb.usage_type}</span>
                    </div>
                  </div>

                  <div className="bg-background-darker rounded-xl p-4 border border-white/5 col-span-full">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Total Reports</span>
                        <div className="text-white text-lg font-bold">{result.ioc.abuseipdb.total_reports}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Distinct Users</span>
                        <div className="text-white text-lg font-bold">{result.ioc.abuseipdb.num_distinct_users}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Raw Data Toggle */}
          {showRawData && (
            <div className="glass-panel rounded-xl p-6 border border-white/10 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CodeBracketIcon className="w-5 h-5 text-gray-400" />
                Raw API Response
              </h3>
              <div className="bg-black/50 rounded-xl p-4 overflow-auto max-h-96 border border-white/5 custom-scrollbar">
                <pre className="text-green-400/80 text-xs font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LookupPage