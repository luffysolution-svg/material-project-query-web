import type { MaterialSummary } from "@/types/materials";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
});

type MaterialCardProps = {
  material: MaterialSummary;
  onInspect?: (material: MaterialSummary) => void;
};

export default function MaterialCard({ material, onInspect }: MaterialCardProps) {
  const symmetryChips = [
    material.symmetry?.symbol,
    material.symmetry?.crystal_system,
    material.symmetry?.point_group,
  ].filter(Boolean);

  const properties = [
    { label: "Band gap (eV)", value: material.band_gap },
    { label: "Formation energy (eV/atom)", value: material.formation_energy_per_atom },
    { label: "Energy above hull (eV/atom)", value: material.energy_above_hull },
    { label: "Density (g/cm³)", value: material.density },
    { label: "Volume (Å³)", value: material.volume },
    { label: "Total magnetization (μB)", value: material.total_magnetization },
  ];

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">
              {material.material_id}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              {material.formula_pretty}
            </h3>
          </div>
          <div className="flex flex-col items-end text-right text-xs uppercase tracking-widest text-emerald-300">
            <span className="font-semibold">
              {material.is_stable ? "Stable" : "Metastable"}
            </span>
            {material.theoretical && (
              <span className="text-white/60">Predicted</span>
            )}
          </div>
        </div>
        {symmetryChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {symmetryChips.map((entry) => (
              <span
                key={entry as string}
                className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/80"
              >
                {entry}
              </span>
            ))}
          </div>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-4 text-sm text-white/80 sm:grid-cols-2">
        {properties.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-white/50">
              {label}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-white">
              {formatNumber(value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2 text-xs text-white/70">
        {material.elements.map((element) => (
          <span
            key={element}
            className="rounded-full bg-white/10 px-3 py-1 tracking-[0.25em] text-white"
          >
            {element}
          </span>
        ))}
      </div>

      {material.has_props && material.has_props.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Data coverage
          </p>
          <div className="flex flex-wrap gap-2">
            {material.has_props.map((entry) => (
              <span
                key={entry}
                className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-white"
              >
                {entry.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      <footer className="flex items-center justify-between text-xs text-white/50">
        <div className="flex flex-col gap-1">
          <span>
            {material.last_updated ? `Updated ${formatDate(material.last_updated)}` : "Recent dataset"}
          </span>
          {onInspect && (
            <button
              type="button"
              onClick={() => onInspect(material)}
              className="w-max rounded-full border border-white/30 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white hover:border-white"
            >
              查看物性
            </button>
          )}
        </div>
        <span className="uppercase tracking-[0.3em]">
          {material.nelements} elem · {material.nsites ?? "–"} sites
        </span>
      </footer>
    </article>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }
  return numberFormatter.format(value);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
