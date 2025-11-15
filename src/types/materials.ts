export type SortOrder = "asc" | "desc";

export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface MaterialSummary {
  material_id: string;
  formula_pretty: string;
  elements: string[];
  nelements?: number;
  nsites?: number | null;
  energy_above_hull?: number | null;
  formation_energy_per_atom?: number | null;
  uncorrected_energy_per_atom?: number | null;
  density?: number | null;
  volume?: number | null;
  band_gap?: number | null;
  efermi?: number | null;
  total_magnetization?: number | null;
  total_magnetization_normalized_vol?: number | null;
  theoretical?: boolean;
  is_stable?: boolean;
  has_props?: string[];
  warnings?: string[];
  calc_types?: Record<string, string | null>;
  symmetry?: {
    crystal_system?: string | null;
    symbol?: string | null;
    point_group?: string | null;
  };
  last_updated?: string;
}

export interface MaterialsMeta {
  total_doc?: number;
  limit?: number;
  skip?: number;
  message?: string;
}

export interface MaterialsResponse {
  data: MaterialSummary[];
  meta: MaterialsMeta;
}

export interface MaterialSearchParams {
  formula?: string;
  chemsys?: string;
  elements?: string[];
  excludeElements?: string[];
  possibleSpecies?: string[];
  bandGap?: RangeFilter;
  energyAboveHull?: RangeFilter;
  formationEnergy?: RangeFilter;
  density?: RangeFilter;
  volume?: RangeFilter;
  totalMagnetization?: RangeFilter;
  isStable?: boolean;
  theoretical?: boolean;
  hasProps?: string[];
  crystalSystem?: string;
  spacegroupSymbol?: string;
  sortField?: string;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface DielectricProperty {
  material_id: string;
  e_total?: number | null;
  e_ionic?: number | null;
  e_electronic?: number | null;
  n?: number | null;
  total?: number[][];
  last_updated?: string;
}

export interface ElasticityProperty {
  material_id: string;
  k_vrh?: number | null;
  g_vrh?: number | null;
  homogeneous_poisson?: number | null;
  universal_anisotropy?: number | null;
  compliance_tensor?: number[][];
  elastic_tensor?: number[][];
  last_updated?: string;
}

export interface PiezoelectricProperty {
  material_id: string;
  e_ij_max?: number | null;
  max_direction?: number[];
  strain_for_max?: number[];
  total?: number[][][];
  last_updated?: string;
}

export interface AbsorptionProperty {
  material_id: string;
  task_id?: string;
  bandgap?: number | null;
  energy_max?: number | null;
  energies?: number[];
  absorption_coefficient?: number[];
}

export interface EosFit {
  model?: string;
  V0?: number | null;
  B0?: number | null;
  B1?: number | null;
  E0?: number | null;
  R2?: number | null;
}

export interface EosProperty {
  material_id?: string;
  eos?: EosFit[];
  energies?: number[];
  volumes?: number[];
}

export interface SurfaceEntry {
  miller_index?: number[];
  surface_energy_EV_PER_ANG2?: number | null;
  surface_energy?: number | null;
  work_function?: number | null;
  area_fraction?: number | null;
  is_reconstructed?: boolean;
}

export interface SurfaceProperty {
  material_id?: string;
  weighted_surface_energy_EV_PER_ANG2?: number | null;
  weighted_surface_energy?: number | null;
  weighted_work_function?: number | null;
  surface_anisotropy?: number | null;
  has_reconstructed?: boolean;
  surfaces?: SurfaceEntry[];
}

export interface SubstrateMatch {
  sub_form?: string;
  sub_id?: string;
  film_orient?: string;
  orient?: string;
  area?: number | null;
  energy?: number | null;
  norients?: number | null;
}

export interface ThermoProperty {
  material_id: string;
  thermo_id?: string;
  energy_per_atom?: number | null;
  energy_above_hull?: number | null;
  formation_energy_per_atom?: number | null;
  equilibrium_reaction_energy_per_atom?: number | null;
  decomposition_products?: Record<string, number> | string[];
  last_updated?: string;
}

export interface MagnetismProperty {
  material_id: string;
  ordering?: string | null;
  total_magnetization?: number | null;
  ordering_temperature?: number | null;
  is_magnetic?: boolean;
  last_updated?: string;
}

export interface OxidationStateProperty {
  material_id: string;
  oxidation_states?: Record<string, number[]> | number[] | null;
  possible_species?: string[];
  last_updated?: string;
}

export interface ProvenanceCalculation {
  task_id?: string;
  run_type?: string;
  task_type?: string;
  workflow?: string;
  last_updated?: string;
}

export interface ProvenanceProperty {
  material_id: string;
  deprecated?: boolean;
  theoretical?: boolean;
  calculations?: ProvenanceCalculation[];
  last_updated?: string;
}

export interface TaskProperty {
  task_id?: string;
  material_id?: string;
  formula_pretty?: string;
  task_type?: string;
  state?: string;
  energy_per_atom?: number | null;
  last_updated?: string;
}

export interface MaterialPropertyResponse {
  material_id: string;
  dielectric?: DielectricProperty;
  elasticity?: ElasticityProperty;
  piezoelectric?: PiezoelectricProperty;
  absorption?: AbsorptionProperty;
  eos?: EosProperty;
  thermo?: ThermoProperty;
  magnetism?: MagnetismProperty;
  oxidation?: OxidationStateProperty;
  provenance?: ProvenanceProperty;
  tasks?: TaskProperty[];
  surface?: SurfaceProperty;
  substrates?: SubstrateMatch[];
}
