"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { deleteToolCategory, upsertToolCategory } from "@/lib/tool-actions";

type Category = { id: string; name: string; slug: string; sortOrder: number };

export function CategoriesAdmin({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");

  return (
    <div className="space-y-6 max-w-2xl">
      <form
        className="flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await upsertToolCategory({ name });
            setName("");
            toast.success("Category added");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed");
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800"
        />
        <Button type="submit">Add</Button>
      </form>
      <div className="divide-y divide-white/10 rounded-xl border border-white/10">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-white font-medium">{category.name}</p>
              <p className="text-xs text-slate-500">{category.slug}</p>
            </div>
            <DeleteConfirmButton
              iconOnly
              confirmTitle="Delete category?"
              confirmMessage={`"${category.name}" will be removed.`}
              onDelete={async () => {
                await deleteToolCategory(category.id);
                router.refresh();
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
