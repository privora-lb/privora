"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import type { VenueType } from "@/lib/types";
import { cn } from "@/lib/ui";

type MenuRect = {
  bottom?: number;
  left: number;
  maxHeight: number;
  top?: number;
  width: number;
};

const menuGap = 6;
const menuViewportPadding = 12;
const menuMaxHeight = 288;
const menuMinWidth = 420;
const menuMinHeight = 96;

export function VenueTypeCell({
  error,
  onChange,
  selectedTypeId,
  types,
}: {
  error?: string;
  onChange: (type: VenueType) => void;
  selectedTypeId: string;
  types: VenueType[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
  const selectedType = types.find((type) => type.id === selectedTypeId);
  const filteredTypes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return types;
    }

    return types.filter((type) =>
      `${type.name} ${type.description}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query, types]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    function updateMenuPosition() {
      const rect = inputRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setMenuRect(getMenuRect(rect));
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  function selectType(type: VenueType) {
    onChange(type);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative -mx-3 w-[calc(100%+1.5rem)]">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#123C36]"
        size={14}
      />
      <input
        aria-invalid={Boolean(error)}
        aria-label="Venue type"
        className={cn(
          "min-h-[35px] w-full border-0 bg-white px-8 pr-9 text-[12px] font-bold text-[#123C36] outline-none transition placeholder:text-[#123C36]/70 focus:text-[#123C36] focus:ring-2 focus:ring-inset focus:ring-[#C0964E]/25",
          error &&
            "bg-rose-50 text-rose-900 ring-2 ring-inset ring-rose-300 placeholder:text-rose-300 focus:bg-rose-50 focus:ring-rose-400",
        )}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 140);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
            event.currentTarget.blur();
          }
        }}
        placeholder={selectedType?.name ?? "Search type"}
        ref={inputRef}
        title={error}
        type="search"
        value={query}
      />
      <button
        aria-label="Open venue type list"
        className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#123C36] transition hover:bg-[#FCF7E8]"
        onClick={() => {
          setIsOpen((current) => !current);
          inputRef.current?.focus();
        }}
        type="button"
      >
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {isOpen && menuRect && typeof document !== "undefined"
        ? createPortal(
            <VenueTypeMenu
              filteredTypes={filteredTypes}
              menuRect={menuRect}
              onSelect={selectType}
              selectedTypeId={selectedTypeId}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function VenueTypeMenu({
  filteredTypes,
  menuRect,
  onSelect,
  selectedTypeId,
}: {
  filteredTypes: VenueType[];
  menuRect: MenuRect;
  onSelect: (type: VenueType) => void;
  selectedTypeId: string;
}) {
  const style: CSSProperties = {
    bottom: menuRect.bottom,
    left: menuRect.left,
    maxHeight: menuRect.maxHeight,
    top: menuRect.top,
    width: menuRect.width,
  };

  return (
    <div
      className="fixed z-[80] overflow-y-auto rounded-2xl border border-[#EACC84]/45 bg-white p-2 shadow-[0_24px_60px_rgba(18,60,54,0.16)]"
      role="listbox"
      style={style}
    >
      {filteredTypes.length > 0 ? (
        filteredTypes.map((type) => {
          const isSelected = type.id === selectedTypeId;

          return (
            <button
              aria-selected={isSelected}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#FCF7E8]",
                isSelected && "bg-[#FCF7E8]",
              )}
              key={type.id}
              onClick={() => onSelect(type)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              type="button"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#F6E4AE] text-[11px] font-black uppercase text-[#123C36]">
                {type.name.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block whitespace-normal break-words text-sm font-black leading-snug text-slate-950">
                  {type.name}
                </span>
                <span className="mt-0.5 block whitespace-normal break-words text-xs font-bold leading-snug text-slate-500">
                  {type.description || "No description"}
                </span>
              </span>
              {isSelected ? (
                <Check className="shrink-0 text-[#967230]" size={16} />
              ) : null}
            </button>
          );
        })
      ) : (
        <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
          No types found.
        </div>
      )}
    </div>
  );
}

function getMenuRect(rect: DOMRect): MenuRect {
  const viewportWidth = window.innerWidth;
  const width = Math.min(
    Math.max(rect.width, menuMinWidth),
    viewportWidth - menuViewportPadding * 2,
  );
  const left = Math.min(
    Math.max(rect.left, menuViewportPadding),
    viewportWidth - width - menuViewportPadding,
  );
  const spaceBelow = window.innerHeight - rect.bottom - menuViewportPadding;
  const spaceAbove = rect.top - menuViewportPadding;
  const shouldOpenUp = spaceBelow < 180 && spaceAbove > spaceBelow;
  const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(
    menuMinHeight,
    Math.min(menuMaxHeight, availableSpace - menuGap),
  );

  if (shouldOpenUp) {
    return {
      bottom: window.innerHeight - rect.top + menuGap,
      left,
      maxHeight,
      width,
    };
  }

  return {
    left,
    maxHeight,
    top: rect.bottom + menuGap,
    width,
  };
}
