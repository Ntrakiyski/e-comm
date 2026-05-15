# Repository Guidelines

## Applications in This Repository

This repo contains three related deployable applications:

- **Storefront (`/`, `src/`, `public/`)**: a Next.js 16 customer-facing storefront. It renders product listing/detail pages, account flows, cart, checkout entry points, SEO metadata, and channel-scoped routes. Treat Saleor as the source of truth for catalog, pricing, checkout, orders, and customer data.
- **Saleor backend (`saleor-backend/`)**: a Coolify-ready Docker Compose stack for the Saleor API, Dashboard, worker, Postgres, Valkey, and Mailpit. Use it for local/self-hosted commerce backend deployment, migrations, dashboard access, and webhook/API integration.
- **Media services (`media-services/`)**: a separate Coolify Docker Compose stack for Garage and imgproxy. Garage provides S3-compatible product media storage; imgproxy serves optimized public images. The `AWS_*` names used here are S3 client conventions, not AWS cloud usage.

Keep these boundaries clear. Storefront code should call Saleor APIs instead of duplicating backend business rules. Backend changes should preserve Saleor’s migration and worker expectations. Media changes should protect object persistence, signed URL behavior, and image delivery compatibility.

## Repo-Local Skills To Use

This repo includes local skills under `.github/skills`. Before changing one of these areas, read the matching `SKILL.md` and only the rule files needed for the task:

- **`.github/skills/saleor-storefront`**: use for Saleor GraphQL, products, variants, checkout, channels, permissions, purchasability, and API debugging from the storefront.
- **`.github/skills/storefront-builder`**: use for new storefront/catalog surfaces, PLP/PDP data contracts, channel-aware UX, pricing, availability, and media rendering decisions. Apply its guidance to this repo's existing Next.js conventions; do not overwrite local structure.
- **`.github/skills/saleor-core`**: use for Saleor backend behavior such as discounts, order/line discount precedence, stock availability modes, warehouses, shipping zones, webhooks, and Dashboard semantics.
- **`.github/skills/saleor-app`**: use for Saleor apps, app manifests, registration/auth, webhook handlers, app tokens, settings in metadata, and Dashboard iframe integrations.
- **`.github/skills/saleor-configurator`**: use for store configuration as code: `config.yml`, introspect/diff/deploy workflows, channels, product types, attributes, categories, collections, products, menus, models, warehouses, and shipping zones.
- **`.github/skills/atlas`**: use as the UI principles reference for new admin, dashboard, internal, or agent-facing interfaces. For the existing customer storefront, match the current Saleor/Paper storefront visual language unless the user explicitly asks to apply Atlas or redesign the surface.

When a task touches multiple areas, read the skills in dependency order: Saleor data/config first, backend/app behavior second, storefront rendering third, UI polish last.

## Stack Architecture For Agents

Read `docs/application-architecture.md` before making non-trivial stack, deployment, media, checkout, or cross-service changes. That document is the durable architecture reference; this section is the quick operating contract.

Runtime request flow:

```txt
Browser
  -> Storefront Next.js app
  -> Saleor GraphQL API
  -> Saleor Postgres / Valkey / worker
  -> Garage S3-compatible media storage
  -> imgproxy optimized image delivery
```

Coolify is the runtime platform. It owns container orchestration, environment variables, generated Compose output, Traefik routing, deployment logs, application logs, and persistent volumes. The repo owns the source code, Compose definitions, Dockerfiles, and operational documentation.

Important boundaries:

- The storefront is the user experience layer. It should render Saleor data, call Saleor GraphQL, and handle user-facing fallbacks. It should not reimplement Saleor business rules.
- Saleor is the commerce layer. It owns products, variants, pricing, channels, carts, checkouts, customers, orders, dashboard workflows, media metadata, and background jobs.
- Media services are the media infrastructure layer. Garage stores objects. imgproxy transforms and serves optimized image responses.
- Coolify volumes are persistent state. Never delete database, cache, Garage meta, or Garage data volumes without explicit user approval.

Storage clarification:

- This project does not use AWS storage services.
- Garage runs in Coolify and exposes an S3-compatible API.
- `AWS_*` environment variable names are only conventions expected by Saleor, django-storages, imgproxy, and S3-compatible clients. In this repo, those values point at Garage, not AWS.

## Ownership: Where To Touch What

Be explicit about the layer you are changing before editing files.

### Frontend

Touch the storefront for customer-facing rendering and browser behavior:

- Routes and layouts: `src/app`, especially channel routes under `src/app/[channel]` and checkout routes under `src/app/checkout`.
- UI components: `src/ui/components` and `src/checkout` for checkout-specific UI.
- Shared client/server helpers: `src/lib`, `src/hooks`, and `src/config`.
- Storefront GraphQL documents: `src/graphql`; regenerate generated artifacts with `pnpm run generate:all` after changing documents or schema-dependent code.
- Generated GraphQL output: `src/gql` and checkout generated files are generated artifacts; do not hand edit them.
- Static assets: `public`.

