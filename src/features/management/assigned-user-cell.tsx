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

import type { AppUser } from "@/lib/types";
import { cn } from "@/lib/ui";

type MenuRect = {
  left: number;
  top: number;
  width: number;
};

export function AssignedUserCell({
  error,
  onChange,
  selectedUserId,
  users,
}: {
  error?: string;
  onChange: (user: AppUser) => void;
  selectedUserId: string;
  users: AppUser[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      `${user.name} ${user.email ?? ""} ${user.phoneNumber} ${user.role}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, users]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    function updateMenuPosition() {
      const rect = inputRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setMenuRect({
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  function selectUser(user: AppUser) {
    onChange(user);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative -mx-3 w-[calc(100%+1.5rem)]">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0b6f7d]"
        size={14}
      />
      <input
        aria-invalid={Boolean(error)}
        aria-label="Assigned user"
        className={cn(
          "min-h-[35px] w-full border-0 bg-transparent px-8 pr-9 text-[12px] font-bold text-slate-700 outline-none transition placeholder:text-slate-700 focus:bg-white focus:text-slate-950 focus:ring-2 focus:ring-inset focus:ring-[#0EA5A8]/20",
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
        placeholder={
          selectedUser
            ? `${selectedUser.name} (${selectedUser.role})`
            : "Search user"
        }
        ref={inputRef}
        title={error}
        type="search"
        value={query}
      />
      <button
        aria-label="Open assigned user list"
        className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#0b4658] transition hover:bg-[#eefbfc]"
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
            <AssignedUserMenu
              filteredUsers={filteredUsers}
              menuRect={menuRect}
              onSelect={selectUser}
              selectedUserId={selectedUserId}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function AssignedUserMenu({
  filteredUsers,
  menuRect,
  onSelect,
  selectedUserId,
}: {
  filteredUsers: AppUser[];
  menuRect: MenuRect;
  onSelect: (user: AppUser) => void;
  selectedUserId: string;
}) {
  const style: CSSProperties = {
    left: menuRect.left,
    top: menuRect.top,
    width: menuRect.width,
  };

  return (
    <div
      className="fixed z-[80] max-h-72 overflow-y-auto rounded-2xl border border-[#d8e9ee] bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
      role="listbox"
      style={style}
    >
      {filteredUsers.length > 0 ? (
        filteredUsers.map((user) => {
          const isSelected = user.id === selectedUserId;

          return (
            <button
              aria-selected={isSelected}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f5fbfd]",
                isSelected && "bg-[#eefbfc]",
              )}
              key={user.id}
              onClick={() => onSelect(user)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              type="button"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e2f7fb] text-[11px] font-black uppercase text-[#007c92]">
                {getInitials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-950">
                  {user.name}
                </span>
                <span className="block truncate text-xs font-bold text-slate-500">
                  {user.email ? `${user.email} - ` : ""}
                  {user.phoneNumber} - {user.role}
                </span>
              </span>
              {isSelected ? (
                <Check className="shrink-0 text-[#007c92]" size={16} />
              ) : null}
            </button>
          );
        })
      ) : (
        <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
          No users found.
        </div>
      )}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}
