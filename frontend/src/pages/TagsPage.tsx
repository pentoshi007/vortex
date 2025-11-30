import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  TagIcon, 
  TrashIcon, 
  PencilIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  HashtagIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { api } from '../api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TagsPage = () => {
  const [isCreating, setIsCreating] = useState(false)
  const [editingTag, setEditingTag] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showStats, setShowStats] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', description: '', color: '#3b82f6' })
  const [sortBy] = useState('name')
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthStore()

  // Predefined neon color palette
  const colorPalette = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#64748b', '#475569', '#374151'
  ]

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags', searchQuery, sortBy],
    queryFn: () => api.tags.list({ q: searchQuery, sort: sortBy }).then(res => res.data),
    retry: 3,
  })

  const { data: tagStats } = useQuery({
    queryKey: ['tags', 'stats'],
    queryFn: () => api.tags.stats().then(res => res.data),
    enabled: showStats,
  })

  const createMutation = useMutation({
    mutationFn: (tag: any) => api.tags.create(tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setIsCreating(false)
      setNewTag({ name: '', description: '', color: '#3b82f6' })
      toast.success('Tag created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tag')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.tags.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setEditingTag(null)
      toast.success('Tag updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tag')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.tags.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Tag deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete tag')
    }
  })

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTag.name.trim()) {
      toast.error('Tag name is required')
      return
    }
    createMutation.mutate(newTag)
  }

  const handleUpdateTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTag.name.trim()) {
      toast.error('Tag name is required')
      return
    }
    updateMutation.mutate({ id: editingTag.id, data: editingTag })
  }

  const handleDeleteTag = (id: string) => {
    if (window.confirm('Are you sure you want to delete this tag?')) {
      deleteMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setNewTag({ name: '', description: '', color: '#3b82f6' })
    setIsCreating(false)
    setEditingTag(null)
  }

  const filteredTags = (Array.isArray(tags) ? tags : tags?.tags || []).filter((tag: any) => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <TagIcon className="w-8 h-8 text-primary" />
            Tags Management
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            Categorize and organize threat intelligence
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-background-lighter border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-full sm:w-64 transition-all group-hover:border-white/20"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2 group-hover:text-primary transition-colors" />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={clsx(
                'px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 border',
                showStats 
                  ? 'bg-primary/20 border-primary text-primary shadow-neon' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              <ChartBarIcon className="w-5 h-5" />
              <span>Stats</span>
            </button>
            
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-background font-bold rounded-lg transition-all shadow-neon hover:shadow-neon-hover flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Tag</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-down">
          <div className="glass-panel rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <HashtagIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">
                  {Array.isArray(tags) ? tags.length : tags?.tags?.length || 0}
                </div>
                <div className="text-gray-400 text-xs uppercase tracking-wider">Total Tags</div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <CheckCircleIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{filteredTags.length}</div>
                <div className="text-gray-400 text-xs uppercase tracking-wider">Visible Tags</div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <TagIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">
                  {Object.keys(tagStats?.tag_usage || {}).length}
                </div>
                <div className="text-gray-400 text-xs uppercase tracking-wider">Active Usage</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingTag) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-lg border border-primary/30 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {isCreating ? <PlusIcon className="w-6 h-6 text-primary" /> : <PencilIcon className="w-6 h-6 text-primary" />}
                {isCreating ? 'Create New Tag' : 'Edit Tag'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={isCreating ? handleCreateTag : handleUpdateTag} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Tag Name</label>
                  <input
                    type="text"
                    value={isCreating ? newTag.name : editingTag.name}
                    onChange={(e) => isCreating 
                      ? setNewTag(prev => ({ ...prev, name: e.target.value }))
                      : setEditingTag((prev: any) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono"
                    placeholder="e.g. malware-apt29"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea
                    value={isCreating ? newTag.description : editingTag.description}
                    onChange={(e) => isCreating 
                      ? setNewTag(prev => ({ ...prev, description: e.target.value }))
                      : setEditingTag((prev: any) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-background-darker border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Tag Color</label>
                  <div className="grid grid-cols-10 gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => isCreating 
                          ? setNewTag(prev => ({ ...prev, color }))
                          : setEditingTag((prev: any) => ({ ...prev, color }))
                        }
                        className={clsx(
                          'w-8 h-8 rounded-lg border-2 transition-all hover:scale-110',
                          (isCreating ? newTag.color : editingTag.color) === color 
                            ? 'border-white shadow-lg scale-110' 
                            : 'border-transparent hover:border-white/50'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <span className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Preview</span>
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-3 py-1 rounded-lg text-sm font-mono font-medium border shadow-sm"
                      style={{ 
                        backgroundColor: `${isCreating ? newTag.color : editingTag.color}20`,
                        color: isCreating ? newTag.color : editingTag.color,
                        borderColor: `${isCreating ? newTag.color : editingTag.color}40`
                      }}
                    >
                      #{(isCreating ? newTag.name : editingTag.name) || 'tag-name'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating ? createMutation.isPending : updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-background font-bold rounded-xl transition-colors shadow-neon hover:shadow-neon-hover"
                >
                  {isCreating 
                    ? (createMutation.isPending ? 'Creating...' : 'Create Tag')
                    : (updateMutation.isPending ? 'Updating...' : 'Save Changes')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tags Grid */}
      <div className="glass-panel rounded-xl p-6 border border-white/10 min-h-[400px]">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/10"></div>
            ))}
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <TagIcon className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Tags Found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchQuery ? `No tags match "${searchQuery}"` : "Get started by creating your first tag to organize threat intelligence."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-6 px-6 py-2 bg-primary hover:bg-primary-hover text-background font-bold rounded-lg transition-colors"
              >
                Create Tag
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTags.map((tag: any) => (
              <div 
                key={tag.id} 
                className="group relative bg-background-darker hover:bg-white/5 border border-white/10 hover:border-primary/30 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: `${tag.color}20` }}
                  >
                    <HashtagIcon className="w-5 h-5" style={{ color: tag.color }} />
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTag(tag)
                        setNewTag({ ...tag }) // Sync state
                      }}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {hasPermission('admin') && (
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1 truncate">#{tag.name}</h3>
                <p className="text-gray-400 text-xs line-clamp-2 mb-4 h-8">
                  {tag.description || 'No description provided'}
                </p>
                
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ClockIcon className="w-3 h-3" />
                    {new Date(tag.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: tag.color }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                    {tagStats?.tag_usage?.[tag.name] || 0} IOCs
                  </div>
                </div>
                
                {/* Hover Glow */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                  style={{ backgroundColor: tag.color }}
                ></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TagsPage
