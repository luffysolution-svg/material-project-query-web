import MaterialsDashboard from "@/components/materials-dashboard";
import { fetchMaterials } from "@/lib/materials";
import type { MaterialSearchParams } from "@/types/materials";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const initialQuery: MaterialSearchParams = {
    pageSize: 18,
    sortField: "energy_above_hull",
    sortOrder: "asc",
    isStable: true,
  };

  const initialData = await fetchMaterials(initialQuery);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,7,100,0.4),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(16,185,129,0.25),transparent_45%)]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-10">
        <section className="space-y-6 text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.5em] text-emerald-200">
            Materials Informatics · Context-7 Alignment
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            材料数据库—— Materials Project API本地调用
          </h1>
          <p className="text-white/70 md:text-lg">
            后端通过受保护的代理服务调用 Materials Project Summary 接口，保持数据字段（能量、对称性、带隙等）与官网一致。
            
          </p>
        </section>

        <MaterialsDashboard initialData={initialData} initialParams={initialQuery} />
      </div>
    </main>
  );
}
