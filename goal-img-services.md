# Plan: Self-Hosted Media Services With Garage + imgproxy

  ## Goal

  Set up a separate Coolify application for product/media image storage and optimization.

  The new app will provide:

  - Garage for S3-compatible object storage
  - imgproxy for optimized website image delivery
  - Persistent storage for uploaded originals
  - Public optimized image URLs for the frontend
  - A clean path for Saleor product images

  ## Target Architecture

  ```txt
  Saleor uploads product images
          ↓
  Garage stores original files
          ↓
  Saleor stores media references / URLs
          ↓
  Frontend requests product data from Saleor
          ↓
  Frontend renders optimized imgproxy URLs
          ↓
  imgproxy fetches originals from Garage and returns WebP/AVIF/resized images

  ## Coolify Structure

  Use the existing Coolify project/environment.

  Create a new separate Coolify Docker Compose application:

  media-services

  Services inside it:

  garage
  imgproxy

  Do not put these inside:

  - the frontend app
  - the Saleor backend app

  ## Suggested URLs

  Temporary sslip.io URLs are fine first.

  Later replace with real domains:

  media-api.example.com      # Garage S3 API, preferably private or restricted
  media-web.example.com      # Garage public bucket/web access if needed
  img.example.com            # imgproxy public optimized image endpoint

  ## Implementation Steps

  1. Inspect current Coolify project/environment and existing app layout.
  2. Add a new repo folder:

  media-services/

  3. Add Docker Compose config for:

  dxflrs/garage:v2.3.0
  ghcr.io/imgproxy/imgproxy:latest

  4. Configure Garage with persistent volumes:

  /var/lib/garage/meta
  /var/lib/garage/data

  5. Configure Garage single-node mode for initial deployment.
  6. Create a Garage bucket for media, for example:

  saleor-media

  7. Create Garage S3 credentials for Saleor/media uploads.
  8. Configure public or internal access rules for image reads.
  9. Configure imgproxy to fetch originals from Garage.
  10. Add Coolify environment variables for:

  GARAGE_DEFAULT_ACCESS_KEY
  GARAGE_DEFAULT_SECRET_KEY
  GARAGE_DEFAULT_BUCKET
  GARAGE_RPC_SECRET
  GARAGE_ADMIN_TOKEN
  GARAGE_METRICS_TOKEN

  IMGPROXY_KEY
  IMGPROXY_SALT
  IMGPROXY_ALLOWED_SOURCES

  11. Create the new Coolify app:

  name: media-services
  build pack: docker compose
  base directory: /media-services
  repo: same GitHub repo
  branch: main

  12. Deploy the new app.
  13. Verify Garage:

  garage status
  bucket exists
  test upload works
  test download works

  14. Verify imgproxy:

  request optimized image URL
  confirm HTTP 200
  confirm WebP/AVIF output
  confirm resized dimensions

  15. Connect Saleor media settings to Garage S3-compatible storage.
  16. Upload a product image through Saleor.
  17. Verify the image is stored in Garage.
  18. Verify Saleor returns the image URL in GraphQL.
  19. Update frontend image rendering if needed so product images go through imgproxy.
  20. Verify frontend product listing and product detail pages render optimized images.

  ## Verification Checklist

  - [ ] media-services/docker-compose.yaml exists
  - [ ] Garage starts successfully in Coolify
  - [ ] Garage data and metadata use persistent volumes
  - [ ] Garage bucket exists
  - [ ] S3 upload test passes
  - [ ] S3 download/read test passes
  - [ ] imgproxy starts successfully
  - [ ] imgproxy can fetch from Garage
  - [ ] imgproxy returns optimized image HTTP 200
  - [ ] Saleor can upload/store media in Garage
  - [ ] Saleor GraphQL returns product image URLs
  - [ ] Frontend renders product images from the new media flow
  - [ ] Frontend product listing checked
  - [ ] Frontend product detail checked
  - [ ] Logs checked for Garage, imgproxy, Saleor, and storefront
  - [ ] tasks/todo.md updated with review and proof

  ## Notes / Risks

  - Garage single-node mode has no redundancy. Backups are required.
  - imgproxy is stateless; Garage is stateful.
  - Do not store uploaded images inside the frontend repo or frontend container.
  - Garage credentials must stay secret.
  - imgproxy should use signed URLs in production.
  - Public bucket access should be limited to read-only media delivery.
  - Later, put Cloudflare/CDN in front of imgproxy for caching.
