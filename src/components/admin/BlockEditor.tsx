"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
  BLOCK_LABELS,
  availableBlocksFor,
  createEmptyBlock,
  isBlockType,
} from "@/lib/content/blocks";
import { normalizePostType } from "@/lib/content/post-types";
import { TOOL_EMBED_IDS, type BlockType, type ContentBlock, type CtaVariant, type ToolEmbedId } from "@/types/content";

function updateBlock<T extends ContentBlock>(blocks: ContentBlock[], id: string, patch: Partial<T>): ContentBlock[] {
  return blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as T) : block));
}

function SortableBlock({
  block,
  highlighted,
  onChange,
  onRemove,
}: {
  block: ContentBlock;
  highlighted?: boolean;
  onChange: (patch: Partial<ContentBlock>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-card={block.type}
      data-block-id={block.id}
      className={`rounded-xl border p-4 ${
        highlighted ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/40" : "border-slate-800 bg-slate-950/60"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <button type="button" className="text-slate-500 cursor-grab p-1" {...attributes} {...listeners} aria-label="Reorder block">
          <GripVertical className="w-4 h-4" />
        </button>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex-1">{BLOCK_LABELS[block.type]}</p>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-rose-400" onClick={onRemove}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <BlockFields block={block} onChange={onChange} />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-slate-300 space-y-1">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm text-slate-300 space-y-1">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 resize-y"
      />
    </label>
  );
}

function LineList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300">{label}</p>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={value}
            onChange={(e) => onChange(values.map((item, i) => (i === index ? e.target.value : item)))}
            className="flex-1 h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none focus:border-indigo-500"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(values.filter((_, i) => i !== index))}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...values, ""])}>
        Add item
      </Button>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: ContentBlock; onChange: (patch: Partial<ContentBlock>) => void }) {
  switch (block.type) {
    case "HEADING":
    case "SUBHEADING":
      return <TextInput label="Text" value={block.text} onChange={(text) => onChange({ text })} />;
    case "PARAGRAPH":
      return <RichTextEditor content={block.html} onChange={(html) => onChange({ html })} placeholder="Write this section in plain language." />;
    case "PRO_TIP":
      return (
        <div className="space-y-3">
          <TextInput label="Title" value={block.title} onChange={(title) => onChange({ title })} />
          <TextArea label="Message" value={block.message} onChange={(message) => onChange({ message })} />
        </div>
      );
    case "QUOTE":
      return (
        <div className="space-y-3">
          <TextArea label="Quote" value={block.text} onChange={(text) => onChange({ text })} />
          <TextInput label="Author" value={block.author} onChange={(author) => onChange({ author })} />
        </div>
      );
    case "CODE":
      return (
        <div className="space-y-3">
          <TextInput label="Language" value={block.language} onChange={(language) => onChange({ language })} />
          <TextArea label="Code" value={block.code} onChange={(code) => onChange({ code })} rows={8} />
        </div>
      );
    case "TOOL_EMBED":
      return (
        <label className="block text-sm text-slate-300 space-y-1">
          Tool
          <select
            value={block.tool}
            onChange={(e) => onChange({ tool: e.target.value as ToolEmbedId })}
            className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white outline-none [color-scheme:dark]"
          >
            {TOOL_EMBED_IDS.map((id) => (
              <option key={id} value={id}>
                {id.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      );
    case "MERMAID":
      return (
        <div className="space-y-3">
          <TextInput label="Caption" value={block.caption || ""} onChange={(caption) => onChange({ caption })} />
          <TextArea label="Mermaid code" value={block.chart} onChange={(chart) => onChange({ chart })} rows={10} />
        </div>
      );
    case "TLDR":
      return <LineList label="Three takeaways" values={block.items} onChange={(items) => onChange({ items })} />;
    case "COMPARISON_MATRIX":
      return (
        <div className="space-y-3">
          <LineList label="Columns" values={block.columns} onChange={(columns) => onChange({ columns })} />
          {block.rows.map((row, index) => (
            <div key={index} className="rounded-lg border border-slate-800 p-3 space-y-2">
              <TextInput
                label="Row label"
                value={row.label}
                onChange={(label) =>
                  onChange({
                    rows: block.rows.map((item, i) => (i === index ? { ...item, label } : item)),
                  })
                }
              />
              <LineList
                label="Values"
                values={row.values}
                onChange={(values) =>
                  onChange({
                    rows: block.rows.map((item, i) => (i === index ? { ...item, values } : item)),
                  })
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ rows: [...block.rows, { label: "", values: block.columns.map(() => "") }] })}
          >
            Add row
          </Button>
        </div>
      );
    case "STAT_BADGES":
      return (
        <div className="space-y-3">
          {block.stats.map((stat, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <TextInput
                label="Value"
                value={stat.value}
                onChange={(value) => onChange({ stats: block.stats.map((item, i) => (i === index ? { ...item, value } : item)) })}
              />
              <TextInput
                label="Label"
                value={stat.label}
                onChange={(label) => onChange({ stats: block.stats.map((item, i) => (i === index ? { ...item, label } : item)) })}
              />
            </div>
          ))}
        </div>
      );
    case "BEFORE_AFTER":
      return (
        <div className="grid md:grid-cols-2 gap-3">
          <TextArea label={block.beforeLabel || "Before"} value={block.beforeText} onChange={(beforeText) => onChange({ beforeText })} />
          <TextArea label={block.afterLabel || "After"} value={block.afterText} onChange={(afterText) => onChange({ afterText })} />
        </div>
      );
    case "TAM":
      return (
        <div className="space-y-3">
          <TextInput label="Market size" value={block.market} onChange={(market) => onChange({ market })} placeholder="$12B by 2028" />
          <TextArea label="Insight" value={block.insight} onChange={(insight) => onChange({ insight })} />
        </div>
      );
    case "MVP_SCOPE":
      return (
        <div className="grid md:grid-cols-2 gap-4">
          <LineList label="Build now" values={block.now} onChange={(now) => onChange({ now })} />
          <LineList label="Wait" values={block.later} onChange={(later) => onChange({ later })} />
        </div>
      );
    case "TECH_STACK":
      return <LineList label="Stack pills" values={block.items} onChange={(items) => onChange({ items })} />;
    case "BUILD_BUDGET":
      return (
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Build time" value={block.weeks} onChange={(weeks) => onChange({ weeks })} />
          <TextInput label="Budget" value={block.budget} onChange={(budget) => onChange({ budget })} />
        </div>
      );
    case "CLIENT_HEADER":
      return (
        <div className="grid md:grid-cols-2 gap-3">
          <TextInput label="Client" value={block.client} onChange={(client) => onChange({ client })} />
          <TextInput label="Location" value={block.location} onChange={(location) => onChange({ location })} />
          <TextInput label="Scope" value={block.scope} onChange={(scope) => onChange({ scope })} />
          <TextInput label="Logo URL" value={block.logoUrl || ""} onChange={(logoUrl) => onChange({ logoUrl })} />
        </div>
      );
    case "DEVICE_GALLERY":
      return (
        <div className="space-y-3">
          {block.images.map((image, index) => (
            <div key={index} className="grid md:grid-cols-2 gap-2">
              <TextInput
                label="Image URL"
                value={image.url}
                onChange={(url) => onChange({ images: block.images.map((item, i) => (i === index ? { ...item, url } : item)) })}
              />
              <TextInput
                label="Alt text"
                value={image.alt}
                onChange={(alt) => onChange({ images: block.images.map((item, i) => (i === index ? { ...item, alt } : item)) })}
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ images: [...block.images, { url: "", alt: "" }] })}>
            Add image
          </Button>
        </div>
      );
    case "TESTIMONIAL":
      return (
        <div className="space-y-3">
          <TextArea label="Quote" value={block.quote} onChange={(quote) => onChange({ quote })} />
          <TextInput label="Name" value={block.name} onChange={(name) => onChange({ name })} />
          <TextInput label="Role" value={block.role} onChange={(role) => onChange({ role })} />
          <TextInput label="LinkedIn URL" value={block.linkedinUrl || ""} onChange={(linkedinUrl) => onChange({ linkedinUrl })} />
        </div>
      );
    case "COPY_PROMPT":
      return (
        <div className="space-y-3">
          <TextInput label="Title" value={block.title} onChange={(title) => onChange({ title })} />
          <TextArea label="Prompt" value={block.prompt} onChange={(prompt) => onChange({ prompt })} rows={8} />
        </div>
      );
    case "PROMPT_VARS":
      return (
        <div className="space-y-3">
          {block.variables.map((variable, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <TextInput
                label="Variable"
                value={variable.name}
                onChange={(name) =>
                  onChange({ variables: block.variables.map((item, i) => (i === index ? { ...item, name } : item)) })
                }
              />
              <TextInput
                label="Example"
                value={variable.example}
                onChange={(example) =>
                  onChange({ variables: block.variables.map((item, i) => (i === index ? { ...item, example } : item)) })
                }
              />
            </div>
          ))}
        </div>
      );
    case "USAGE_STEPS":
      return (
        <div className="space-y-3">
          {block.steps.map((step, index) => (
            <div key={index} className="space-y-2">
              <TextInput
                label={`Step ${index + 1} title`}
                value={step.title}
                onChange={(title) => onChange({ steps: block.steps.map((item, i) => (i === index ? { ...item, title } : item)) })}
              />
              <TextArea
                label="Details"
                value={step.body}
                onChange={(body) => onChange({ steps: block.steps.map((item, i) => (i === index ? { ...item, body } : item)) })}
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ steps: [...block.steps, { title: "", body: "" }] })}>
            Add step
          </Button>
        </div>
      );
    case "OUTPUT_PREVIEW":
      return (
        <div className="space-y-3">
          <label className="block text-sm text-slate-300 space-y-1">
            Kind
            <select
              value={block.kind}
              onChange={(e) => onChange({ kind: e.target.value as "code" | "image" })}
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white [color-scheme:dark]"
            >
              <option value="code">Code</option>
              <option value="image">Image URL</option>
            </select>
          </label>
          <TextArea label="Content" value={block.content} onChange={(content) => onChange({ content })} rows={6} />
          <TextInput label="Caption" value={block.caption || ""} onChange={(caption) => onChange({ caption })} />
        </div>
      );
    case "CTA":
      return (
        <div className="space-y-3">
          <label className="block text-sm text-slate-300 space-y-1">
            Action
            <select
              value={block.variant}
              onChange={(e) => onChange({ variant: e.target.value as CtaVariant })}
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white [color-scheme:dark]"
            >
              <option value="newsletter">Newsletter signup</option>
              <option value="contact">Contact link</option>
              <option value="cal">Cal.com</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="custom">Custom link</option>
            </select>
          </label>
          <TextInput label="Heading" value={block.heading} onChange={(heading) => onChange({ heading })} />
          <TextArea label="Body" value={block.body} onChange={(body) => onChange({ body })} />
          <TextInput label="Button label" value={block.label} onChange={(label) => onChange({ label })} />
          {block.variant === "newsletter" ? (
            <p className="text-xs text-slate-500">The public page shows an email field. Visitors subscribe in place.</p>
          ) : (
            <TextInput label="Link" value={block.href} onChange={(href) => onChange({ href })} />
          )}
        </div>
      );
    default:
      return null;
  }
}

function AddBlockMenu({
  options,
  lastAddedLabel,
  onAdd,
}: {
  options: BlockType[];
  lastAddedLabel?: string | null;
  onAdd: (type: BlockType) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Plus className="w-4 h-4" />
          Add section
        </span>
        {lastAddedLabel ? <span className="text-xs text-indigo-300">Added {lastAddedLabel}</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            data-testid="add-block-option"
            data-block-type={option}
            onMouseDown={(event) => {
              event.preventDefault();
              onAdd(option);
            }}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 hover:border-indigo-500 hover:text-white"
          >
            {BLOCK_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BlockEditor({
  postType,
  blocks,
  onChange,
}: {
  postType: string;
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  const type = normalizePostType(postType);
  const options = useMemo(() => availableBlocksFor(type), [type]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const blocksRef = useRef(blocks);
  const listRef = useRef<HTMLDivElement>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [lastAddedLabel, setLastAddedLabel] = useState<string | null>(null);
  blocksRef.current = blocks;

  function addBlock(blockType: BlockType) {
    if (!isBlockType(blockType)) return;
    const nextBlock = createEmptyBlock(blockType);
    onChange([...blocksRef.current, nextBlock]);
    setHighlightId(nextBlock.id);
    setLastAddedLabel(BLOCK_LABELS[blockType]);
  }

  useEffect(() => {
    if (!highlightId) return;
    const node = listRef.current?.querySelector(`[data-block-id="${highlightId}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => {
      setHighlightId((current) => (current === highlightId ? null : current));
      setLastAddedLabel(null);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <AddBlockMenu options={options} lastAddedLabel={lastAddedLabel} onAdd={addBlock} />
        <p className="text-xs text-slate-500">Click a block to add it below. Writers fill in plain text — no HTML required.</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          <div ref={listRef} className="space-y-3">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                highlighted={block.id === highlightId}
                onChange={(patch) => onChange(updateBlock(blocks, block.id, patch))}
                onRemove={() => onChange(blocks.filter((item) => item.id !== block.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
