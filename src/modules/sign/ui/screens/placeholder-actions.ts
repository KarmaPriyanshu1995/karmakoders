"use client";

import { notify } from "../toast";

/**
 * Buttons that aren't wired yet say so plainly instead of pretending to work.
 * TODO(Step 9): remind, void, duplicate, download and send call the Sign APIs.
 * TODO(Step 10): checkout and billing portal.
 */
export function comingSoon(action: string): void {
  notify.info(`${action} isn't available yet`, {
    description: "This part of KarmaKoders Sign arrives in an upcoming release. Nothing was changed.",
  });
}
