## 材料化学情报台

该站点提供一个现代学术风格的材料数据检索界面，后端通过 Next.js App Router 的 API Route 代理调用 Materials Project 最新 Summary API，避免在前端暴露 `MP_API_KEY`。界面展示的核心指标（化学计量、能量、对称性、带隙、密度等）与官网字段保持一致，并附带可视化洞察与筛选控件。

### 主要特性

- **受保护的 MP API 代理**：`/api/materials` 路由会读取 `MP_API_KEY`，将搜索参数映射到 `https://api.materialsproject.org/materials/summary/`，并只返回研究常用字段。
- **多数据类型合并**：新增 `/api/materials/[materialId]` 端点，可一次拉取 `materials/dielectric`、`materials/elasticity`、`materials/piezoelectric` 以及 Stage 1 新增的 `materials/thermo`、`materials/magnetism`、`materials/oxidation_states`、`materials/provenance`、`materials/tasks` 数据，细节面板同步展示热力学、磁性、氧化态与计算任务来源信息。
- **高级物性扩展（Stage 2）**：默认再聚合 `materials/absorption`、`materials/surface_properties`、`materials/substrates`、`materials/eos`，呈现光学吸收峰、表面能与功函、外延基底推荐以及 EOS 拟合参数，可快速对比材料可加工性。
- **现代极简 UI**：Tailwind v4 + 定制字体，营造科研海报风格，配合洞察卡片与状态提示。
- **互动筛选**：支持化学式、元素集合、能量/带隙/密度范围、排序、分页、稳定相过滤等，表单和结果实时联动。
- **Mock 回退**：若未配置 API Key，会使用内置样例材料保证 UI 可浏览并提示需要配置密钥。

### 技术栈

- Next.js (App Router、TypeScript、API Route)
- Tailwind CSS v4（`@theme` 内联变量）
- Node.js ≥ 18 / npm ≥ 10

## 本地开发

1. 安装依赖：

   ```bash
   npm install
   ```

2. 创建 `.env.local` 并写入（将示例值替换为你自己的 Materials Project Key）：

   ```env
   MP_API_KEY=your-materials-project-key
   ```

3. 启动开发服务器：

   ```bash
   npm run dev
   ```

4. 访问 [http://localhost:3000](http://localhost:3000)。若密钥有效即显示实时数据，否则自动显示 mock 数据并提示配置。

## API 代理说明

- **列表 API**：`POST /api/materials`（亦支持 GET 查询参数）。
  - 请求体：`MaterialSearchParams`（化学式、elements 数组、range 参数、分页、排序等）。
  - 响应：`{ data: MaterialSummary[]; meta: { total_doc, limit, skip } }`，字段与 Materials Project Summary API 对齐。
- **属性 API**：`GET /api/materials/{materialId}?datasets=...`
  - 通过 `datasets` 选择数据类型（默认包含 `dielectric,elasticity,piezoelectric,absorption,thermo,magnetism,oxidation,provenance,tasks,surface,substrates,eos`），后端映射到 Materials Project 对应端点并聚合返回。
  - 响应：`MaterialPropertyResponse`，在原有 `dielectric`/`elasticity`/`piezoelectric` 基础上新增 `absorption`、`thermo`、`magnetism`、`oxidation`、`provenance`、`tasks`、`surface`、`substrates`、`eos` 等字段，与官方文档的 `AbsorptionDoc`、`ThermoDoc`、`MagnetismDoc`、`OxidationStateDoc`、`ProvenanceDoc`、`SurfacePropDoc`、`SubstratesDoc`、`EOSDoc` 对齐。

## 推送到 GitHub

1. 初始化并提交：

   ```bash
   git init
   git add .
   git commit -m "feat: materials intelligence portal"
   ```

2. 在 GitHub 创建一个空仓库（例如 `materials-intel-portal`）。

3. 关联远程并推送：

   ```bash
   git remote add origin https://github.com/<your-account>/materials-intel-portal.git
   git push -u origin main
   ```

> `.env.local` 已在 `.gitignore` 中，请勿推送敏感密钥。

## 质量保障

- `npm run lint` —— TypeScript/ESLint 规则校验。
- `npm run dev` + 浏览器 DevTools/Chrome DevTools MCP —— 手动核验 UI、API 响应、网络状态。

若需要生产部署，可依据 GitHub 仓库使用 Vercel、Docker 或自托管方式，运行 `npm run build && npm run start` 即可。
