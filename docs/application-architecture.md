# Application Architecture

## Reader And Action

This document is for an internal engineer or coding agent joining the project cold.
After reading it, they should be able to understand the deployed stack, choose the right place to make a change, deploy it through Coolify, and verify the user-facing result without confusing service boundaries.

## System Map

The application is a self-hosted Saleor storefront stack deployed as separate Coolify applications.

```txt
Browser
  |
  v
Storefront app
  |
  | GraphQL
  v
Saleor backend app
  |        |        |
  |        |        +-- Mailpit for local/deployment email capture
  |        +----------- Valkey cache and Celery broker
  +-------------------- Postgres database
  |
  | S3-compatible media API
  v
Media services app
  |
  +-- Garage object storage
  +-- imgproxy optimized image delivery
```

Coolify owns process orchestration, environment variables, container networking, Traefik routing, deploy logs, and application logs. The repository owns the Docker Compose definitions, storefront code, Saleor stack definition, media stack definition, and operational docs.

## Runtime Services

### Storefront

The storefront is the public Next.js app. It renders category, product listing, product detail, cart, account, and checkout routes.

It talks to Saleor through the public GraphQL endpoint. Browsing pages can use cached or partially prerendered data, while cart and checkout operations must stay live because Saleor is the source of truth for prices, stock, shipping, tax, and payment state.

The production container runs the standalone Next server. It must bind to `0.0.0.0:3000` so Traefik can reach it from the Coolify network.

### Saleor Backend

Saleor is the commerce system of record. It owns:

- products, variants, categories, collections, channels, and prices
- carts and checkouts
- customers, authentication, addresses, and orders
- product media metadata
- dashboard and admin workflows
- background jobs through Celery

Saleor runs with Postgres, Valkey, a worker, a one-time init container, dashboard, and Mailpit. The init process applies migrations and seeds initial sample data once.

### Media Services

The media stack is intentionally separate from Saleor and the storefront.

Garage runs inside Coolify and stores product media. It exposes an S3-compatible API so Saleor, imgproxy, and standard S3-compatible clients can read and write objects.

This project does not use AWS storage services. Some environment variables are named `AWS_*` because Saleor, django-storages, imgproxy, and common S3-compatible clients expect those names. In this stack, those values point to Garage credentials and endpoints.

imgproxy reads source images from Garage and returns resized or reformatted images such as WebP and AVIF. It should only allow expected media sources and should use signed URLs for transformed image access.

## Data Flows

### Product Browsing

1. A browser requests a storefront page.
2. The storefront queries Saleor GraphQL for catalog data.
3. Saleor returns product, pricing, category, and media URL data.
4. The storefront renders the page and image components.
5. Image requests resolve through Saleor thumbnail redirects or direct Garage media URLs, depending on the query and image size.
6. Next image optimization may proxy the image for the browser, but the original source still resolves to Garage-backed media.

### Product Media Upload

1. A staff user or agent authenticates against Saleor.
2. The image is uploaded through a Saleor product media mutation.
3. Saleor writes the object through the S3-compatible client configuration.
4. Garage stores the object in the media bucket.
5. Saleor returns media metadata and thumbnail URLs.
6. The storefront consumes those URLs through GraphQL and renders the image.

### Optimized Image Delivery

1. A caller builds a signed imgproxy URL.
2. imgproxy validates the signature.
3. imgproxy fetches the source object from Garage using the S3-compatible API.
4. imgproxy resizes or reformats the image.
5. The browser receives the optimized image.

### Checkout

1. The storefront creates or updates checkout state through Saleor GraphQL.
2. Saleor validates channel, prices, discounts, inventory, shipping, and customer state.
3. The storefront renders Saleor responses and never treats cached display data as checkout authority.
4. Payment integration should be added through Saleor payment apps or Saleor-compatible payment flows.

## Deployment Boundaries

There are three main Coolify applications:

- storefront: public Next.js application
- saleor-backend: Saleor API, dashboard, worker, Postgres, Valkey, and Mailpit
- media-services: Garage and imgproxy

Deploy each boundary independently unless a change crosses service contracts.

Typical deployment order for cross-stack media changes:

1. Deploy media-services first.
2. Verify Garage and imgproxy.
3. Deploy Saleor backend media configuration.
4. Verify Saleor health and product media upload.
5. Deploy storefront changes.
6. Verify listing and detail rendering in a browser.

Never delete Coolify volumes unless the user explicitly approves. The database volume and Garage data volumes are persistent application state.

## Environment Variable Rules

Keep environment variables scoped to the Coolify app that uses them.

Storefront variables:

- Saleor GraphQL endpoint
- public storefront URL
- default channel
- optional webhook and revalidation secrets

Saleor backend variables:

- Saleor secret and RSA key material
- Postgres and cache connection settings
- admin bootstrap password
- Garage S3-compatible media settings

