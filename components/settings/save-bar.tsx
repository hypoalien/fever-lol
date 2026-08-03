"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * A save bar that only exists when there is something to save.
 *
 * The previous screen had a permanently visible "Submit" button, which gives
 * no signal about whether anything changed and no way to back out. This
 * appears on the first edit, states plainly that there are unsaved changes,
 * and offers to discard them.
 *
 * Pinned to the bottom of the viewport so a long form never leaves the action
 * out of reach.
 */
export function SaveBar({
  visible,
  saving,
  onSave,
  onReset,
}: {
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: 24, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="sticky bottom-4 z-20 mt-6"
        >
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-popover px-4 py-3 shadow-lg">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReset}
                disabled={saving}
              >
                Discard
              </Button>
              <Button type="button" size="sm" onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