Frontend rules:

- Keep privileged tokens out of browser/public code. Public product/category/navigation queries should stay anonymous. Server-only Saleor app or staff tokens must remain server-side.
- Do not encode Saleor business rules in React when Saleor already owns the rule. Render the API result and handle user-facing states clearly.
- For UI changes, check desktop/mobile layout, loading, empty, error, disabled, hover, focus, overflow, console, and network behavior.

### Backend

Touch the backend only for Saleor runtime, deployment, and commerce behavior:

- Saleor self-hosted stack: `saleor-backend/`.
- Saleor API, Dashboard, worker, migrations/init, Postgres, Valkey, Mailpit, webhook, and media metadata behavior belong to the backend stack.
- Use `.github/skills/saleor-core` before changing or diagnosing discounts, stock, warehouses, shipping zones, orders, fulfillments, webhooks, or Dashboard behavior.
- Use `.github/skills/saleor-app` before building app extensions, app webhooks, app permissions, app settings, or Dashboard iframe screens.
- Use `.github/skills/saleor-configurator` before changing store configuration as code.

Backend rules:

- Prefer Saleor GraphQL/API/configuration over custom backend code in the storefront.
- Do not delete or reset Postgres, Valkey, or Saleor media volumes without explicit user approval.
- Treat migrations, seeded data, orders, payments, refunds, fulfillments, and customer data as production-sensitive.

### Page Content

Page content belongs in Saleor or deliberate code-owned content, depending on who should edit it later:

- Saleor-managed pages, models, menus, navigation, CMS-like content, and reusable content attributes should be changed through Saleor Dashboard/API or Configurator.
- Storefront chrome, layout labels, static route metadata, and intentionally code-owned copy can live in the repo.
- Do not hardcode business-managed page content in React if the content should be editable by an operator.
- When content structure changes affect queries or generated types, update GraphQL documents and run `pnpm run generate:all`.

### Product Content

Product data is a Saleor catalog concern:

- Product names, descriptions, SEO fields, categories, collections, attributes, variants, prices, channel listings, availability, and product media belong in Saleor.
- Product media uploads should flow through Saleor into Garage-backed S3-compatible storage.
- Use Configurator for declarative product/catalog changes when the store configuration is meant to be reproducible.
- Treat `product-content/` as local working/import material unless the user explicitly says it is the source of truth. Do not assume untracked product content should be committed.

### Order Management

Orders are a Saleor domain, not a storefront implementation detail:

- Saleor owns carts/checkouts, order creation, payments, transactions, discounts, taxes, fulfillments, refunds, stock allocation, and customer order history.
- Storefront code may create/update checkout state and render customer account/order views through allowed Saleor APIs.
- Administrative order actions should happen in Saleor Dashboard, Saleor API, an approved app, or an explicitly requested operational script.
- Ask before irreversible or production-affecting operations such as refunding, cancelling, fulfilling, deleting data, replaying webhooks, or changing payment behavior.

### UI Principles

- Existing customer storefront work should match the current Saleor/Paper storefront conventions, Tailwind usage, component density, typography, and interaction style.
- New internal/admin/agent interfaces should use `.github/skills/atlas` unless the user requests another design system.
- Do not mix visual systems on the same surface without a clear transition plan.
- Use polished production states: loading, empty, error, disabled, hover, focus, mobile, and responsive overflow are part of the implementation, not optional cleanup.

## Coolify Deployment References

Coolify is the deployment/runtime control plane for this project.

- **Coolify project**: `e-commerce`
- **Project UUID**: `s12xx88145zet7hkdyx6grj8`
- **Environment**: `production`
- **Environment UUID**: `tby1i87jddeb2y86sqzxt1q1`
- **Coolify project/environment URL**: `https://worfklow.org/project/s12xx88145zet7hkdyx6grj8/environment/tby1i87jddeb2y86sqzxt1q1`

Applications:

- **Storefront**: `e-comm:main-t2zf0oxpxgi5pxisa9eo73ci`
  - UUID: `t2zf0oxpxgi5pxisa9eo73ci`
  - Coolify UI: `https://worfklow.org/project/s12xx88145zet7hkdyx6grj8/environment/tby1i87jddeb2y86sqzxt1q1/application/t2zf0oxpxgi5pxisa9eo73ci`
  - Base directory: `/`
  - Build pack: `dockercompose`
  - Public URL: `http://b6avllwtxkt2nk92f0bkpytl.159.69.35.245.sslip.io`
