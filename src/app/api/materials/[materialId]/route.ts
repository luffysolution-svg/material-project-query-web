import { NextRequest, NextResponse } from "next/server";

import { MATERIAL_DATASETS, type MaterialDataset } from "@/config/materials";
import { fetchMaterialProperties, MaterialsApiError } from "@/lib/materials";

const DEFAULT_DATASETS: MaterialDataset[] = [
  "dielectric",
  "elasticity",
  "piezoelectric",
  "absorption",
  "thermo",
  "magnetism",
  "oxidation",
  "provenance",
  "tasks",
  "surface",
  "substrates",
  "eos",
];

type RouteContext = {
  params: Promise<{
    materialId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { materialId } = await context.params;
  const datasetParam = req.nextUrl.searchParams.get("datasets");
  const taskIdsParam = req.nextUrl.searchParams.get("taskIds");
  const datasetList = datasetParam ? parseDatasets(datasetParam) : DEFAULT_DATASETS;
  const taskIds = taskIdsParam
    ? taskIdsParam
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : undefined;
  const normalizedDatasets =
    taskIds && taskIds.length
      ? datasetList
      : datasetList.filter((dataset) => dataset !== "tasks");

  try {
    const properties = await fetchMaterialProperties(materialId, normalizedDatasets, {
      taskIds,
    });
    return NextResponse.json(properties);
  } catch (error) {
    console.error(`Failed to load detail for ${materialId}`, error);
    const message =
      error instanceof Error
        ? error.message
        : "无法读取材料详细属性，请稍后再试。";
    const status =
      error instanceof MaterialsApiError ? error.status : 502;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

function parseDatasets(value: string): MaterialDataset[] {
  const requested = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const unique = new Set<MaterialDataset>();
  for (const entry of requested) {
    if (isDataset(entry)) {
      unique.add(entry);
    }
  }

  return unique.size ? Array.from(unique) : DEFAULT_DATASETS;
}

function isDataset(value: string): value is MaterialDataset {
  return value in MATERIAL_DATASETS;
}
