"use client";

import { useEffect } from "react";

const scrollStorageKey = "reservation-calendar-scroll";
const preserveScrollSelector = 'form[data-calendar-preserve-scroll="true"]';

export function CalendarScrollRestorer() {
  useEffect(() => {
    function preserveScroll(event: SubmitEvent) {
      const target = event.target;

      if (!(target instanceof HTMLFormElement)) {
        return;
      }

      if (!target.matches(preserveScrollSelector)) {
        return;
      }

      sessionStorage.setItem(
        scrollStorageKey,
        JSON.stringify({ x: window.scrollX, y: window.scrollY }),
      );
    }

    document.addEventListener("submit", preserveScroll, true);

    return () => {
      document.removeEventListener("submit", preserveScroll, true);
    };
  }, []);

  useEffect(() => {
    const rawValue = sessionStorage.getItem(scrollStorageKey);

    if (!rawValue) {
      return;
    }

    sessionStorage.removeItem(scrollStorageKey);

    try {
      const position = JSON.parse(rawValue) as { x?: number; y?: number };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            behavior: "instant",
            left: position.x ?? 0,
            top: position.y ?? 0,
          });
        });
      });
    } catch {
      window.scrollTo({ behavior: "instant", left: 0, top: 0 });
    }
  });

  return null;
}
