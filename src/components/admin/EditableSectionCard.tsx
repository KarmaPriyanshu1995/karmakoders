"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFieldsForSectionType } from "@/lib/sectionFieldSchemas";
import { formatSectionDisplayName } from "@/lib/sectionLibrary";
import { SectionImageField } from "@/components/admin/SectionImageField";
import { SectionSeoPanel } from "@/components/admin/SectionSeoPanel";
import { calculateSectionSeoScore, getSectionScoreColor } from "@/lib/seo/sectionScorer";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface EditableSectionCardProps {
  id: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
  expanded: boolean;
  targetKeywords: string[];
  onToggle: () => void;
  onRemove: () => void;
  onContentChange: (content: Record<string, unknown>) => void;
}

export function EditableSectionCard({
  id,
  type,
  content,
  expanded,
  targetKeywords,
  onToggle,
  onRemove,
  onContentChange,
}: EditableSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const debouncedContent = useDebouncedValue(content, 150);
  const score = useMemo(
    () => calculateSectionSeoScore(type, debouncedContent, targetKeywords),
    [type, debouncedContent, targetKeywords]
  );
  const scoreColor = getSectionScoreColor(score);

  const fields = getFieldsForSectionType(type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleFieldChange = (key: string, value: unknown) => {
    onContentChange({ ...content, [key]: value });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-900 border border-slate-800 rounded-xl mb-3 shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4 relative group">
        <button
          type="button"
          className="text-slate-500 hover:text-white cursor-grab active:cursor-grabbing p-1 rounded flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <div className="min-w-0">
            <h4 className="text-white font-medium">{formatSectionDisplayName(type)} Section</h4>
            <p className="text-xs text-slate-500 truncate">ID: {id}</p>
          </div>
        </button>

        <span
          className="text-xs font-black px-2.5 py-1 rounded-full border flex-shrink-0"
          style={{
            color: scoreColor,
            borderColor: `${scoreColor}40`,
            backgroundColor: `${scoreColor}15`,
          }}
        >
          SEO: {score}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 px-2 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-800/80 space-y-4">
          {fields.length === 0 ? (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400 text-sm">
              No field schema for <b>{type}</b>. Edit raw JSON below.
            </div>
          ) : null}

          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
                {field.label}
              </label>
              {field.input === "image" ? (
                <SectionImageField
                  value={(content[field.key] as string) || ""}
                  onChange={(url) => handleFieldChange(field.key, url)}
                  placeholder={field.placeholder}
                />
              ) : field.input === "textarea" ? (
                <textarea
                  value={(content[field.key] as string) || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? (field.key === "body" || field.key === "secondaryBody" ? 6 : 3)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none resize-y min-h-[6rem]"
                />
              ) : field.input === "json" ? (
                <textarea
                  value={JSON.stringify(content[field.key] ?? (field.key === "plans" || field.key === "faqs" ? [] : {}), null, 2)}
                  onChange={(e) => {
                    try {
                      handleFieldChange(field.key, JSON.parse(e.target.value));
                    } catch {
                      // allow invalid JSON while typing
                    }
                  }}
                  className="w-full h-40 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-mono focus:border-indigo-500 outline-none resize-none"
                />
              ) : (
                <input
                  value={(content[field.key] as string) || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                />
              )}
            </div>
          ))}

          {fields.length > 0 && (
            <SectionSeoPanel content={content} targetKeywords={targetKeywords} />
          )}

          {fields.length === 0 && (
            <textarea
              value={JSON.stringify(content, null, 2)}
              onChange={(e) => {
                try {
                  onContentChange(JSON.parse(e.target.value));
                } catch {
                  // allow invalid JSON while typing
                }
              }}
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-mono focus:border-indigo-500 outline-none resize-none"
            />
          )}
        </div>
      )}
    </div>
  );
}
