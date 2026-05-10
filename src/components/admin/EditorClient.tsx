"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableSection } from "@/components/admin/SortableSection";
import { SectionContentEditor } from "@/components/admin/SectionContentEditor";
import { upsertSections } from "@/lib/actions";
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
  pageTitle: string;
  initialSections: Section[];
}

export function EditorClient({ pageId, pageTitle, initialSections }: EditorClientProps) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const addSection = (type: string) => {
    const newId = `sec-${Math.random().toString(36).substr(2, 9)}`;
    const newSection = { 
      id: newId, 
      type: type.toLowerCase(), 
      content: {}, 
      order: sections.length 
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx })));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertSections(pageId, sections);
      router.refresh();
    } catch (error) {
      console.error("Failed to save sections", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSectionContent = (id: string, newContent: Record<string, unknown>) => {
    setSections(sections.map(s => s.id === id ? { ...s, content: newContent } : s));
    setEditingSection(null);
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
          </div>
        </div>
        <Button 
          disabled={isSaving}
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <SortableSection 
                  key={section.id} 
                  id={section.id} 
                  type={section.type} 
                  onEdit={() => setEditingSection(section)}
                  onRemove={() => removeSection(section.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          
          {sections.length === 0 && (
            <div className="h-48 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500">
              No sections yet. Add one from the library.
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-6 h-fit sticky top-24">
          <h3 className="text-lg font-semibold text-white mb-6">Section Library</h3>
          <div className="space-y-3">
            {['Hero', 'About', 'Services', 'Projects', 'Testimonials', 'Pricing', 'Blog', 'Contact', 'FAQ', 'Careers', 'CaseStudies', 'Newsletter', 'Content'].map((type) => (
              <div key={type} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300 font-medium">{type}</span>
                <Button variant="ghost" size="sm" className="h-8 text-indigo-400 hover:text-indigo-300" onClick={() => addSection(type)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingSection && (
        <SectionContentEditor 
          type={editingSection.type}
          content={editingSection.content}
          onSave={(newContent) => updateSectionContent(editingSection.id, newContent)}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}
