import "server-only";

import {
  MATERIALS_DEFAULT_PAGE_SIZE,
  MATERIALS_MAX_PAGE_SIZE,
  MATERIALS_SORTABLE_FIELDS,
  MATERIAL_DATASETS,
  type MaterialDataset,
} from "@/config/materials";
import type {
  AbsorptionProperty,
  DielectricProperty,
  ElasticityProperty,
  EosProperty,
  MaterialPropertyResponse,
  MaterialSearchParams,
  MaterialsResponse,
  MagnetismProperty,
  OxidationStateProperty,
  PiezoelectricProperty,
  ProvenanceProperty,
  RangeFilter,
  SubstrateMatch,
  SurfaceProperty,
  TaskProperty,
  ThermoProperty,
} from "@/types/materials";

const API_BASE_URL = "https://api.materialsproject.org/";
const SUMMARY_ENDPOINT = "materials/summary/";

export class MaterialsApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "MaterialsApiError";
  }
}

const SUMMARY_FIELDS = [
  "material_id",
  "formula_pretty",
  "elements",
  "nelements",
  "nsites",
  "energy_above_hull",
  "formation_energy_per_atom",
  "band_gap",
  "density",
  "volume",
  "total_magnetization",
  "total_magnetization_normalized_vol",
  "is_stable",
  "theoretical",
  "has_props",
  "warnings",
  "calc_types",
  "symmetry",
  "last_updated",
];

const RANGE_PARAM_MAP: Record<
  keyof Pick<
    MaterialSearchParams,
    "bandGap" | "energyAboveHull" | "formationEnergy" | "density" | "volume" | "totalMagnetization"
  >,
  string
> = {
  bandGap: "band_gap",
  energyAboveHull: "energy_above_hull",
  formationEnergy: "formation_energy_per_atom",
  density: "density",
  volume: "volume",
  totalMagnetization: "total_magnetization",
};

const SORTABLE_FIELDS = new Set(MATERIALS_SORTABLE_FIELDS);

export async function fetchMaterials(
  params: MaterialSearchParams = {}
): Promise<MaterialsResponse> {
  const pagination = normalizePagination(params.page, params.pageSize);
  const searchParams = buildQuery({ ...params, ...pagination });
  const apiKey = process.env.MP_API_KEY;

  if (!apiKey) {
    throw new MaterialsApiError(
      500,
      "未配置 MP_API_KEY，无法连接 Materials Project API。"
    );
  }

  try {
    const payload = await fetchMpEndpoint<MaterialsResponse>(
      SUMMARY_ENDPOINT,
      searchParams,
      apiKey
    );

    return {
      data: payload.data,
      meta: {
        total_doc: payload.meta?.total_doc ?? payload.data.length,
        limit: pagination.pageSize,
        skip: (pagination.page - 1) * pagination.pageSize,
        message: payload.meta?.message,
      },
    };
  } catch (error) {
    if (error instanceof MaterialsApiError) {
      throw error;
    }
    const message =
      error instanceof Error
        ? error.message
        : "Materials Project Summary 请求失败。";
    throw new MaterialsApiError(502, message);
  }
}

type MaterialPropertyOptions = {
  taskIds?: string[];
};

