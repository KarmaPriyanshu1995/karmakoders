"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateSignerRole } from "@/modules/sign/templates/catalog";
import { Button, IconButton } from "../../button";
import { Alert } from "../../feedback";
import { FormField, Input, Radio, RadioGroup, Select, Switch, Textarea } from "../../form";
import type { PlanSummaryVM } from "../../view-models";
import { EXPIRY_OPTIONS, MESSAGE_MAX, type BuilderAction, type BuilderState, type SignerDraft, type SignerValidation } from "./builder-state";

function signerLabel(signer: SignerDraft, index: number): string {
  return signer.name.trim() || `Signer ${index + 1}`;
}

type RowProps = {
  signer: SignerDraft;
  index: number;
  count: number;
  roles: TemplateSignerRole[];
  errors?: { name?: string; email?: string };
  dispatch: React.Dispatch<BuilderAction>;
  onMove: (signer: SignerDraft, index: number, direction: "up" | "down") => void;
};

function SignerRow({ signer, index, count, roles, errors, dispatch, onMove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: signer.id });
  const label = signerLabel(signer, index);
  const roleOptions = roles.some((r) => r.label === signer.role) ? roles : [...roles, { key: signer.role, label: signer.role, description: "" }];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-4 motion-reduce:transition-none",
        isDragging && "relative z-10 border-[#FFC300]/50 shadow-2xl"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Drag to reorder ${label}`}
            className="hidden size-11 cursor-grab items-center justify-center rounded-xl text-[#A39F97] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] md:inline-flex"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden className="size-5" />
          </button>
          <span className="flex size-8 items-center justify-center rounded-full border border-white/35 text-sm font-bold text-white">
            {index + 1}
          </span>
          <span className="break-all font-semibold text-white">{label}</span>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(signer, index, "up")}>
            <ArrowUp />
          </IconButton>
          <IconButton aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(signer, index, "down")}>
            <ArrowDown />
          </IconButton>
          <IconButton
            aria-label={`Remove ${label}`}
            disabled={count <= 1}
            onClick={() => dispatch({ type: "remove_signer", id: signer.id })}
          >
            <Trash2 />
          </IconButton>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Name" required error={errors?.name}>
          <Input
            autoComplete="off"
            value={signer.name}
            onChange={(e) => dispatch({ type: "update_signer", id: signer.id, patch: { name: e.target.value } })}
          />
        </FormField>
        <FormField label="Email" required error={errors?.email}>
          <Input
            type="email"
            autoComplete="off"
            value={signer.email}
            onChange={(e) => dispatch({ type: "update_signer", id: signer.id, patch: { email: e.target.value } })}
          />
        </FormField>
        <FormField label="Role">
          <Select value={signer.role} onChange={(e) => dispatch({ type: "update_signer", id: signer.id, patch: { role: e.target.value } })}>
            {roleOptions.map((role) => (
              <option key={role.key} value={role.label}>
                {role.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </li>
  );
}

export function SignersStep({
  state,
  roles,
  plan,
  validation,
  showErrors,
  dispatch,
}: {
  state: BuilderState;
  roles: TemplateSignerRole[];
  plan: PlanSummaryVM;
  validation: SignerValidation;
  showErrors: boolean;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  const [announcement, setAnnouncement] = React.useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const count = state.signers.length;
  const atLimit = count >= plan.maxSigners;
  const nameOf = (id: string) => {
    const index = state.signers.findIndex((s) => s.id === id);
    return index >= 0 ? signerLabel(state.signers[index], index) : "Signer";
  };

  function onMove(signer: SignerDraft, index: number, direction: "up" | "down") {
    const to = direction === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= count) return;
    dispatch({ type: "move_signer", id: signer.id, direction });
    setAnnouncement(`Moved ${signerLabel(signer, index)} to position ${to + 1} of ${count}.`);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    dispatch({ type: "reorder_signers", fromId: String(active.id), toId: String(over.id) });
  }

  const nextRole = roles[count % Math.max(roles.length, 1)]?.label ?? "Signer";

  return (
    <div className="space-y-8">
      <section aria-labelledby="signers-list-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="signers-list-heading" className="text-2xl font-black tracking-tight text-white">
            Who needs to sign
          </h2>
          <span className="text-sm text-[#A39F97]">
            {count} of up to {plan.maxSigners} signers
          </span>
        </div>
        <p className="text-sm text-[#A39F97]">
          Drag the handle or use the arrow buttons to change the signing order.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable: "To pick up a signer, press Space or Enter. Use the arrow keys to move, Space or Enter to drop, Escape to cancel.",
            },
            announcements: {
              onDragStart: ({ active }) => `Picked up ${nameOf(String(active.id))}.`,
              onDragOver: ({ active, over }) => (over ? `${nameOf(String(active.id))} is over ${nameOf(String(over.id))}.` : undefined),
              onDragEnd: ({ active }) => `Dropped ${nameOf(String(active.id))}.`,
              onDragCancel: ({ active }) => `Cancelled. ${nameOf(String(active.id))} was not moved.`,
            },
          }}
        >
          <SortableContext items={state.signers.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-3">
              {state.signers.map((signer, index) => (
                <SignerRow
                  key={signer.id}
                  signer={signer}
                  index={index}
                  count={count}
                  roles={roles}
                  errors={showErrors ? validation.errors[signer.id] : undefined}
                  dispatch={dispatch}
                  onMove={onMove}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
        {showErrors && validation.limitError ? (
          <Alert tone="danger" live title="Too many signers">
            {validation.limitError}
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" icon={<Plus />} disabled={atLimit} onClick={() => dispatch({ type: "add_signer", role: nextRole })}>
            Add signer
          </Button>
          {atLimit ? (
            <p className="text-sm text-[#A39F97]">
              {plan.kind === "free" ? (
                <>
                  Free documents allow up to {plan.maxSigners} signers.{" "}
                  <Link href="/tools/sign/billing" className="font-semibold text-[#FFC300] underline-offset-4 hover:underline">
                    Buy credits or upgrade
                  </Link>{" "}
                  for up to 10.
                </>
              ) : (
                <>You&apos;ve reached the maximum of {plan.maxSigners} signers per document.</>
              )}
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="signing-options-heading" className="space-y-6">
        <h2 id="signing-options-heading" className="text-2xl font-black tracking-tight text-white">
          Signing options
        </h2>
        <RadioGroup legend="Signing order">
          <Radio
            name="signing-order"
            label="One after another (sequential)"
            description="Each signer gets the link after the person before them signs."
            checked={state.mode === "sequential"}
            onChange={() => dispatch({ type: "set_mode", mode: "sequential" })}
          />
          <Radio
            name="signing-order"
            label="All at once (parallel)"
            description="Everyone gets the link now and can sign in any order."
            checked={state.mode === "parallel"}
            onChange={() => dispatch({ type: "set_mode", mode: "parallel" })}
          />
        </RadioGroup>
        <FormField label="Message to signers" hint={`Optional. Shown in the email. ${state.message.length} of ${MESSAGE_MAX} characters.`}>
          <Textarea value={state.message} maxLength={MESSAGE_MAX} onChange={(e) => dispatch({ type: "set_message", message: e.target.value })} />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Signing link expires after" hint="Unsigned documents expire after this.">
            <Select value={String(state.expiryDays)} onChange={(e) => dispatch({ type: "set_expiry", days: Number(e.target.value) })}>
              {EXPIRY_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <Switch
          label="Remind signers automatically until they sign"
          checked={state.reminders}
          onCheckedChange={(on) => dispatch({ type: "set_reminders", on })}
        />
      </section>
    </div>
  );
}
