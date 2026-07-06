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
      className="h-10 w-[140px] shrink-0 rounded-xl border border-[#EACC84]/35 bg-white/95 px-3 text-[12px] font-semibold text-[#123C36] outline-none shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition focus:border-[#EACC84] focus:ring-3 focus:ring-[#EACC84]/25 max-[640px]:w-full"
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
