"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type StudentAttachmentPreviewTriggerProps = {
  title: string;
  href: string;
  kind: "image" | "pdf" | "audio" | "video" | "other";
  altText: string;
};

export function StudentAttachmentPreviewTrigger({
  title,
  href,
  kind,
  altText,
}: StudentAttachmentPreviewTriggerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button className="button buttonGhost" type="button" onClick={() => setOpen(true)}>
        Open
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="analyticsAttachmentModal"
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={() => setOpen(false)}
            >
              <div
                className="analyticsAttachmentModalCard"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="analyticsAttachmentModalHeader">
                  <strong>{title}</strong>
                  <div className="analyticsAttachmentModalActions">
                    <Link className="button buttonGhost" href={href} target="_blank">
                      New tab
                    </Link>
                    <button
                      className="button buttonSecondary"
                      type="button"
                      onClick={() => setOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
                <div className="analyticsAttachmentModalBody">
                  {kind === "image" ? (
                    <Image
                      className="analyticsAttachmentPreviewImage"
                      src={href}
                      alt={altText}
                      width={1200}
                      height={900}
                      unoptimized
                    />
                  ) : kind === "pdf" ? (
                    <iframe
                      className="analyticsAttachmentPreviewFrame"
                      src={href}
                      title={title}
                    />
                  ) : kind === "audio" ? (
                    <audio
                      className="analyticsAttachmentPreviewAudio"
                      controls
                      preload="metadata"
                      src={href}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  ) : kind === "video" ? (
                    <video
                      className="analyticsAttachmentPreviewVideo"
                      controls
                      preload="metadata"
                      src={href}
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : (
                    <div className="analyticsAttachmentPreviewFallback">
                      <strong>Preview is not available for this file type.</strong>
                      <span>Use the new-tab action to inspect the attachment directly.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            ,
            document.body,
          )
        : null}
    </>
  );
}