export async function fetchMaterialProperties(
  materialId: string,
  datasets: MaterialDataset[],
  options: MaterialPropertyOptions = {}
): Promise<MaterialPropertyResponse> {
  const apiKey = process.env.MP_API_KEY;

  if (!apiKey) {
    throw new MaterialsApiError(
      500,
      "未配置 MP_API_KEY，无法获取材料详细属性。"
    );
  }

  try {
    const validDatasets = datasets.filter((dataset) => dataset in MATERIAL_DATASETS);
    const datasetsToFetch = validDatasets.filter(
      (dataset) => dataset !== "tasks" || (options.taskIds && options.taskIds.length > 0)
    );
    const results = await Promise.all(
      datasetsToFetch.map(async (dataset) => {
        const entry = await fetchDatasetEntry(
          dataset as MaterialDataset,
          materialId,
          apiKey,
          options
        );
        return { dataset, entry };
      })
    );

    const response: MaterialPropertyResponse = { material_id: materialId };

    for (const item of results) {
      if (!item || !item.entry) continue;
      if (item.dataset === "dielectric") {
        response.dielectric = item.entry as DielectricProperty;
      }
      if (item.dataset === "elasticity") {
        response.elasticity = item.entry as ElasticityProperty;
      }
    if (item.dataset === "piezoelectric") {
      response.piezoelectric = item.entry as PiezoelectricProperty;
    }
    if (item.dataset === "absorption") {
      response.absorption = item.entry as AbsorptionProperty;
    }
    if (item.dataset === "thermo") {
      response.thermo = item.entry as ThermoProperty;
    }
    if (item.dataset === "magnetism") {
      response.magnetism = item.entry as MagnetismProperty;
      }
      if (item.dataset === "oxidation") {
        response.oxidation = item.entry as OxidationStateProperty;
      }
      if (item.dataset === "provenance") {
        response.provenance = item.entry as ProvenanceProperty;
      }
    if (item.dataset === "tasks") {
      response.tasks = Array.isArray(item.entry)
        ? (item.entry as TaskProperty[])
        : item.entry
          ? [item.entry as TaskProperty]
          : [];
    }
    if (item.dataset === "surface") {
      response.surface = item.entry as SurfaceProperty;
    }
    if (item.dataset === "substrates") {
      const raw = item.entry as SubstrateMatch[];
      response.substrates = Array.isArray(raw)
        ? raw.map((entry) => ({
            ...entry,
            norients:
              entry.norients ??
              (entry as Record<string, unknown>)["_norients"] ??
              undefined,
          }))
        : undefined;
    }
    if (item.dataset === "eos") {
      response.eos = item.entry as EosProperty;
    }
  }

    return response;
  } catch (error) {
    if (error instanceof MaterialsApiError) {
      throw error;
    }
    const message =
      error instanceof Error
        ? error.message
        : "Materials Project 属性接口请求失败。";
    throw new MaterialsApiError(502, message);
  }
}

type DatasetEntryMap = {
  dielectric: DielectricProperty;
  elasticity: ElasticityProperty;
  piezoelectric: PiezoelectricProperty;
  absorption: AbsorptionProperty;
  thermo: ThermoProperty;
  magnetism: MagnetismProperty;
  oxidation: OxidationStateProperty;
  provenance: ProvenanceProperty;
  tasks: TaskProperty[];
  surface: SurfaceProperty;
  substrates: SubstrateMatch[];
  eos: EosProperty;
};

async function fetchDatasetEntry<D extends MaterialDataset>(
  dataset: D,
  materialId: string,
  apiKey: string,
  options: MaterialPropertyOptions
) {
  const config = MATERIAL_DATASETS[dataset];
  const searchParams = new URLSearchParams();
  const limit = config.limit ?? (config.multiple ? 10 : 1);
  searchParams.set("_limit", limit.toString());

  if (dataset === "tasks") {
    const taskIds = options.taskIds?.map((id) => id.trim()).filter((id): id is string => id.length > 0);
    if (!taskIds || !taskIds.length) {
      throw new MaterialsApiError(
        400,
        "该材料未包含可用的 task_ids，无法查询计算任务。"
      );
    }
    searchParams.set("task_ids", taskIds.join(","));
  } else if (dataset === "substrates") {
    searchParams.set("film_id", materialId);
  } else {
    searchParams.set("material_ids", materialId);
  }

  if (config.fields?.length) {
    searchParams.set("_all_fields", "false");
    searchParams.set("_fields", config.fields.join(","));
  } else {
    searchParams.set("_all_fields", "true");
  }

  type DatasetResponse<D extends MaterialDataset> = DatasetEntryMap[D] extends Array<unknown>
    ? DatasetEntryMap[D]
    : DatasetEntryMap[D][];

  const payload = await fetchMpEndpoint<{ data: DatasetResponse<D> }>(
    config.path,
    searchParams,
    apiKey
  );

  if (config.multiple) {
    return (payload.data ?? []) as DatasetEntryMap[D];
  }

  const entries = (payload.data ?? []) as DatasetEntryMap[D][];
  return entries[0];
}

