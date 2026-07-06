"use client";

export type MobileCalendarMode = "compact" | "full";

export function MobileCalendarModeToggle({
  mode,
  onModeChange,
}: {
  mode: MobileCalendarMode;
  onModeChange: (mode: MobileCalendarMode) => void;
}) {
  return (
    <div className="mb-3 hidden max-[760px]:block">
      <div className="grid grid-cols-2 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] p-1 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <MobileModeButton
          isSelected={mode === "compact"}
          label="Compact view"
          mode="compact"
          onModeChange={onModeChange}
        />
        <MobileModeButton
          isSelected={mode === "full"}
          label="Full calendar"
          mode="full"
          onModeChange={onModeChange}
        />
      </div>
    </div>
  );
}

function MobileModeButton({
  isSelected,
  label,
  mode,
  onModeChange,
}: {
  isSelected: boolean;
  label: string;
  mode: MobileCalendarMode;
  onModeChange: (mode: MobileCalendarMode) => void;
}) {
  function selectMode() {
    onModeChange(mode);
  }

  return (
    <button
      aria-pressed={isSelected}
      className={
        isSelected
          ? "grid h-10 place-items-center rounded-xl bg-[#007c92] px-3 text-center text-xs font-black text-white shadow-[0_10px_20px_rgba(0,124,146,0.18)] transition"
          : "grid h-10 place-items-center rounded-xl px-3 text-center text-xs font-black text-[#0b4658] transition hover:bg-white"
      }
      onClick={selectMode}
      type="button"
    >
      {label}
    </button>
  );
}
