import { NextRequest, NextResponse } from "next/server";

import { MATERIALS_DEFAULT_PAGE_SIZE } from "@/config/materials";
import { fetchMaterials, MaterialsApiError } from "@/lib/materials";
import type {
  MaterialSearchParams,
  RangeFilter,
  SortOrder,
} from "@/types/materials";

export async function POST(req: NextRequest) {
  return handleRequest(async () => {
    const payload = await readBody(req);
    const params = normalizePayload(payload);
    const data = await fetchMaterials(params);
    return NextResponse.json(data);
  });
}

export async function GET(req: NextRequest) {
  return handleRequest(async () => {
    const params = normalizePayload(Object.fromEntries(req.nextUrl.searchParams));
    const data = await fetchMaterials(params);
    return NextResponse.json(data);
  });
}

async function handleRequest(
  action: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await action();
  } catch (error) {
    console.error("Materials route error", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unable to retrieve materials data.";
    const status =
      error instanceof MaterialsApiError ? error.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

async function readBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function normalizePayload(input: unknown): MaterialSearchParams {
  const source = isPlainObject(input) ? input : {};
  const params: MaterialSearchParams = {};

  assignString(params, "formula", source.formula ?? source.material);
  assignString(params, "chemsys", source.chemsys);
  assignString(params, "crystalSystem", source.crystalSystem ?? source.crystal_system);
  assignString(
    params,
    "spacegroupSymbol",
    source.spacegroupSymbol ?? source.spacegroup_symbol
  );

  assignArray(params, "elements", source.elements);
  assignArray(params, "excludeElements", source.excludeElements);
  assignArray(params, "possibleSpecies", source.possibleSpecies);
  assignArray(params, "hasProps", source.hasProps);

  params.bandGap = parseRange(source, "bandGap");
  params.energyAboveHull = parseRange(source, "energyAboveHull");
  params.formationEnergy = parseRange(source, "formationEnergy");
  params.density = parseRange(source, "density");
  params.volume = parseRange(source, "volume");
  params.totalMagnetization = parseRange(source, "totalMagnetization");

  const page = parseInteger(source.page);
  if (typeof page === "number") {
    params.page = page;
  }

  const pageSize = parseInteger(source.pageSize ?? source.limit);
  if (typeof pageSize === "number") {
    params.pageSize = pageSize;
  }

  const sortField = getString(source.sortField ?? source.sort);
  if (sortField) {
    params.sortField = sortField;
  }

  const sortOrder = parseSortOrder(source.sortOrder);
  if (sortOrder) {
    params.sortOrder = sortOrder;
  }

  const isStable = parseBoolean(source.isStable ?? source.is_stable);
  if (typeof isStable === "boolean") {
    params.isStable = isStable;
  }

  const theoretical = parseBoolean(source.theoretical);
  if (typeof theoretical === "boolean") {
    params.theoretical = theoretical;
  }

  return applyDefaults(params);
}

function applyDefaults(params: MaterialSearchParams): MaterialSearchParams {
  return {
    ...params,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? MATERIALS_DEFAULT_PAGE_SIZE,
    sortField: params.sortField ?? "energy_above_hull",
    sortOrder: params.sortOrder ?? "asc",
    isStable: params.isStable ?? true,
  };
}

function assignString(
  params: MaterialSearchParams,
  key: keyof MaterialSearchParams,
  value: unknown
) {
  const text = getString(value);
  if (text) {
    params[key] = text;
  }
}

function assignArray(
  params: MaterialSearchParams,
  key: keyof MaterialSearchParams,
  value: unknown
) {
  const array = parseStringArray(value);
  if (array) {
    params[key] = array;
  }
}

function parseRange(
  source: Record<string, unknown>,
  key: string
): RangeFilter | undefined {
  const candidate = source[key];
  const objectCandidate = isPlainObject(candidate) ? candidate : undefined;
  const min = parseNumber(objectCandidate?.min ?? source[`${key}Min`]);
  const max = parseNumber(objectCandidate?.max ?? source[`${key}Max`]);

  if (min === undefined && max === undefined) {
    return undefined;
  }

  if (min !== undefined && max !== undefined && min > max) {
    return { min: max, max: min };
  }

  return { min, max };
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function parseInteger(value: unknown): number | undefined {
  const parsed = parseNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Math.max(1, Math.floor(parsed));
}

function parseSortOrder(value: unknown): SortOrder | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "asc" || normalized === "desc") {
    return normalized;
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const entries = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const cleaned = entries
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  return cleaned.length ? cleaned : undefined;
}

function getString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
