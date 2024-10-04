import React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

export function ModalPermissionDenied() {
  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <h1 className="text-xl">Audio Recorder</h1>
        <div>
          <h2 className="mb-0">Microphone Access Denied</h2>
          <p>Please enable microphone access in your browser settings.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
