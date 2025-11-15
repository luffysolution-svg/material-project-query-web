export const MATERIALS_DEFAULT_PAGE_SIZE = 18;
export const MATERIALS_MAX_PAGE_SIZE = 60;

export const MATERIALS_SORTABLE_FIELDS = [
  "energy_above_hull",
  "band_gap",
  "density",
  "formation_energy_per_atom",
  "volume",
  "total_magnetization",
] as const;

export type MaterialsSortableField = (typeof MATERIALS_SORTABLE_FIELDS)[number];

export const MATERIAL_DATASETS = {
  dielectric: {
    label: "介电响应",
    path: "materials/dielectric/",
    fields: [
      "material_id",
      "e_total",
      "e_ionic",
      "e_electronic",
      "n",
      "total",
      "last_updated",
    ],
  },
  elasticity: {
    label: "弹性张量",
    path: "materials/elasticity/",
    fields: [
      "material_id",
      "k_vrh",
      "g_vrh",
      "homogeneous_poisson",
      "universal_anisotropy",
      "compliance_tensor",
      "elastic_tensor",
      "last_updated",
    ],
  },
  piezoelectric: {
    label: "压电响应",
    path: "materials/piezoelectric/",
    fields: [
      "material_id",
      "e_ij_max",
      "max_direction",
      "strain_for_max",
      "total",
      "last_updated",
    ],
  },
  thermo: {
    label: "热力学",
    path: "materials/thermo/",
    fields: [
      "material_id",
      "thermo_id",
      "energy_per_atom",
      "formation_energy_per_atom",
      "energy_above_hull",
      "equilibrium_reaction_energy_per_atom",
      "last_updated",
    ],
  },
  magnetism: {
    label: "磁性",
    path: "materials/magnetism/",
    fields: [
      "material_id",
      "ordering",
      "ordering_temperature",
      "total_magnetization",
      "total_magnetization_normalized_vol",
      "is_magnetic",
      "last_updated",
    ],
  },
  oxidation: {
    label: "氧化态",
    path: "materials/oxidation_states/",
    fields: [
      "material_id",
      "oxidation_states",
      "possible_species",
      "last_updated",
    ],
  },
  provenance: {
    label: "数据溯源",
    path: "materials/provenance/",
    fields: [
      "material_id",
      "deprecated",
      "theoretical",
      "calculations",
      "last_updated",
    ],
  },
  tasks: {
    label: "计算任务",
    path: "materials/tasks/",
    fields: [
      "task_id",
      "material_id",
      "formula_pretty",
      "task_type",
      "state",
      "energy_per_atom",
      "last_updated",
    ],
    limit: 5,
    multiple: true,
  },
  absorption: {
    label: "光学吸收",
    path: "materials/absorption/",
    fields: [
      "material_id",
      "task_id",
      "bandgap",
      "energy_max",
      "energies",
      "absorption_coefficient",
    ],
  },
  surface: {
    label: "表面属性",
    path: "materials/surface_properties/",
    fields: [
      "material_id",
      "weighted_surface_energy",
      "weighted_surface_energy_EV_PER_ANG2",
      "surface_anisotropy",
      "weighted_work_function",
      "has_reconstructed",
      "surfaces",
    ],
  },
  substrates: {
    label: "外延基底",
    path: "materials/substrates/",
    fields: [
      "sub_form",
      "sub_id",
      "film_orient",
      "orient",
      "area",
      "energy",
      "_norients",
    ],
    multiple: true,
    limit: 8,
  },
  eos: {
    label: "状态方程",
    path: "materials/eos/",
    fields: [
      "material_id",
      "eos",
      "energies",
      "volumes",
    ],
  },
} as const;

export type MaterialDataset = keyof typeof MATERIAL_DATASETS;
