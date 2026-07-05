import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Search, ArrowLeft, Calendar, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGameStore } from '../lib/store';
import { memoryApi } from '../lib/api';

interface Memory {
  id: string;
  type: string;
  content: any;
  timestamp: string;
  playerId: string;
  caseId?: string;
  npcId?: string;
  importance: number;
  tags: string[];
  updatedAt?: string;
}

export default function MemoryDashboard() {
  const navigate = useNavigate();
  const { player } = useGameStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editImportance, setEditImportance] = useState(5);

  useEffect(() => {
    if (player) {
      loadMemories();
    }
  }, [player]);

  useEffect(() => {
    applyFilters();
  }, [memories, searchQuery, filterType]);

  const loadMemories = async () => {
    if (!player) return;

    setLoading(true);
    try {
      const response = await memoryApi.recall({
        playerId: player.id,
        limit: 100,
      });
      setMemories(response.data.data || []);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = memories;

    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        JSON.stringify(m.content).toLowerCase().includes(query) ||
        m.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    setFilteredMemories(filtered);
  };

  const handleEditMemory = (memory: Memory) => {
    setSelectedMemory(memory);
    setEditContent(JSON.stringify(memory.content, null, 2));
    setEditTags(memory.tags.join(', '));
    setEditImportance(memory.importance);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMemory) return;

    try {
      await memoryApi.memify(selectedMemory.id, {
        content: JSON.parse(editContent),
        tags: editTags.split(',').map(t => t.trim()).filter(t => t),
        importance: editImportance,
      });

      await loadMemories();
      setShowEditModal(false);
      setSelectedMemory(null);
    } catch (error) {
      console.error('Failed to update memory:', error);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      await memoryApi.forget(memoryId);
      await loadMemories();
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const getMemoryTypeColor = (type: string): string => {
    switch (type) {
      case 'conversation': return 'bg-blue-500/20 text-blue-400';
      case 'clue': return 'bg-green-500/20 text-green-400';
      case 'evidence': return 'bg-purple-500/20 text-purple-400';
      case 'relationship': return 'bg-pink-500/20 text-pink-400';
      case 'behavior': return 'bg-yellow-500/20 text-yellow-400';
      case 'case': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getImportanceColor = (importance: number): string => {
    if (importance >= 8) return 'text-red-400';
    if (importance >= 6) return 'text-orange-400';
    if (importance >= 4) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-textMuted">Please log in first</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="glass-button p-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
                <Brain className="w-10 h-10" />
                Memory Dashboard
              </h1>
              <p className="text-textMuted">View and manage your detective memories</p>
            </div>
          </div>
          <div className="text-sm text-textMuted">
            {memories.length} memories stored
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-7xl mx-auto mb-6"
      >
        <div className="glass-card p-4 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="glass-input w-full pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="glass-input"
          >
            <option value="all">All Types</option>
            <option value="conversation">Conversations</option>
            <option value="clue">Clues</option>
            <option value="evidence">Evidence</option>
            <option value="relationship">Relationships</option>
            <option value="behavior">Behaviors</option>
            <option value="case">Cases</option>
          </select>
        </div>
      </motion.div>

      {/* Memories Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-7xl mx-auto"
      >
        {loading ? (
          <div className="text-center py-12">
            <div className="text-textMuted">Loading memories...</div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-textMuted" />
            <p className="text-textMuted">
              {memories.length === 0 ? 'No memories yet. Start investigating to build your memory!' : 'No memories match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemories.map((memory, index) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="glass-card p-4 hover:scale-105 transition-transform cursor-pointer"
                onClick={() => handleEditMemory(memory)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('px-2 py-1 rounded text-xs', getMemoryTypeColor(memory.type))}>
                    {memory.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs', getImportanceColor(memory.importance))}>
                      {'★'.repeat(Math.ceil(memory.importance / 2))}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <pre className="text-sm text-textMuted whitespace-pre-wrap break-words max-h-32 overflow-hidden">
                    {typeof memory.content === 'object' 
                      ? JSON.stringify(memory.content, null, 2).substring(0, 200) + '...'
                      : String(memory.content).substring(0, 200) + '...'
                    }
                  </pre>
                </div>

                <div className="flex items-center justify-between text-xs text-textMuted">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(memory.timestamp).toLocaleDateString()}
                  </div>
                  {memory.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {memory.tags.length}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Edit Modal */}
      {showEditModal && selectedMemory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto"
          >
            <h2 className="text-2xl font-semibold mb-4">Edit Memory</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-textMuted mb-2">Content (JSON)</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="glass-input w-full h-48 font-mono text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-textMuted mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="e.g., conversation, suspect, important"
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-textMuted mb-2">Importance (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editImportance}
                  onChange={(e) => setEditImportance(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-textMuted mt-1">
                  <span>Low</span>
                  <span className={getImportanceColor(editImportance)}>{editImportance}</span>
                  <span>Critical</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMemory(null);
                }}
                className="glass-button flex-1 bg-surfaceLight/50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMemory(selectedMemory.id)}
                className="glass-button flex-1 bg-danger/20 text-danger"
              >
                Delete
              </button>
              <button
                onClick={handleSaveEdit}
                className="glass-button flex-1"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