function buildQuery(params: MaterialSearchParams & { page: number; pageSize: number }) {
  const query = new URLSearchParams();
  query.set("_limit", params.pageSize.toString());
  query.set("_skip", Math.max(0, (params.page - 1) * params.pageSize).toString());
  query.set("_all_fields", "false");
  query.set("_fields", SUMMARY_FIELDS.join(","));

  const sortField = params.sortField && SORTABLE_FIELDS.has(params.sortField)
    ? params.sortField
    : "energy_above_hull";
  const sortOrder = params.sortOrder === "desc" ? "desc" : "asc";
  query.set("_sort_fields", `${sortOrder === "desc" ? "-" : ""}${sortField}`);

  appendCsv(query, "formula", normalizeCsv(params.formula));
  appendCsv(query, "chemsys", normalizeCsv(params.chemsys));
  appendCsv(query, "elements", params.elements);
  appendCsv(query, "exclude_elements", params.excludeElements);
  appendCsv(query, "possible_species", params.possibleSpecies);
  appendCsv(query, "has_props", params.hasProps);

  if (typeof params.crystalSystem === "string" && params.crystalSystem.trim()) {
    query.set("crystal_system", params.crystalSystem.trim());
  }

  if (typeof params.spacegroupSymbol === "string" && params.spacegroupSymbol.trim()) {
    query.set("spacegroup_symbol", params.spacegroupSymbol.trim());
  }

  if (typeof params.isStable === "boolean") {
    query.set("is_stable", String(params.isStable));
  }

  if (typeof params.theoretical === "boolean") {
    query.set("theoretical", String(params.theoretical));
  }

  for (const [key, apiField] of Object.entries(RANGE_PARAM_MAP)) {
    const range = params[key as keyof typeof RANGE_PARAM_MAP];
    appendRange(query, apiField, range as RangeFilter | undefined);
  }

  return query;
}

function appendCsv(
  query: URLSearchParams,
  key: string,
  values?: string | string[] | null
) {
  if (!values) return;
  const normalized = Array.isArray(values) ? values : values.split(",");
  const cleaned = normalized
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (cleaned.length) {
    query.set(key, cleaned.join(","));
  }
}

function normalizeCsv(value?: string) {
  if (!value) return undefined;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(",");
}

function appendRange(query: URLSearchParams, field: string, range?: RangeFilter) {
  if (!range) return;
  const normalized = normalizeRange(range);
  if (!normalized) return;

  if (typeof normalized.min === "number") {
    query.set(`${field}_min`, normalized.min.toString());
  }

  if (typeof normalized.max === "number") {
    query.set(`${field}_max`, normalized.max.toString());
  }
}

function normalizeRange(range: RangeFilter): RangeFilter | undefined {
  const min = isFiniteNumber(range.min) ? Number(range.min) : undefined;
  const max = isFiniteNumber(range.max) ? Number(range.max) : undefined;

  if (min === undefined && max === undefined) {
    return undefined;
  }

  if (min !== undefined && max !== undefined && min > max) {
    return { min: max, max: min };
  }

  return { min, max };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePagination(page?: number, pageSize?: number) {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const requestedSize = pageSize ?? MATERIALS_DEFAULT_PAGE_SIZE;
  const safeSize = Math.min(
    MATERIALS_MAX_PAGE_SIZE,
    Math.max(6, Math.floor(requestedSize))
  );
  return { page: safePage, pageSize: safeSize };
}

async function fetchMpEndpoint<T>(
  endpoint: string,
  searchParams: URLSearchParams,
  apiKey: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}?${searchParams.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (networkError) {
    const message =
      networkError instanceof Error
        ? networkError.message
        : "无法连接 Materials Project API。";
    throw new MaterialsApiError(502, message);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new MaterialsApiError(
      response.status,
      detail || response.statusText || "Materials Project API 请求失败。"
    );
  }

  return (await response.json()) as T;
}
