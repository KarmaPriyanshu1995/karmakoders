import { Check, Minus } from "lucide-react";
import { COMPARISON_COLUMNS, PLAN_COMPARISON } from "@/platform/billing/plans";

/** Feature comparison by plan; data only from plans.ts. Horizontal scroll on small screens. */
export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10" tabIndex={0} role="region" aria-label="Plan comparison">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">Feature comparison by plan</caption>
        <thead className="bg-[#1C1B1A]">
          <tr>
            <th scope="col" className="p-4 font-semibold text-white">
              Feature
            </th>
            {COMPARISON_COLUMNS.map((column) => (
              <th key={column.id} scope="col" className="p-4 font-semibold text-white">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_COMPARISON.map((row) => (
            <tr key={row.feature} className="border-t border-white/10">
              <th scope="row" className="p-4 font-normal text-white">
                {row.feature}
              </th>
              {COMPARISON_COLUMNS.map((column) => {
                const value = row.values[column.id];
                return (
                  <td key={column.id} className="p-4 text-[#A39F97]">
                    {value === true ? (
                      <>
                        <Check aria-hidden className="size-4 text-[#FFC300]" />
                        <span className="sr-only">Included</span>
                      </>
                    ) : value === false ? (
                      <>
                        <Minus aria-hidden className="size-4" />
                        <span className="sr-only">Not included</span>
                      </>
                    ) : (
                      value
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
