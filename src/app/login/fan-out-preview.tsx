import { StatusMark } from "../(app)/workpaper-parts";

/**
 * Static miniature of the model: one task, one independently stamped cell
 * per company. Illustrative sample data, labelled as such on the page.
 */
const COMPANIES = ["Bergtun", "Nordvik", "Havstad", "Solvik"] as const;
type Cell = { state: "completed" | "na" | "open"; stamp?: string };

const TASKS: { title: string; cells: Cell[] }[] = [
  {
    title: "Reconcile bank accounts",
    cells: [
      { state: "completed", stamp: "AB 09.10" },
      { state: "completed", stamp: "AB 09.10" },
      { state: "na", stamp: "CD 10.10" },
      { state: "open" },
    ],
  },
  {
    title: "Credit control follow-up",
    cells: [
      { state: "completed", stamp: "CD 08.10" },
      { state: "open" },
      { state: "open" },
      { state: "open" },
    ],
  },
  {
    title: "Customer statements",
    cells: [
      { state: "completed", stamp: "AB 07.10" },
      { state: "completed", stamp: "AB 07.10" },
      { state: "completed", stamp: "CD 08.10" },
      { state: "completed", stamp: "AB 08.10" },
    ],
  },
];

export function FanOutPreview() {
  return (
    <figure className="overflow-hidden rounded-md border bg-card">
      <figcaption className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
        <span>One task becomes one stamped cell per company</span>
        <span className="rounded-sm border px-1.5 font-medium">Example data</span>
      </figcaption>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-[34%] px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">
              Task
            </th>
            {COMPANIES.map((c) => (
              <th key={c} scope="col" className="px-1 py-1.5 text-center text-xs font-medium text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TASKS.map((task) => (
            <tr key={task.title} className="border-t">
              <th scope="row" className="px-3 py-2 text-left text-sm font-medium">
                {task.title}
              </th>
              {task.cells.map((cell, i) => (
                <td key={i} className="px-1 py-2 text-center">
                  <div className="flex min-h-11 flex-col items-center justify-center gap-0.5">
                    <StatusMark status={cell.state} />
                    <span className="font-mono text-xs leading-none text-foreground/80">
                      {cell.stamp ?? "open"}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
