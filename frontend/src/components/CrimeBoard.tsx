import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Network, Trash2, Link as LinkIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface BoardItem {
  id: string;
  type: 'clue' | 'suspect' | 'evidence';
  name: string;
  description: string;
  color: string;
}

interface CrimeBoardProps {
  clues: any[];
  suspects: any[];
  evidence: any[];
  connections: any[];
  onAddConnection: (from: string, to: string, description: string) => void;
  onRemoveConnection: (id: string) => void;
}

function SortableItem({ item, onSelect }: { item: BoardItem; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'glass-card p-4 cursor-move',
        isDragging && 'opacity-50 scale-105'
      )}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(item.id)}
      role="button"
      tabIndex={0}
      aria-label={`${item.type}: ${item.name}`}
      aria-pressed={false}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item.id);
        }
      }}
    >
      <div className={cn('w-3 h-3 rounded-full mb-2', item.color)} aria-hidden="true" />
      <h4 className="font-semibold mb-1">{item.name}</h4>
      <p className="text-sm text-textMuted">{item.description}</p>
    </div>
  );
}

export default function CrimeBoard({
  clues,
  suspects,
  evidence,
  connections,
  onAddConnection,
  onRemoveConnection,
}: CrimeBoardProps) {
  const [items, setItems] = useState<BoardItem[]>([
    ...clues.map(c => ({
      id: c.id,
      type: 'clue' as const,
      name: c.name,
      description: c.description,
      color: 'bg-blue-500',
    })),
    ...suspects.map(s => ({
      id: s.id,
      type: 'suspect' as const,
      name: s.name,
      description: s.occupation,
      color: 'bg-red-500',
    })),
    ...evidence.map(e => ({
      id: e.id,
      type: 'evidence' as const,
      name: e.name,
      description: e.description,
      color: 'bg-green-500',
    })),
  ]);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionDescription, setConnectionDescription] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && String(active.id) !== String(over.id)) {
      setItems(items => {
        const oldIndex = items.findIndex(item => item.id === String(active.id));
        const newIndex = items.findIndex(item => item.id === String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }, []);

  const handleCreateConnection = () => {
    if (selectedItems.length === 2 && connectionDescription.trim()) {
      onAddConnection(selectedItems[0], selectedItems[1], connectionDescription);
      setSelectedItems([]);
      setConnectionDescription('');
      setShowConnectionModal(false);
    }
  };

  const selectedItem1 = items.find(i => i.id === selectedItems[0]);
  const selectedItem2 = items.find(i => i.id === selectedItems[1]);

  return (
    <div className="h-full flex flex-col" role="region" aria-label="Crime board">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold" id="crime-board-title">Crime Board</h2>
        <button
          onClick={() => setShowConnectionModal(true)}
          disabled={selectedItems.length !== 2}
          className={cn(
            'glass-button flex items-center gap-2',
            selectedItems.length !== 2 && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Connect selected items"
          aria-disabled={selectedItems.length !== 2}
        >
          <LinkIcon className="w-4 h-4" aria-hidden="true" />
          Connect Selected
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-auto">
            {/* Clues Column */}
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-400 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Clues
              </h3>
              {items.filter(i => i.type === 'clue').map(item => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>

            {/* Suspects Column */}
            <div className="space-y-3">
              <h3 className="font-semibold text-red-400 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Suspects
              </h3>
              {items.filter(i => i.type === 'suspect').map(item => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>

            {/* Evidence Column */}
            <div className="space-y-3">
              <h3 className="font-semibold text-green-400 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Evidence
              </h3>
              {items.filter(i => i.type === 'evidence').map(item => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="glass-card p-4 opacity-90">
              {items.find(i => i.id === activeId)?.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Connections Display */}
      <div className="mt-6 border-t border-border pt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Network className="w-4 h-4" />
          Connections ({connections.length})
        </h3>
        {connections.length === 0 ? (
          <p className="text-textMuted text-sm">No connections yet. Select two items to connect them.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-auto custom-scrollbar">
            {connections.map(conn => {
              const fromItem = items.find(i => i.id === conn.from);
              const toItem = items.find(i => i.id === conn.to);
              return (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium">{fromItem?.name}</span>
                    <LinkIcon className="w-4 h-4 text-textMuted" />
                    <span className="text-sm font-medium">{toItem?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-textMuted flex-1">{conn.description}</span>
                    <button
                      onClick={() => onRemoveConnection(conn.id)}
                      className="p-1 hover:bg-danger/20 rounded text-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold mb-4">Create Connection</h3>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                {selectedItem1?.name}
              </span>
              <LinkIcon className="w-4 h-4 text-textMuted" />
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                {selectedItem2?.name}
              </span>
            </div>

            <textarea
              value={connectionDescription}
              onChange={(e) => setConnectionDescription(e.target.value)}
              placeholder="Describe the relationship between these items..."
              className="glass-input w-full h-24 mb-4 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConnectionModal(false);
                  setSelectedItems([]);
                  setConnectionDescription('');
                }}
                className="glass-button flex-1 bg-surfaceLight/50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConnection}
                disabled={!connectionDescription.trim()}
                className={cn(
                  'glass-button flex-1',
                  !connectionDescription.trim() && 'opacity-50 cursor-not-allowed'
                )}
              >
                Create Connection
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
