"use client";

import { useEffect } from "react";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isModK = (e.metaKey || e.ctrlKey) && e.key === "k";
      if (isModK) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("quick-capture-open"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
