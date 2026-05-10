"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortableSectionProps {
  id: string;
  type: string;
  onEdit: () => void;
  onRemove: () => void;
}

export function SortableSection({ id, type, onEdit, onRemove }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl mb-3 shadow-sm relative group"
    >
      <button
        className="text-slate-500 hover:text-white cursor-grab active:cursor-grabbing p-1 rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className="flex-1">
        <h4 className="text-white font-medium capitalize">{type} Section</h4>
        <p className="text-xs text-slate-500">ID: {id}</p>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onEdit}
          className="h-8 px-2 text-slate-400 hover:text-white"
        >
          <Edit2 className="w-4 h-4 mr-2" /> Edit Content
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRemove}
          className="h-8 px-2 text-slate-400 hover:text-rose-400"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
