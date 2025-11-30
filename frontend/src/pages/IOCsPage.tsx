import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TagIcon,
  EyeIcon,
  XMarkIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  TrophyIcon,
  ShieldCheckIcon,
  FireIcon,
  ChartBarIcon,
  GlobeAltIcon,
  LinkIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  CpuChipIcon,
  ListBulletIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import { api } from '../api'
import { useAuthStore } from '../stores/authStore'
import PermissionCheck from '../components/PermissionCheck'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const IOCsPage = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    severity: '',
    tags: '',
    threat_category: '',
    malware_family: '',
    score_min: '',
    score_max: '',
    vt_positives_min: '',
    has_vt_data: '',
    has_abuseipdb_data: '',
    from: '',
    to: '',
  })

  // Handle URL parameters from dashboard navigation
  useEffect(() => {
    const urlFilters = {
      q: searchParams.get('q') || '',
      type: searchParams.get('type') || '',
      severity: searchParams.get('severity') || '', 
      tags: searchParams.get('tags') || '',
      threat_category: searchParams.get('threat_category') || '',
      malware_family: searchParams.get('malware_family') || '',
      score_min: searchParams.get('score_min') || '',
      score_max: searchParams.get('score_max') || '',
      vt_positives_min: searchParams.get('vt_positives_min') || '',
      has_vt_data: searchParams.get('has_vt_data') || '',
      has_abuseipdb_data: searchParams.get('has_abuseipdb_data') || '',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
    }
    
    // Only update if there are actual URL params and they differ from current state
    if (Object.values(urlFilters).some(v => v !== '')) {
      setFilters(prev => {
        const isDifferent = Object.keys(urlFilters).some(key => urlFilters[key as keyof typeof urlFilters] !== prev[key as keyof typeof prev])
        if (isDifferent) {
          return { ...prev, ...urlFilters }
        }
        return prev
      })
    }
  }, [searchParams])

  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 24,
  })
  const [selectedIOCs, setSelectedIOCs] = useState<string[]>([])
  const [showTagModal, setShowTagModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch IOCs
  const { data: iocsData, isLoading } = useQuery({
    queryKey: ['iocs', filters, pagination],
    queryFn: () => api.iocs.list({ ...filters, ...pagination }).then(res => res.data),
    keepPreviousData: true
  })

  // Tag IOCs mutation
  const tagIOCsMutation = useMutation({
    mutationFn: (data: { ioc_ids: string[], tags: string[] }) => 
      api.iocs.bulkTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iocs'] })
      setSelectedIOCs([])
      setShowTagModal(false)
      setNewTag('')
      toast.success(`Successfully tagged ${selectedIOCs.length} IOCs with "${newTag}"`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to tag IOCs'
      toast.error(message)
    }
  })

  // Export mutation  
  const exportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }
      
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `iocs_export_${new Date().toISOString().slice(0, 10)}.${data.format}`
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      return { success: true }
    },
    onSuccess: () => {
      setShowExportModal(false)
      toast.success('Export downloaded successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to export data')
    }
  })

  const severityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    low: 'text-green-400 bg-green-500/10 border-green-500/20',
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  }

  const typeIcons = {
    ip: GlobeAltIcon,
    domain: LinkIcon,
    url: DocumentTextIcon,
    sha256: ShieldCheckIcon,
    md5: ShieldCheckIcon,
    sha1: ShieldCheckIcon,
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
    
    // Update URL params
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    setSearchParams(params)
  }

  const handleSelectIOC = (iocId: string) => {
    setSelectedIOCs(prev =>
      prev.includes(iocId)
        ? prev.filter(id => id !== iocId)
        : [...prev, iocId]
    )
  }

  const handleSelectAll = () => {
    if (selectedIOCs.length === iocsData?.iocs?.length) {
      setSelectedIOCs([])
    } else {
      setSelectedIOCs(iocsData?.iocs?.map((ioc: any) => ioc.id) || [])
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleTagIOCs = () => {
    if (selectedIOCs.length === 0) {
      toast.error('Please select IOCs to tag')
      return
    }
    setShowTagModal(true)
  }

  const handleExport = () => {
    setShowExportModal(true)
  }

  const submitTagging = () => {
    if (!newTag.trim()) {
      toast.error('Please enter a tag name')
      return
    }
    
    tagIOCsMutation.mutate({
      ioc_ids: selectedIOCs,
      tags: [newTag.trim()]
    })
  }

  const submitExport = () => {
    const exportData = {
      format: exportFormat,
      filters: {
        q: filters.q || '',
        type: filters.type || '',
        severity: filters.severity || '',
        tags: filters.tags || '',
        from: filters.from || '',
        to: filters.to || '',
      }
    }
    exportMutation.mutate(exportData)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <CpuChipIcon className="w-8 h-8 text-primary animate-pulse-slow" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Intelligence Database
            </span>
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            Total Indicators: <span className="text-primary">{iocsData?.total || 0}</span> | Active Filters: <span className="text-white">{Object.values(filters).filter(Boolean).length}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <PermissionCheck 
            requireAuth={true}
            fallback={
              <Link to="/login" className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium">
                Login to Manage
              </Link>
            }
          >
            <div className="flex items-center gap-3">
              <PermissionCheck permission="export">
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 glass-panel hover:bg-white/5 text-white rounded-lg transition-all border border-white/10 hover:border-primary/30 flex items-center gap-2 text-sm font-medium"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </PermissionCheck>
              
              <Link
                to="/tags"
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <TagIcon className="w-4 h-4" />
                <span>Manage Tags</span>
              </Link>
            </div>
          </PermissionCheck>
        </div>
      </div>

      {/* Main Controls & Filters */}
      <div className="glass-panel rounded-xl p-4 border border-white/10">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative group">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search indicators, hashes, IPs..."
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-darker border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
            />
          </div>

          {/* Filter Toggles */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2.5 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="">All Types</option>
              <option value="ip">IP Address</option>
              <option value="domain">Domain</option>
              <option value="url">URL</option>
              <option value="sha256">SHA256</option>
              <option value="md5">MD5</option>
            </select>

            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="px-3 py-2.5 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "px-3 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap",
                showFilters 
                  ? "bg-primary/20 border-primary/50 text-primary" 
                  : "bg-background-darker border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              )}
            >
              <FunnelIcon className="w-4 h-4" />
              More Filters
            </button>

            <div className="h-8 w-px bg-white/10 mx-1"></div>

            <div className="flex items-center bg-background-darker rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('cards')}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                )}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'table' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                )}
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-down">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Threat Category</label>
              <select
                value={filters.threat_category}
                onChange={(e) => handleFilterChange('threat_category', e.target.value)}
                className="w-full px-3 py-2 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="">Any Category</option>
                <option value="malware">Malware</option>
                <option value="phishing">Phishing</option>
                <option value="botnet">Botnet</option>
                <option value="ransomware">Ransomware</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Min Threat Score</label>
              <input
                type="number"
                value={filters.score_min}
                onChange={(e) => handleFilterChange('score_min', e.target.value)}
                placeholder="e.g. 70"
                className="w-full px-3 py-2 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Tags</label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                placeholder="e.g. apt29, cobalt-strike"
                className="w-full px-3 py-2 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Date Range</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                className="w-full px-3 py-2 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        )}

        {/* Active Filters Chips */}
        {Object.entries(filters).some(([k, v]) => v && k !== 'q') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value || key === 'q') return null
              return (
                <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs border border-primary/20">
                  <span className="opacity-70 uppercase">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-medium">{value}</span>
                  <button onClick={() => handleFilterChange(key, '')} className="hover:text-white ml-1">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
            <button 
              onClick={() => {
                setFilters({
                  q: filters.q, type: '', severity: '', tags: '', threat_category: '', 
                  malware_family: '', score_min: '', score_max: '', vt_positives_min: '', 
                  has_vt_data: '', has_abuseipdb_data: '', from: '', to: ''
                })
                setSearchParams(new URLSearchParams({ q: filters.q }))
              }}
              className="text-xs text-gray-500 hover:text-white underline"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Quick Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Critical', value: 'severity:critical', color: 'border-red-500/30 text-red-400 hover:bg-red-500/10' },
          { label: 'Malware', value: 'threat_category:malware', color: 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10' },
          { label: 'Phishing', value: 'threat_category:phishing', color: 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' },
          { label: 'Ransomware', value: 'threat_category:ransomware', color: 'border-pink-500/30 text-pink-400 hover:bg-pink-500/10' },
          { label: 'Botnet', value: 'threat_category:botnet', color: 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10' },
          { label: 'High Score', value: 'score_min:80', color: 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' },
          { label: 'Recent', value: 'from:' + new Date(Date.now() - 86400000).toISOString().split('T')[0], color: 'border-green-500/30 text-green-400 hover:bg-green-500/10' },
          { label: 'VT Detected', value: 'vt_positives_min:1', color: 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' },
        ].map((cat) => (
          <button
            key={cat.label}
            onClick={() => {
              const [key, val] = cat.value.split(':')
              handleFilterChange(key, val)
            }}
            className={clsx(
              "px-3 py-2 rounded-lg border bg-background-darker/50 text-xs font-medium transition-all hover:scale-105",
              cat.color
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results Area */}
      <div className="space-y-4">
        {/* Bulk Actions Bar */}
        {user && selectedIOCs.length > 0 && (
          <div className="glass-panel p-3 rounded-lg flex items-center justify-between animate-fade-in-up sticky top-4 z-20 border border-primary/30 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
            <div className="flex items-center gap-3">
              <span className="bg-primary text-background font-bold px-2 py-0.5 rounded text-sm">
                {selectedIOCs.length} Selected
              </span>
              <span className="text-sm text-gray-400">Actions:</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleTagIOCs}
                className="px-3 py-1.5 bg-background-darker hover:bg-white/10 text-white rounded-md text-sm transition-colors flex items-center gap-2 border border-white/10"
              >
                <TagIcon className="w-4 h-4" />
                Tag
              </button>
              <PermissionCheck permission="export">
                <button 
                  onClick={handleExport}
                  className="px-3 py-1.5 bg-background-darker hover:bg-white/10 text-white rounded-md text-sm transition-colors flex items-center gap-2 border border-white/10"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export
                </button>
              </PermissionCheck>
              <button 
                onClick={() => setSelectedIOCs([])}
                className="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="glass-panel h-48 rounded-xl"></div>
            ))}
          </div>
        ) : iocsData?.iocs?.length === 0 ? (
          <div className="glass-panel rounded-xl p-12 text-center border border-white/10">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Indicators Found</h3>
            <p className="text-gray-400">Try adjusting your filters or search query.</p>
            <button 
              onClick={() => {
                setFilters({
                  q: '', type: '', severity: '', tags: '', threat_category: '', 
                  malware_family: '', score_min: '', score_max: '', vt_positives_min: '', 
                  has_vt_data: '', has_abuseipdb_data: '', from: '', to: ''
                })
                setSearchParams(new URLSearchParams())
              }}
              className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {iocsData?.iocs?.map((ioc: any) => {
              const IconComponent = typeIcons[ioc.type as keyof typeof typeIcons] || DocumentTextIcon
              const isSelected = selectedIOCs.includes(ioc.id)
              
              return (
                <div 
                  key={ioc.id} 
                  className={clsx(
                    "glass-panel rounded-xl p-4 transition-all duration-200 group relative border",
                    isSelected ? "border-primary bg-primary/5" : "border-white/5 hover:border-white/20 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {user && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectIOC(ioc.id)
                          }}
                          className={clsx(
                            "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors",
                            isSelected ? "bg-primary border-primary" : "border-white/20 bg-black/20 hover:border-white/40"
                          )}
                        >
                          {isSelected && <div className="w-2 h-2 bg-black rounded-sm" />}
                        </div>
                      )}
                      <div className={clsx("p-2 rounded-lg", severityColors[ioc.severity as keyof typeof severityColors]?.split(' ')[1] || 'bg-gray-500/20')}>
                        <IconComponent className={clsx("w-5 h-5", severityColors[ioc.severity as keyof typeof severityColors]?.split(' ')[0] || 'text-gray-400')} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={clsx("text-lg font-bold", ioc.score >= 70 ? "text-red-400" : ioc.score >= 40 ? "text-yellow-400" : "text-green-400")}>
                        {ioc.score}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Score</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Link to={`/iocs/${ioc.id}`} className="block group-hover:text-primary transition-colors">
                      <div className="font-mono text-sm text-white break-all line-clamp-2 bg-black/30 p-2 rounded border border-white/5">
                        {ioc.value}
                      </div>
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3 h-12 overflow-hidden content-start">
                    {ioc.tags?.slice(0, 4).map((tag: string) => (
                      <span 
                        key={tag}
                        onClick={() => handleFilterChange('tags', tag)}
                        className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded text-[10px] cursor-pointer border border-white/5 transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                    {ioc.tags?.length > 4 && (
                      <span className="px-1.5 py-0.5 text-gray-500 text-[10px]">+{ioc.tags.length - 4}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-gray-500">
                    <span>{formatDate(ioc.created_at)}</span>
                    <div className="flex gap-2">
                      {ioc.vt?.positives > 0 && (
                        <span className="text-red-400 flex items-center gap-1" title={`VT Detections: ${ioc.vt.positives}`}>
                          <ShieldCheckIcon className="w-3 h-3" /> {ioc.vt.positives}
                        </span>
                      )}
                      <Link to={`/iocs/${ioc.id}`} className="hover:text-white flex items-center gap-1">
                        Details <EyeIcon className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-gray-400 font-medium uppercase tracking-wider text-xs">
                  <tr>
                    <th className="p-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedIOCs.length === iocsData?.iocs?.length && iocsData?.iocs?.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-white/20 bg-black/20 text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="p-4">Indicator</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Severity</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Tags</th>
                    <th className="p-4">Seen</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {iocsData?.iocs?.map((ioc: any) => (
                    <tr key={ioc.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <input 
                          type="checkbox"
                          checked={selectedIOCs.includes(ioc.id)}
                          onChange={() => handleSelectIOC(ioc.id)}
                          className="rounded border-white/20 bg-black/20 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="p-4">
                        <Link to={`/iocs/${ioc.id}`} className="font-mono text-white hover:text-primary transition-colors">
                          {ioc.value}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className="uppercase text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded">
                          {ioc.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={clsx(
                          "px-2 py-1 rounded text-xs font-medium capitalize",
                          severityColors[ioc.severity as keyof typeof severityColors]?.split(' ').slice(0, 2).join(' ')
                        )}>
                          {ioc.severity}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={clsx(
                          "font-bold",
                          ioc.score >= 70 ? "text-red-400" : ioc.score >= 40 ? "text-yellow-400" : "text-green-400"
                        )}>
                          {ioc.score}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {ioc.tags?.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-gray-400">
                              #{tag}
                            </span>
                          ))}
                          {ioc.tags?.length > 2 && (
                            <span className="text-[10px] text-gray-500">+{ioc.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {formatDate(ioc.created_at)}
                      </td>
                      <td className="p-4 text-right">
                        <Link to={`/iocs/${ioc.id}`} className="text-gray-500 hover:text-white p-2">
                          <EyeIcon className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            Showing <span className="text-white">{((pagination.page - 1) * pagination.per_page) + 1}</span> to <span className="text-white">{Math.min(pagination.page * pagination.per_page, iocsData?.total || 0)}</span> of <span className="text-white">{iocsData?.total || 0}</span> results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 glass-panel rounded-lg text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!iocsData?.has_more}
              className="px-3 py-1.5 glass-panel rounded-lg text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Tag Selected IOCs</h3>
              <button onClick={() => setShowTagModal(false)} className="text-gray-500 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Adding tags to {selectedIOCs.length} selected indicators.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Tag Name</label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="e.g. campaign-2023"
                  className="w-full px-3 py-2 bg-background-darker border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitTagging}
                  className="px-4 py-2 bg-primary text-background font-bold rounded-lg text-sm hover:bg-primary-hover transition-colors"
                >
                  Add Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Export Data</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-500 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {['csv', 'json', 'stix'].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-sm font-medium border transition-all uppercase",
                        exportFormat === fmt 
                          ? "bg-primary/20 border-primary text-primary" 
                          : "bg-background-darker border-white/10 text-gray-400 hover:border-white/30"
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-400">
                <p>Export will include current filters:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {filters.q && <li>Search: {filters.q}</li>}
                  {filters.type && <li>Type: {filters.type}</li>}
                  {filters.severity && <li>Severity: {filters.severity}</li>}
                  {filters.tags && <li>Tags: {filters.tags}</li>}
                  {!filters.q && !filters.type && !filters.severity && !filters.tags && <li>All records (limited by backend)</li>}
                </ul>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitExport}
                  className="px-4 py-2 bg-primary text-background font-bold rounded-lg text-sm hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IOCsPage