Media services variables:

- Garage bucket and root credentials
- Garage RPC/admin/metrics secrets
- imgproxy signing key and salt
- allowed imgproxy sources

Secrets must not be printed in final reports, docs, screenshots, or issue comments. If a value must be inspected during debugging, use masked output where possible and summarize only the finding.

## Agent Development Architecture

Agents should treat the stack as three layers:

1. User experience layer: storefront routes, UI components, GraphQL documents, generated types, and public assets.
2. Commerce layer: Saleor deployment, schema behavior, permissions, and background jobs.
3. Infrastructure layer: Coolify apps, Docker Compose, containers, logs, routes, volumes, Garage, and imgproxy.

Before changing code, identify the layer that owns the behavior. A broken product image might be:

- missing Saleor media data
- a Garage object or permission problem
- a Saleor thumbnail redirect issue
- a Next image optimization issue
- a missing storefront fallback asset
- a Traefik/container routing issue

Do not patch the storefront for a backend data problem unless the user-facing fallback is also wrong.

## Agent Workflow

### 1. Intake

Restate the desired user-facing outcome, affected service boundary, and verification target.

Examples:

- "Product media upload should store in Garage and render on the storefront."
- "Checkout totals should stay live and match Saleor."
- "The public storefront route should return HTTP 200 after deploy."

### 2. Plan

For non-trivial work, update the task plan before editing. Include:

- goal
- constraints
- affected services
- expected verification commands
- known risks

Do not ask for approval unless the work involves destructive data changes, paid services, irreversible deployment choices, security-sensitive behavior, or unclear product intent.

### 3. Inspect

Read the relevant docs, Compose definitions, logs, and code before guessing. Prefer direct evidence:

- generated Coolify compose output
- Coolify env var list
- deployment logs
- application logs
- GraphQL responses
- browser network responses
- actual image or API fetches

### 4. Change

Keep changes inside the owning boundary. Avoid broad rewrites.

Use existing framework patterns:

- Next.js App Router and GraphQL codegen for storefront changes
- official Saleor image settings for backend changes
- Docker Compose conventions for Coolify applications
- Garage and imgproxy documented settings for media changes

When a change crosses boundaries, deploy and verify one boundary at a time.

### 5. Verify

Use the strongest practical verification:

- lint and build for storefront code
- Docker Compose config validation for service definitions
- container build/run checks for Docker changes
- Saleor health and GraphQL probes for backend changes
- S3-compatible upload/download checks for Garage
- imgproxy signed URL checks for image transforms
- Playwright browser checks for user-facing rendering
- Coolify deployment and application logs after deploy

Do not call work done until the live user-facing path has been checked when the task affects production behavior.

### 6. Report

Report what changed, what passed, what was not run, and remaining risks. Keep secrets out of the response. If a warning is pre-existing and out of scope, say that directly and document it as a risk rather than hiding it.

## Verification Playbooks

### Storefront Change

1. Run lint.
2. Run production build.
3. If Docker or deployment behavior changed, build and run the image locally.
4. Deploy the storefront Coolify app.
5. Confirm the public route returns HTTP 200.
6. Use a browser check for the affected route.
7. Check console errors, bad network responses, and application logs.

### Saleor Backend Change

1. Validate Docker Compose config.
2. Deploy the Saleor backend Coolify app.
3. Confirm `/health/` returns HTTP 200.
4. Run a minimal GraphQL query or mutation relevant to the change.
5. Check API, worker, init, database, and cache behavior through logs.

### Media Services Change

1. Validate Docker Compose config.
2. Build any custom media image locally when feasible.
3. Deploy the media-services Coolify app.
4. Confirm Garage route reaches Garage.
5. Upload and download an object through the S3-compatible endpoint.
6. Generate signed imgproxy URLs and verify HTTP 200 plus expected format/dimensions.
7. Check media service logs.

### End-To-End Media Change

1. Verify Garage upload/download.
2. Verify imgproxy transforms.
3. Upload media through Saleor.
4. Query Saleor GraphQL for product media.
5. Fetch the returned media URL.
6. Open the storefront listing and detail pages.
7. Confirm no broken images, no bad media responses, and no console errors.

## Known Risks And Follow-Ups

- The current media deployment is single-node Garage. Add backups and a high-availability plan before treating it as durable production storage.
- Coolify volumes contain persistent data. Backup and restore processes should be documented and tested.
- The storefront has recoverable React hydration page errors on listing/detail routes. The app renders, but this should be investigated separately.
- The demo sample data includes products without media. The storefront placeholder covers that case, but real catalog content should include product imagery.
- Temporary `sslip.io` domains are useful for deployment bring-up but should be replaced with final domains before production traffic.
- Mailpit is for capture/testing, not real transactional email delivery.
- Payment processing is not complete until a Saleor-compatible payment app or provider flow is configured and verified.
