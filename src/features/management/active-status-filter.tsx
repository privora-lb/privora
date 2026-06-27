export type ActiveStatusFilterValue = "all" | "active" | "inactive";

export function ActiveStatusFilter({
  onChange,
  value,
}: {
  onChange: (value: ActiveStatusFilterValue) => void;
  value: ActiveStatusFilterValue;
}) {
  return (
    <select
      aria-label="Filter by active status"
      className="h-10 w-[140px] shrink-0 rounded-xl border border-white/18 bg-white/92 px-3 text-[12px] font-semibold text-[#123342] outline-none shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition focus:border-[#9bdded] focus:ring-3 focus:ring-[#9bdded]/20 max-[640px]:w-full"
      onChange={(event) =>
        onChange(event.target.value as ActiveStatusFilterValue)
      }
      value={value}
    >
      <option value="all">All statuses</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  );
}
