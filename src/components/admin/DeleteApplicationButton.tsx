"use client";

import { deleteJobApplication } from "@/lib/actions";
import { toast } from "sonner";
import { DeleteConfirmButton } from "./DeleteConfirmButton";

export function DeleteApplicationButton({ id }: { id: string }) {
  return (
    <DeleteConfirmButton
      label="Delete Application"
      confirmTitle="Delete this application?"
      confirmMessage="This will permanently delete the candidate's record and remove their CV from cloud storage."
      onDelete={async () => {
        await deleteJobApplication(id);
        toast.success("Application and CV deleted successfully!");
      }}
    />
  );
}
