'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import {
  MATERIALS_DEFAULT_PAGE_SIZE,
  MATERIALS_SORTABLE_FIELDS,
} from '@/config/materials';
import type {
  MaterialPropertyResponse,
  MaterialSearchParams,
  MaterialsResponse,
  MaterialSummary,
  RangeFilter,
} from '@/types/materials';
import MaterialCard from "@/components/material-card";
import { MaterialDetailPanel } from "@/components/material-detail-panel";

type MaterialsDashboardProps = {
  initialData: MaterialsResponse;
  initialParams?: MaterialSearchParams;
};

const sortOptions = MATERIALS_SORTABLE_FIELDS.map((field) => ({
  value: field,
  label: prettifyLabel(field),
}));

const pageSizeOptions = [12, 18, 30, 48];
const DETAIL_DATASETS =
  "dielectric,elasticity,piezoelectric,absorption,thermo,magnetism,oxidation,provenance,tasks,surface,substrates,eos";

export default function MaterialsDashboard({
  initialData,
  initialParams,
}: MaterialsDashboardProps) {
  const baseQuery: MaterialSearchParams = {
    page: initialParams?.page ?? 1,
    pageSize: initialParams?.pageSize ?? MATERIALS_DEFAULT_PAGE_SIZE,
    sortField: initialParams?.sortField ?? sortOptions[0].value,
    sortOrder: initialParams?.sortOrder ?? 'asc',
    isStable: initialParams?.isStable ?? true,
  };

  const initialFilters: Partial<MaterialSearchParams> = {
    formula: initialParams?.formula,
    elements: initialParams?.elements,
    bandGap: initialParams?.bandGap,
    energyAboveHull: initialParams?.energyAboveHull,
    density: initialParams?.density,
  };

  const [dataset, setDataset] = useState(initialData);
  const [params, setParams] = useState<MaterialSearchParams>(baseQuery);
  const [activeFilters, setActiveFilters] = useState<Partial<MaterialSearchParams>>(
    initialFilters
  );
  const [formState, setFormState] = useState({
    formula: initialParams?.formula ?? '',
    elements: (initialParams?.elements ?? []).join(', '),
    bandGapMin: initialParams?.bandGap?.min?.toString() ?? '',
    bandGapMax: initialParams?.bandGap?.max?.toString() ?? '',
    energyHullMax: initialParams?.energyAboveHull?.max?.toString() ?? '',
    densityMin: initialParams?.density?.min?.toString() ?? '',
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailProperties, setDetailProperties] = useState<MaterialPropertyResponse | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  const totalDocs = dataset.meta.total_doc ?? dataset.data.length;
  const pageSize = params.pageSize ?? MATERIALS_DEFAULT_PAGE_SIZE;
  const currentPage = params.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalDocs / pageSize));

  const insight = useMemo(() => buildInsights(dataset.data), [dataset.data]);

  const handleInputChange = (field: keyof typeof formState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormState((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters = buildFiltersFromForm(formState);
    runQuery({ page: 1 }, nextFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      formula: undefined,
      elements: undefined,
      bandGap: undefined,
      energyAboveHull: undefined,
      density: undefined,
    } satisfies Partial<MaterialSearchParams>;

    setFormState({ formula: '', elements: '', bandGapMin: '', bandGapMax: '', energyHullMax: '', densityMin: '' });
    runQuery({ page: 1 }, resetFilters);
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage === 1) return;
    if (direction === 'next' && currentPage >= totalPages) return;
    const nextPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    runQuery({ page: nextPage });
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value) || MATERIALS_DEFAULT_PAGE_SIZE;
    runQuery({ pageSize: nextSize, page: 1 });
  };

  const handleSortFieldChange = (event: ChangeEvent<HTMLSelectElement>) => {
    runQuery({ sortField: event.target.value, page: 1 });
  };

  const handleSortOrderToggle = () => {
    runQuery({ sortOrder: params.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 });
  };

  const handleStabilityToggle = () => {
    runQuery({ isStable: !params.isStable, page: 1 });
  };

  const handleInspectMaterial = (material: MaterialSummary) => {
    setSelectedMaterial(material);
    setDetailProperties(null);
    setDetailError(null);
    setDetailLoading(true);

    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }

    const controller = new AbortController();
    detailAbortRef.current = controller;

    const taskIds = material.calc_types
      ? Object.values(material.calc_types)
          .filter((taskId): taskId is string => typeof taskId === 'string' && taskId.length > 0)
      : [];

    const query = new URLSearchParams();
    query.set('datasets', DETAIL_DATASETS);
    if (taskIds.length) {
      query.set('taskIds', taskIds.join(','));
    }

    fetch(`/api/materials/${material.material_id}?${query.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await safeJson(response);
        if (!response.ok) {
          const message =
            typeof (payload as Record<string, unknown>)?.error === 'string'
              ? (payload as Record<string, unknown>).error
              : '无法获取材料详细属性，请检查输入。';
          throw new Error(message);
        }
        return payload as MaterialPropertyResponse;
      })
      .then((data) => {
        setDetailProperties(data);
        setDetailLoading(false);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        console.error(requestError);
        setDetailLoading(false);
        const message =
          requestError instanceof Error
            ? requestError.message
            : '无法获取材料详细属性，请稍后再试。';
        setDetailError(message);
      });
  };

  const handleClosePanel = () => {
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
      detailAbortRef.current = null;
    }
    setSelectedMaterial(null);
    setDetailProperties(null);
    setDetailLoading(false);
    setDetailError(null);
  };

  const runQuery = (
    overrides: Partial<MaterialSearchParams> = {},
    nextFilters?: Partial<MaterialSearchParams>
  ) => {
    const filters = nextFilters ?? activeFilters;
    const nextParams = sanitizeParams({
      ...params,
      ...filters,
      ...overrides,
    });

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextParams),
        });

        const payload = await safeJson(response);
        if (!response.ok) {
          const message =
            typeof (payload as Record<string, unknown>)?.error === 'string'
              ? (payload as Record<string, unknown>).error
              : '无法连接到 Materials Project 数据接口。';
          throw new Error(message);
        }

        const data = payload as MaterialsResponse;
        setDataset(data);
        setParams(nextParams);
        setActiveFilters(filters);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : '无法连接到 Materials Project 数据接口，请稍后重试。';
        setError(message);
        console.error(requestError);
      }
    });
  };

  return (
    <section className="mt-12 space-y-10 text-white">
      <div className="rounded-[36px] border border-white/10 bg-white/5 p-8 backdrop-blur">
        <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              化学式 / Material ID
            </label>
            <input
              value={formState.formula}
              onChange={handleInputChange('formula')}
              placeholder="例如 LiFePO4 或 mp-149"
              className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              元素集合
            </label>
            <input
              value={formState.elements}
              onChange={handleInputChange('elements')}
              placeholder="Li,Fe,P,O"
              className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
          </div>

          <RangeField
            label="Band Gap (eV)"
            minValue={formState.bandGapMin}
            maxValue={formState.bandGapMax}
            onMinChange={handleInputChange('bandGapMin')}
            onMaxChange={handleInputChange('bandGapMax')}
          />
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Energy Above Hull ≤ (eV)
            </label>
            <input
              value={formState.energyHullMax}
              onChange={handleInputChange('energyHullMax')}
              placeholder="0.05"
              className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Density ≥ (g/cm³)
            </label>
            <input
              value={formState.densityMin}
              onChange={handleInputChange('densityMin')}
              placeholder="3.0"
              className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
            <button
              type="submit"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:bg-white/80"
              disabled={isPending}
            >
              {isPending ? '检索中...' : '检索数据'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/80 hover:border-white/40"
            >
              重置条件
            </button>
            <span className="text-xs uppercase tracking-[0.3em] text-white/60">
              数据实时来源于 Materials Project 最新 API
            </span>
          </div>
        </form>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <InsightCard
            title="稳定相比例"
            value={`${Math.round(insight.stableShare * 100)}%`}
            description="在过滤条件下具有稳定预测的材料占比"
          />
          <InsightCard
            title="平均带隙"
            value={`${insight.averageBandGap ?? '—'} eV`}
            description="可直接用于电子结构筛选"
          />
          <InsightCard
            title="密度中位数"
            value={`${insight.medianDensity ?? '—'} g/cm³`}
            description="反映材料堆积效率"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/30 p-6 shadow-xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/70">
              显示 <span className="font-semibold text-white">{dataset.data.length}</span> / {totalDocs} 条材料记录
            </p>
            {isPending && <p className="text-xs text-emerald-200">同步最新计算属性...</p>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2">
              <span className="text-white/60">排序</span>
              <select
                value={params.sortField}
                onChange={handleSortFieldChange}
                className="bg-transparent text-white focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSortOrderToggle}
              className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white"
            >
              {params.sortOrder === 'asc' ? '升序' : '降序'}
            </button>
            <button
              type="button"
              onClick={handleStabilityToggle}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] ${
                params.isStable ? 'bg-emerald-300 text-black' : 'border border-white/20 text-white'
              }`}
            >
              仅稳定相
            </button>
            <label className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2">
              <span className="text-white/60">每页</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="bg-transparent text-white focus:outline-none"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size} className="bg-slate-900">
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-rose-200">{error}</p>}

        <div className="grid gap-5 lg:grid-cols-2">
          {dataset.data.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/20 p-8 text-center text-sm text-white/70">
              当前筛选条件下暂无匹配材料，请调整过滤器。
            </p>
          ) : (
            dataset.data.map((material) => (
              <MaterialCard
                material={material}
                key={material.material_id}
                onInspect={handleInspectMaterial}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-2 text-sm text-[var(--color-muted)]">
          <button
            type="button"
            onClick={() => handlePageChange('prev')}
            disabled={currentPage === 1 || isPending}
            className="rounded-full border border-white/20 px-4 py-2 disabled:opacity-40"
          >
            上一页
          </button>
          <span>
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            type="button"
            onClick={() => handlePageChange('next')}
            disabled={currentPage >= totalPages || isPending}
            className="rounded-full border border-white/20 px-4 py-2 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>

      {insight.highlight && (
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-r from-indigo-900/40 to-emerald-900/40 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-white/70">Focus Material</p>
          <h4 className="mt-2 text-3xl font-semibold">{insight.highlight.formula_pretty}</h4>
          <p className="mt-2 text-sm text-white/70">
            {insight.highlight.material_id} · band gap {formatNumber(insight.highlight.band_gap)} eV · density{' '}
            {formatNumber(insight.highlight.density)} g/cm³
          </p>
        </div>
      )}

      <MaterialDetailPanel
        material={selectedMaterial}
        properties={detailProperties}
        loading={detailLoading}
        errorMessage={detailError}
        onClose={handleClosePanel}
      />
    </section>
  );
}

function buildFiltersFromForm(formState: {
  formula: string;
  elements: string;
  bandGapMin: string;
  bandGapMax: string;
  energyHullMax: string;
  densityMin: string;
}): Partial<MaterialSearchParams> {
  return {
    formula: formState.formula.trim() || undefined,
    elements: splitToArray(formState.elements),
    bandGap: toRange(formState.bandGapMin, formState.bandGapMax),
    energyAboveHull: toRange(undefined, formState.energyHullMax),
    density: toRange(formState.densityMin, undefined),
  };
}

function splitToArray(value: string) {
  const cleaned = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

function toRange(minValue?: string, maxValue?: string): RangeFilter | undefined {
  const min = parseFloat(minValue ?? '');
  const max = parseFloat(maxValue ?? '');
  const hasMin = !Number.isNaN(min);
  const hasMax = !Number.isNaN(max);
  if (!hasMin && !hasMax) return undefined;
  if (hasMin && hasMax && min > max) {
    return { min: max, max: min };
  }
  return {
    min: hasMin ? min : undefined,
    max: hasMax ? max : undefined,
  };
}

function sanitizeParams(params: MaterialSearchParams): MaterialSearchParams {
  const cleaned: MaterialSearchParams = {};

  (Object.keys(params) as (keyof MaterialSearchParams)[]).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length) {
        cleaned[key] = value;
      }
      return;
    }

    if (typeof value === 'object') {
      const range = value as RangeFilter;
      const hasMin = typeof range.min === 'number';
      const hasMax = typeof range.max === 'number';
      if (hasMin || hasMax) {
        cleaned[key] = {
          ...(hasMin ? { min: range.min } : {}),
          ...(hasMax ? { max: range.max } : {}),
        } as RangeFilter;
      }
      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
}

function buildInsights(materials: MaterialSummary[]) {
  if (!materials.length) {
    return {
      stableShare: 0,
      averageBandGap: null,
      medianDensity: null,
      highlight: undefined,
    } as const;
  }

  const stableShare =
    materials.filter((material) => material.is_stable).length / materials.length;
  const bandGaps = materials
    .map((material) => material.band_gap)
    .filter((value): value is number => typeof value === 'number');
  const averageBandGap = bandGaps.length
    ? formatNumber(bandGaps.reduce((sum, value) => sum + value, 0) / bandGaps.length)
    : null;

  const densities = materials
    .map((material) => material.density)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);
  const medianDensity = densities.length
    ? formatNumber(densities[Math.floor(densities.length / 2)])
    : null;

  const highlight = materials
    .slice()
    .sort((a, b) => (b.band_gap ?? 0) - (a.band_gap ?? 0))[0];

  return { stableShare, averageBandGap, medianDensity, highlight } as const;
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) {
    return null;
  }
  return Number(value.toFixed(2));
}

function prettifyLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type RangeFieldProps = {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMaxChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function RangeField({ label, minValue, maxValue, onMinChange, onMaxChange }: RangeFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-[0.3em] text-white/60">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <input
          value={minValue}
          onChange={onMinChange}
          placeholder="min"
          className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
        />
        <input
          value={maxValue}
          onChange={onMaxChange}
          placeholder="max"
          className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
        />
      </div>
    </div>
  );
}

type InsightCardProps = {
  title: string;
  value: string;
  description: string;
};

function InsightCard({ title, value, description }: InsightCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