- **Saleor backend**: `saleor-backend`
  - UUID: `ct33akwjskwnazeqmjn2ybru`
  - Coolify UI: `https://worfklow.org/project/s12xx88145zet7hkdyx6grj8/environment/tby1i87jddeb2y86sqzxt1q1/application/ct33akwjskwnazeqmjn2ybru`
  - Base directory: `/saleor-backend`
  - API: `http://saleor-api.159.69.35.245.sslip.io`
  - GraphQL: `http://saleor-api.159.69.35.245.sslip.io/graphql/`
  - Dashboard: `http://saleor-dashboard.159.69.35.245.sslip.io`
  - Mailpit: `http://saleor-mailpit.159.69.35.245.sslip.io`
- **Media services**: `media-services`
  - UUID: `e6e33q6fprglstg0h84t2v1f`
  - Coolify UI: `https://worfklow.org/project/s12xx88145zet7hkdyx6grj8/environment/tby1i87jddeb2y86sqzxt1q1/application/e6e33q6fprglstg0h84t2v1f`
  - Base directory: `/media-services`
  - Garage S3-compatible API: `http://media-api.159.69.35.245.sslip.io`
  - imgproxy: `http://img.159.69.35.245.sslip.io`

Deployment rules:

- Deployments come from GitHub repo `Ntrakiyski/e-comm`, branch `main`.
- Coolify owns runtime env vars, generated Compose, deployment logs, application logs, Traefik routing, app state, and persistent volumes.
- The repo owns source code, committed Compose files, Dockerfiles, docs, and reproducible config.
- Never expose Garage admin endpoints or secrets in public code/docs.
- Never delete Coolify volumes, databases, buckets, or app resources without explicit approval.

## Coolify MCP Usage

Use the Coolify MCP when you need live deployment state instead of guessing. If the tools are not already loaded, discover them with tool search for `coolify`.

Safe read-only calls:

- `mcp__coolify__.get_mcp_version({})`: confirm the MCP server is reachable.
- `mcp__coolify__.projects({ action: "get", uuid: "s12xx88145zet7hkdyx6grj8" })`: inspect the Coolify project.
- `mcp__coolify__.environments({ action: "get", project_uuid: "s12xx88145zet7hkdyx6grj8", name: "production" })`: inspect production apps and deployment metadata.
- `mcp__coolify__.application_logs({ uuid: "<application_uuid>", lines: 100 })`: inspect recent app logs.
- `mcp__coolify__.deployment({ action: "list_for_app", uuid: "<application_uuid>" })`: list deployments for an app.
- `mcp__coolify__.deployment({ action: "get", uuid: "<deployment_uuid>", lines: 200, max_chars: 20000 })`: inspect a specific deployment with bounded logs.
- `mcp__coolify__.env_vars({ action: "list", resource: "application", uuid: "<application_uuid>" })`: inspect env var names with masked values.

Write/control calls require clear intent and should be used only when the task calls for deployment or operations:

- `mcp__coolify__.deploy({ tag_or_uuid: "<application_uuid>", force: false })`: deploy one application.
- `mcp__coolify__.control({ action: "restart", resource: "application", uuid: "<application_uuid>" })`: restart one application.
- `mcp__coolify__.env_vars({ action: "create" | "update" | "delete", resource: "application", uuid: "<application_uuid>", ... })`: change runtime configuration.

Approval-sensitive or destructive operations:

- Do not call delete actions, cancel deployments, stop production apps, restart the full project, redeploy the full project, reveal plaintext secrets, or set env vars with production impact unless the user explicitly requested that operation.
- Prefer masked env-var reads. Use `reveal: true` only when the user explicitly asks for a plaintext value and it is necessary for the task.
- When setting multiline runtime secrets, set runtime-only env vars with `is_buildtime: false` and `is_runtime: true` unless build-time exposure is intentionally required.

## GitHub Repository

- **Repository**: `Ntrakiyski/e-comm`
- **Remote URL**: `https://github.com/Ntrakiyski/e-comm.git`
- **Primary branch**: `main`
- **Coolify source**: GitHub App connected to `Ntrakiyski/e-comm` on `main`

GitHub rules:

- Keep commits focused and use Conventional Commit-style prefixes already present in history.
- Do not commit untracked working/import content, generated secrets, or deployment-only local files unless the user asks for those files specifically.
- PRs should include changed areas, verification commands, deployment impact, env-var changes, screenshots for UI changes, and any skipped checks.

## Cross-Service Development Process

For any non-trivial change, update `tasks/todo.md` before implementation and keep it current. Identify the owning layer before editing:

- User-facing rendering, routes, GraphQL documents, generated types, assets, and Dockerized Next runtime belong to the storefront.
- Saleor settings, migrations, workers, dashboard/API behavior, and media metadata belong to the Saleor backend.
- Object persistence, S3-compatible access, image transform signatures, and optimized media delivery belong to media services.
- Routing, env vars, deploy state, logs, and app/container status belong to Coolify.

