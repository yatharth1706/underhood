import type { Share } from "@/lib/findings/types";

/**
 * Horizontal bar chart as a table: it *is* the table view. One series, so one
 * hue: highlighted bars in the accent, the rest in muted ink. Values are
 * direct-labeled; the title tooltip adds the raw count.
 */
export function Bars({ bars, highlight, total }: { bars: Share[]; highlight: string[]; total: number }) {
  const max = Math.max(...bars.map((b) => b.share), 0.0001);
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sr-only">
        <tr>
          <th>Label</th>
          <th>Share</th>
          <th>Companies</th>
        </tr>
      </thead>
      <tbody>
        {bars.map((b) => {
          const hot = highlight.includes(b.label);
          return (
            <tr
              key={b.label}
              className="group hover:bg-paper-2"
              title={`${b.label}: ${b.count.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} companies (${(b.share * 100).toFixed(1)}%)`}
            >
              <th scope="row" className={`w-[38%] py-[5px] pr-3 text-left align-middle font-normal sm:w-[30%] ${hot ? "font-medium" : ""}`}>
                {b.label}
              </th>
              <td className="py-[5px] align-middle">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 min-w-0 flex-1">
                    <div
                      className={`h-full rounded-r-[4px] ${hot ? "bg-bar" : "bg-bar-muted"} group-hover:opacity-85`}
                      style={{ width: `${Math.max((b.share / max) * 100, 0.6)}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="w-24 py-[5px] pl-3 text-right align-middle font-mono text-xs whitespace-nowrap tabular-nums">
                {(b.share * 100).toFixed(b.share < 0.1 ? 1 : 0)}%
                <span className="ml-1.5 text-muted">{b.count.toLocaleString("en-US")}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
