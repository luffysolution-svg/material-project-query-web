'use client';

import type {
  AbsorptionProperty,
  EosProperty,
  MaterialPropertyResponse,
  MaterialSummary,
  ProvenanceCalculation,
  SubstrateMatch,
  TaskProperty,
} from '@/types/materials';

type MaterialDetailPanelProps = {
  material: MaterialSummary | null;
  properties: MaterialPropertyResponse | null;
  loading: boolean;
  errorMessage?: string | null;
  onClose: () => void;
};

export function MaterialDetailPanel({
  material,
  properties,
  loading,
  errorMessage,
  onClose,
}: MaterialDetailPanelProps) {
  if (!material) {
    return null;
  }

  const hasData = Boolean(
    properties?.dielectric ||
      properties?.elasticity ||
      properties?.piezoelectric ||
      properties?.absorption ||
      properties?.thermo ||
      properties?.magnetism ||
      properties?.oxidation ||
      properties?.provenance ||
      properties?.surface ||
      properties?.substrates?.length ||
      properties?.eos ||
      (properties?.tasks?.length ?? 0) > 0
  );
  const chips = [
    material.symmetry?.symbol,
    material.symmetry?.crystal_system,
    material.symmetry?.point_group,
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full items-end justify-center p-4 sm:items-center">
        <div className="w-full max-w-4xl rounded-[32px] border border-white/15 bg-slate-950/90 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">MP DETAIL SHEET</p>
              <h2 className="mt-2 text-3xl font-semibold">
                {material.formula_pretty} · {material.material_id}
              </h2>
              {chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                  {chips.map((chip) => (
                    <span key={chip} className="rounded-full border border-white/20 px-3 py-1">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-white/70">
              <span>
                {material.is_stable ? '稳定相' : '亚稳相'} · {material.theoretical ? '理论预测' : '实验衍生'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/30 px-4 py-2 text-sm uppercase tracking-[0.3em] text-white hover:border-white"
              >
                关闭
              </button>
            </div>
          </div>

          {loading && (
            <p className="mt-6 animate-pulse text-sm text-white/70">正在同步 Materials Project 详细属性…</p>
          )}

          {errorMessage && !loading && (
            <p className="mt-6 text-sm text-rose-300">{errorMessage}</p>
          )}

          {hasData && (
            <div className="mt-6 space-y-6">
              {properties?.dielectric && (
                <PropertySection
                  title="介电常数"
                  description="materials/dielectric"
                  items={[
                    { label: 'ε_total', value: formatValue(properties.dielectric.e_total, '—') },
                    { label: 'ε_ionic', value: formatValue(properties.dielectric.e_ionic, '—') },
                    { label: 'ε_electronic', value: formatValue(properties.dielectric.e_electronic, '—') },
                    { label: '折射率 n', value: formatValue(properties.dielectric.n, '—') },
                  ]}
                />
              )}

              {properties?.elasticity && (
                <PropertySection
                  title="弹性张量"
                  description="materials/elasticity (GPa)"
                  items={[
                    { label: 'K_VRH', value: formatValue(properties.elasticity.k_vrh, '—') },
                    { label: 'G_VRH', value: formatValue(properties.elasticity.g_vrh, '—') },
                    {
                      label: 'Poisson 比',
                      value: formatValue(properties.elasticity.homogeneous_poisson, '—'),
                    },
                    {
                      label: '通用各向异性',
                      value: formatValue(properties.elasticity.universal_anisotropy, '—'),
                    },
                  ]}
                />
              )}

              {properties?.piezoelectric && (
                <PropertySection
                  title="压电响应"
                  description="materials/piezoelectric"
                  items={[
                    { label: 'e_ij_max (C/m²)', value: formatValue(properties.piezoelectric.e_ij_max, '—') },
                    {
                      label: '最大响应方向',
                      value: properties.piezoelectric.max_direction?.join(' ') || '—',
                    },
                    {
                      label: '对应应变轨迹',
                      value:
                        properties.piezoelectric.strain_for_max?.map((v) => v.toFixed(2)).join(' ') || '—',
                    },
                  ]}
                />
              )}

              {properties?.absorption && (
                <PropertySection
                  title="光学吸收"
                  description="materials/absorption (cm⁻¹)"
                  items={[
                    {
                      label: '带隙 (eV)',
                      value: formatValue(properties.absorption.bandgap, '—'),
                    },
                    {
                      label: '能量范围上限 (eV)',
                      value: formatValue(properties.absorption.energy_max, '—'),
                    },
                    {
                      label: '最大吸收系数',
                      value: formatAbsorptionPeak(properties.absorption),
                    },
                    {
                      label: '对应能量 (eV)',
                      value: formatAbsorptionPeakEnergy(properties.absorption, '—'),
                    },
                  ]}
                />
              )}

              {properties?.thermo && (
                <PropertySection
                  title="热力学参数"
                  description="materials/thermo"
                  items={[
                    {
                      label: 'E_form (eV/atom)',
                      value: formatValue(properties.thermo.formation_energy_per_atom, '—'),
                    },
                    {
                      label: 'E_hull (eV/atom)',
                      value: formatValue(properties.thermo.energy_above_hull, '—'),
                    },
                    {
                      label: 'E_per_atom',
                      value: formatValue(properties.thermo.energy_per_atom, '—'),
                    },
                    {
                      label: 'Equilibrium',
                      value: formatValue(properties.thermo.equilibrium_reaction_energy_per_atom, '—'),
                    },
                  ]}
                />
              )}

              {properties?.magnetism && (
                <PropertySection
                  title="磁性指标"
                  description="materials/magnetism"
                  items={[
                    { label: 'Ordering', value: properties.magnetism.ordering || '—' },
                    {
                      label: 'M_total (μB)',
                      value: formatValue(properties.magnetism.total_magnetization, '—'),
                    },
                    {
                      label: 'T_order (K)',
                      value: formatValue(properties.magnetism.ordering_temperature, '—'),
                    },
                    {
                      label: '是否磁性',
                      value: typeof properties.magnetism.is_magnetic === 'boolean'
                        ? properties.magnetism.is_magnetic
                          ? '是'
                          : '否'
                        : '—',
                    },
                  ]}
                />
              )}

              {properties?.oxidation && (
                <PropertySection
                  title="氧化态统计"
                  description="materials/oxidation_states"
                  items={[
                    {
                      label: '氧化态映射',
                      value: formatOxidationStates(properties.oxidation.oxidation_states),
                    },
                    {
                      label: '可能物种',
                      value: properties.oxidation.possible_species?.join(', ') || '—',
                    },
                  ]}
                />
              )}

              {properties?.provenance && (
                <PropertySection
                  title="计算溯源"
                  description="materials/provenance"
                  items={[
                    {
                      label: '任务数量',
                      value: properties.provenance.calculations?.length ?? 0,
                    },
                    {
                      label: '最新任务',
                      value: formatLatestCalculation(properties.provenance.calculations),
                    },
                    {
                      label: '理论来源',
                      value: typeof properties.provenance.theoretical === 'boolean'
                        ? properties.provenance.theoretical
                          ? '理论'
                          : '实验'
                        : '—',
                    },
                    {
                      label: '是否弃用',
                      value: typeof properties.provenance.deprecated === 'boolean'
                        ? properties.provenance.deprecated
                          ? '是'
                          : '否'
                        : '—',
                    },
                  ]}
                />
              )}

              {properties?.tasks && properties.tasks.length > 0 && (
                <TaskSection tasks={properties.tasks} />
              )}

              {properties?.surface && (
                <PropertySection
                  title="表面属性"
                  description="materials/surface_properties"
                  items={[
                    {
                      label: '加权表面能 (J/m²)',
                      value: formatValue(properties.surface.weighted_surface_energy, '—'),
                    },
                    {
                      label: '加权表面能 (eV/Å²)',
                      value: formatValue(
                        properties.surface.weighted_surface_energy_EV_PER_ANG2,
                        '—'
                      ),
                    },
                    {
                      label: '加权功函 (eV)',
                      value: formatValue(properties.surface.weighted_work_function, '—'),
                    },
                    {
                      label: '表面各向异性',
                      value: formatValue(properties.surface.surface_anisotropy, '—'),
                    },
                    {
                      label: '存在重构面',
                      value: formatBoolean(properties.surface.has_reconstructed),
                    },
                  ]}
                />
              )}

              {properties?.substrates && properties.substrates.length > 0 && (
                <SubstrateSection substrates={properties.substrates} />
              )}

              {properties?.eos && (
                <PropertySection
                  title="状态方程"
                  description="materials/eos"
                  items={buildEosItems(properties.eos)}
                />
              )}
            </div>
          )}

          {!hasData && !loading && (
            <p className="mt-6 text-sm text-white/70">
              当前材料暂无可展示的高级物性数据，可尝试查看其它数据类型或放宽筛选条件。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type PropertySectionProps = {
  title: string;
  description: string;
  items: { label: string; value: string | number }[];
};

function PropertySection({ title, description, items }: PropertySectionProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">{title}</p>
          <p className="text-sm text-white/60">{description}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <dt className="text-xs uppercase tracking-[0.3em] text-white/50">{item.label}</dt>
            <dd className="mt-2 text-2xl font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type TaskSectionProps = {
  tasks: TaskProperty[];
};

function TaskSection({ tasks }: TaskSectionProps) {
  const displayCount = Math.min(tasks.length, 4);
  const subset = tasks.slice(0, displayCount);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">计算任务</p>
          <p className="text-sm text-white/60">materials/tasks (仅展示最新 {displayCount} 条)</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {subset.map((task) => (
          <div key={task.task_id ?? `${task.material_id}-${task.task_type}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              {task.task_type ?? '任务'}
            </p>
            <p className="mt-2 text-lg font-semibold">{task.task_id ?? '未提供任务ID'}</p>
            <p className="text-sm text-white/60">
              {task.state ? `状态：${task.state}` : '状态未知'}
            </p>
            <p className="text-sm text-white/60">
              {task.energy_per_atom !== undefined
                ? `E/atom = ${formatValue(task.energy_per_atom, '—')} eV`
                : '—'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

type SubstrateSectionProps = {
  substrates: SubstrateMatch[];
};

function SubstrateSection({ substrates }: SubstrateSectionProps) {
  const subset = substrates
    .slice()
    .sort(
      (a, b) =>
        (a.energy ?? Number.POSITIVE_INFINITY) -
        (b.energy ?? Number.POSITIVE_INFINITY)
    )
    .slice(0, 4);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">外延基底</p>
          <p className="text-sm text-white/60">materials/substrates（最低应变能）</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {subset.map((substrate) => (
          <div
            key={`${substrate.sub_id}-${substrate.orient}-${substrate.film_orient}`}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              {substrate.sub_form ?? '未知基底'}
            </p>
            <p className="mt-2 text-lg font-semibold">
              {substrate.sub_id ?? '—'}
            </p>
            <p className="text-sm text-white/60">
              基面 {substrate.orient ?? '—'} / 薄膜 {substrate.film_orient ?? '—'}
            </p>
            <p className="text-sm text-white/60">
              能量 {formatValue(substrate.energy ?? null, '—')} meV · 接触面积{' '}
              {formatValue(substrate.area ?? null, '—')} Å²
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatValue(value: number | null | undefined, fallback: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Number(value.toFixed(3));
}

function getAbsorptionPeak(absorption?: AbsorptionProperty) {
  const coefficients = absorption?.absorption_coefficient;
  if (!coefficients || !coefficients.length) {
    return undefined;
  }
  let alpha = -Infinity;
  let index = -1;
  coefficients.forEach((value, idx) => {
    if (typeof value === 'number' && value > alpha) {
      alpha = value;
      index = idx;
    }
  });
  if (!Number.isFinite(alpha)) {
    return undefined;
  }
  const energy = absorption?.energies?.[index];
  return { alpha, energy };
}

function formatAbsorptionPeak(absorption?: AbsorptionProperty) {
  const peak = getAbsorptionPeak(absorption);
  if (!peak) return '—';
  return formatValue(peak.alpha, '—');
}

function formatAbsorptionPeakEnergy(absorption?: AbsorptionProperty, fallback?: string) {
  const peak = getAbsorptionPeak(absorption);
  if (!peak) return fallback ?? '—';
  return formatValue(peak.energy ?? null, fallback ?? '—');
}

function formatBoolean(value?: boolean | null) {
  if (typeof value !== 'boolean') return '—';
  return value ? '是' : '否';
}

function buildEosItems(eos?: EosProperty) {
  const primary = eos?.eos?.[0];
  return [
    { label: '拟合模型', value: primary?.model ?? '—' },
    { label: 'V0 (Å³)', value: formatValue(primary?.V0 ?? null, '—') },
    { label: 'B0 (GPa)', value: formatValue(primary?.B0 ?? null, '—') },
    { label: 'B1', value: formatValue(primary?.B1 ?? null, '—') },
    {
      label: '拟合优度 R²',
      value: formatValue(primary?.R2 ?? null, '—'),
    },
    {
      label: '数据点数量',
      value: eos?.volumes?.length ?? '—',
    },
  ];
}

function formatOxidationStates(
  value?: Record<string, number[]> | number[] | null
): string {
  if (!value) {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }

  const entries = Object.entries(value).map(([key, states]) => {
    if (Array.isArray(states) && states.length) {
      return `${key}: ${states.join('/')}`;
    }
    if (typeof states === 'number') {
      return `${key}: ${states}`;
    }
    return key;
  });

  return entries.length ? entries.join(' | ') : '—';
}

function formatLatestCalculation(calculations?: ProvenanceCalculation[]) {
  if (!calculations?.length) {
    return '—';
  }

  const [latest] = calculations;
  const parts = [
    latest.task_type,
    latest.run_type,
    latest.workflow,
    latest.task_id,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : '—';
}