When a change crosses services, deploy and verify one boundary at a time. For media-related changes, the usual order is:

1. Deploy or verify media services.
2. Verify Garage upload/download and imgproxy transforms.
3. Deploy or verify Saleor media configuration.
4. Verify Saleor health and GraphQL media upload/query.
5. Deploy or verify storefront rendering.
6. Check browser listing/detail flows, network responses, console output, and logs.

## Verification Expectations

Use the strongest practical proof for the touched boundary:

- **Storefront**: `pnpm lint`, `pnpm build`, relevant tests, browser checks, console/network checks, and Docker image/mapped-port checks when Docker runtime changes.
- **Saleor backend**: Docker Compose config validation, Coolify deploy logs, `/health/`, relevant GraphQL query/mutation, and API/worker/init logs.
- **Media services**: Docker Compose config validation, Garage status/bucket check, S3-compatible upload/download, signed imgproxy WebP/AVIF checks, and media logs.
- **Coolify changes**: inspect generated Compose, env vars, deployment logs, app logs, public HTTP routes, and restart counts.

Do not report a production-affecting task as done until the live user-facing path has been exercised. If a check cannot be run, explain why and run the next-best check.

## Project Structure & Module Organization

This is a pnpm-managed Next.js 16 storefront for Saleor. Application routes live in `src/app`, including channel-scoped pages under `src/app/[channel]` and checkout routing under `src/app/checkout`. Shared storefront logic is in `src/lib`, `src/hooks`, and `src/config`. UI components are grouped in `src/ui/components` by feature (`pdp`, `plp`, `cart`, `account`, `ui`). Checkout-specific components, generated GraphQL, hooks, and locale content live in `src/checkout`. Storefront GraphQL documents are in `src/graphql`; generated types are in `src/gql` and should not be edited manually. Static assets are in `public`, content files are in `product-content`, and Docker support lives in `saleor-backend` and `media-services`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies using the pinned pnpm version.
- `pnpm dev`: generate GraphQL artifacts, then run the local Next dev server with webpack.
- `pnpm build`: generate local GraphQL artifacts, then create a production build.
- `pnpm start`: serve the production build.
- `pnpm lint` / `pnpm lint:fix`: run ESLint or apply safe lint fixes.
- `pnpm test` / `pnpm test:run`: run Vitest in watch mode or one-shot CI mode.
- `pnpm run generate:all`: regenerate storefront and checkout GraphQL types after changing `.graphql` files.
- `pnpm knip`: check for unused files, exports, and dependencies.

## Coding Style & Naming Conventions

Use TypeScript, React Server Components, and the existing `@/` import alias. Match the repository style: tabs for indentation, double quotes, semicolons, and concise named exports. Use kebab-case file names for components and utilities (`filter-utils.test.ts`, `mobile-sticky-action.tsx`). Prefer Tailwind utilities and shared helpers such as `cn` from `src/lib/utils.ts`; avoid editing generated files.

## Testing Guidelines

Vitest is configured for Node and includes `src/**/*.test.ts`. Keep tests close to the code they cover, use descriptive `describe` and `it` blocks, and add fixtures beside complex logic when useful. Run `pnpm test:run` before submitting changes that affect business logic, pricing, filtering, checkout, GraphQL transforms, or utilities.

## Principles & Best Practices

- Make the smallest correct change and keep ownership boundaries intact.
- Regenerate GraphQL types with `pnpm run generate:all` after changing documents or schema-dependent code.
- Verify user-facing storefront changes with lint, tests where relevant, a production build, and browser checks for console/network errors.
- Validate Docker Compose changes with `docker compose -f <path>/docker-compose.yaml config` before deployment.
- Keep generated files, secrets, and deployment-only credentials out of hand edits and commits.
- For media work, verify both storage and delivery: S3-compatible upload/download through Garage, then optimized image responses through imgproxy.
- For backend work, check API health, worker behavior, migrations, and any environment variables shared with the storefront or media stack.

## Commit & Pull Request Guidelines

Git history uses Conventional Commit-style prefixes such as `fix:`, `feat:`, and scoped forms like `fix(deploy):`. Keep commits focused and imperative. Pull requests should include a short summary, verification commands, linked issues or deployment context, and screenshots for UI changes. Note environment variable changes, migrations, or generated artifacts explicitly.

## Security & Configuration Tips

Do not commit secrets. Configure Saleor with `.env.local` values such as `NEXT_PUBLIC_SALEOR_API_URL`, `NEXT_PUBLIC_DEFAULT_CHANNEL`, `SALEOR_APP_TOKEN`, and webhook secrets. Treat media storage credentials in `media-services` and `saleor-backend` as production secrets.
