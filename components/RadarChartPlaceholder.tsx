import type { AttributeScore } from "@/types/dashboard";
import { RadarMap } from "@/components/RadarMap";

type RadarChartPlaceholderProps = {
  attributes: AttributeScore[];
};

export function RadarChartPlaceholder({
  attributes
}: RadarChartPlaceholderProps) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center">
      <RadarMap
        ariaLabel="Attribute radar map"
        data={attributes.map((attribute) => ({
          id: attribute.label,
          label: attribute.label,
          value: attribute.value
        }))}
      />

      <ul className="grid gap-2 text-sm">
        {attributes.map((attribute) => (
          <li
            className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
            key={attribute.label}
          >
            <span className="text-slate-600">{attribute.label}</span>
            <span className="font-semibold text-slate-950">
              {attribute.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
