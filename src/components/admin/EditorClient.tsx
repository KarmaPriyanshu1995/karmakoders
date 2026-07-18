"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Layers } from "lucide-react";
import {
  BUILTIN_SECTION_TYPES,
  formatSectionDisplayName,
  getDefaultCustomSectionContent,
  isBuiltinSectionType,
  normalizeSectionType,
} from "@/lib/sectionLibrary";
import { Button } from "@/components/ui/button";
import { EditableSectionCard } from "@/components/admin/EditableSectionCard";
import { calculateSectionSeoScore } from "@/lib/seo/sectionScorer";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Section {
  id: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
}

interface EditorClientProps {
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  initialSections: Section[];
}

export function EditorClient({ pageId, pageSlug, pageTitle, initialSections }: EditorClientProps) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customSectionName, setCustomSectionName] = useState("");

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/sections`);
      if (!res.ok) throw new Error("Failed to fetch sections");
      const data = await res.json();
      const fetched: Section[] = data.sections ?? [];
      setSections(fetched);
      setTargetKeywords(data.targetKeywords ?? []);
      if (fetched.length > 0) {
        setExpandedId((prev) => prev ?? fetched[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch sections", error);
      setSections(initialSections);
    } finally {
      setIsLoading(false);
    }
  }, [pageId, initialSections]);

  useEffect(() => {
    fetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  useEffect(() => {
    if (initialSections.length > 0 && sections.length === 0 && !isLoading) {
      setSections(initialSections);
    }
  }, [initialSections, sections.length, isLoading]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        return newArray.map((item, idx) => ({ ...item, order: idx }));
      });
    }
  }

  const addSection = (type: string, content: Record<string, unknown> = {}) => {
    const newId = `sec-${Math.random().toString(36).substr(2, 9)}`;
    const newSection: Section = {
      id: newId,
      type: type.toLowerCase(),
      content,
      order: sections.length,
    };
    setSections([...sections, newSection]);
    setExpandedId(newId);
  };

  const addCustomSection = () => {
    const displayName = customSectionName.trim();
    if (!displayName) {
      toast.error("Enter a section name first");
      return;
    }

    const type = normalizeSectionType(displayName);
    if (!type) {
      toast.error("Section name must include letters or numbers");
      return;
    }

    if (isBuiltinSectionType(type)) {
      toast.info(`"${formatSectionDisplayName(type)}" is in the library — added as a built-in section`);
      addSection(type);
      setCustomSectionName("");
      return;
    }

    addSection(type, getDefaultCustomSectionContent(displayName));
    setCustomSectionName("");
    toast.success(`Custom "${displayName}" section added — edit the content and save`);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx })));
    if (expandedId === id) setExpandedId(null);
  };

  const updateSectionContent = (id: string, newContent: Record<string, unknown>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content: newContent } : s))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sectionScores: Record<string, number> = {};
      sections.forEach((s) => {
        sectionScores[s.id] = calculateSectionSeoScore(s.type, s.content, targetKeywords);
      });

      const res = await fetch(`/api/pages/${pageId}/sections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, sectionScores }),
      });

      if (!res.ok) throw new Error("Save failed");
      toast.success("Page sections saved!");
      router.refresh();
    } catch (error) {
      console.error("Failed to save sections", error);
      toast.error("Failed to save sections");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Editing: {pageTitle}</h2>
            <p className="text-slate-400 mt-1">Real-time CMS Section Editor</p>
            {pageSlug && (
              <p className="text-xs text-slate-500 font-mono mt-0.5">/{pageSlug === "home" ? "" : pageSlug}</p>
            )}
          </div>
        </div>
        <Button
          disabled={isSaving || isLoading}
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card rounded-xl p-6 min-h-[500px]">
          <h3 className="text-lg font-semibold text-white mb-6">Page Layout</h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <EditableSectionCard
                    key={section.id}
                    id={section.id}
                    type={section.type}
                    content={section.content}
                    order={section.order}
                    expanded={expandedId === section.id}
                    targetKeywords={targetKeywords}
                    onToggle={() =>
                      setExpandedId((prev) => (prev === section.id ? null : section.id))
                    }
                    onRemove={() => removeSection(section.id)}
                    onContentChange={(newContent) => updateSectionContent(section.id, newContent)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {!isLoading && sections.length === 0 && (
            <div className="h-48 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500">
              No sections yet. Add one from the library.
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-6 h-fit sticky top-24">
          <h3 className="text-lg font-semibold text-white mb-2">Section Library</h3>
          <p className="text-xs text-slate-500 mb-6">Built-in sections for your site, or create a new custom one below.</p>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 mb-6">
            {BUILTIN_SECTION_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300 font-medium">{type}</span>
                <Button variant="ghost" size="sm" className="h-8 text-indigo-400 hover:text-indigo-300" onClick={() => addSection(type)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>

          <div className="pt-5 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FFC300]" />
              <h4 className="text-sm font-semibold text-white">Add Custom Section</h4>
            </div>
            <p className="text-xs text-slate-500">
              Create a new section type that is not in the library. It will appear on your live page after you save.
            </p>
            <input
              value={customSectionName}
              onChange={(e) => setCustomSectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomSection()}
              placeholder="e.g. Gallery, Stats, Timeline..."
              className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white placeholder:text-slate-600 focus:border-[#FFC300]/50 outline-none"
            />
            <Button
              onClick={addCustomSection}
              disabled={!customSectionName.trim()}
              className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#1C1B1A] font-bold disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
