"use client";

import { useSyncExternalStore } from "react";

function browserSupportsFullscreen() {
  if (typeof document === "undefined") return false;

  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  return Boolean(
    document.fullscreenEnabled ||
      root.requestFullscreen ||
      root.webkitRequestFullscreen,
  );
}

export function AttemptFullscreenButton() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isFullscreen = useSyncExternalStore(
    (onStoreChange) => {
      document.addEventListener("fullscreenchange", onStoreChange);
      return () => document.removeEventListener("fullscreenchange", onStoreChange);
    },
    () => Boolean(document.fullscreenElement),
    () => false,
  );

  const supported = mounted ? browserSupportsFullscreen() : false;

  async function toggleFullscreen() {
    if (!supported) {
      return;
    }

    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const documentWithWebkitExit = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (documentWithWebkitExit.webkitExitFullscreen) {
        await documentWithWebkitExit.webkitExitFullscreen();
      }
      return;
    }

    if (root.requestFullscreen) {
      await root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
    }
  }

  if (!mounted || !supported) {
    return null;
  }

  return (
    <button
      className="button buttonSecondary"
      onClick={toggleFullscreen}
      type="button"
    >
      {isFullscreen ? "Exit Fullscreen" : "Full Screen"}
    </button>
  );
}
