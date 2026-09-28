/** Fact table styled as a clapper slate: striped hinge, ruled rows. */
export function Slate({ title, rows }: { title: string; rows: [string, string][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block">
      <div className="slate-stripes" aria-hidden="true" />
      <p className="border-b-2 border-ink px-4 py-3 font-display text-lg font-bold">{title}</p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-fog last:border-0">
              <th scope="row" className="w-2/5 px-4 py-2.5 text-left font-medium text-muted">
                {label}
              </th>
              <td className="px-4 py-2.5 font-semibold text-ink">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
