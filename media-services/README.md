# Media Services

Coolify Docker Compose app for product media storage and optimized image delivery.

This stack does not use AWS cloud services. Garage runs inside Coolify and only exposes an S3-compatible API so Saleor, imgproxy, and standard S3 clients can talk to it.

## Services

- `garage`: S3-compatible object storage built from `dxflrs/garage:v2.3.0`
- `imgproxy`: optimized public image delivery using `ghcr.io/imgproxy/imgproxy:latest`

Garage runs in single-node mode for this initial deployment. It persists metadata in `garage-meta` mounted at `/var/lib/garage/meta` and object data in `garage-data` mounted at `/var/lib/garage/data`.

The Garage config is baked into the service image from `Dockerfile.garage` so the Coolify runtime does not depend on a sibling config-file bind mount.

## Coolify

Create a separate Docker Compose application:

- Name: `media-services`
- Project: `e-commerce`
- Environment: `production`
- Repository: `Ntrakiyski/e-comm`
- Branch: `main`
- Base directory: `/media-services`
- Build pack: Docker Compose

Temporary public endpoints:

- Garage S3 API: `http://media-api.159.69.35.245.sslip.io`
- imgproxy: `http://img.159.69.35.245.sslip.io`

Do not expose the Garage admin API publicly.

## Required Environment Variables

Generate secrets before deployment:

```sh
openssl rand -hex 32
openssl rand -base64 32
xxd -g 2 -l 64 -p /dev/random | tr -d '\n'
```

Set these in Coolify for the `media-services` app:

- `GARAGE_DEFAULT_ACCESS_KEY`
- `GARAGE_DEFAULT_SECRET_KEY`
- `GARAGE_DEFAULT_BUCKET`
- `GARAGE_RPC_SECRET`
- `GARAGE_ADMIN_TOKEN`
- `GARAGE_METRICS_TOKEN`
- `IMGPROXY_KEY`
- `IMGPROXY_SALT`
- `IMGPROXY_ALLOWED_SOURCES`

## Verification

From inside the Garage container:

```sh
/garage status
/garage bucket info saleor-media
```

From a machine with any S3-compatible client pointed at Garage. The example below uses the standard `aws` CLI only as an S3 client; it does not connect to AWS services.

```sh
export AWS_ENDPOINT_URL=http://media-api.159.69.35.245.sslip.io
export AWS_DEFAULT_REGION=garage
export AWS_ACCESS_KEY_ID=<garage access key>
export AWS_SECRET_ACCESS_KEY=<garage secret key>

printf 'media test' > /tmp/media-test.txt
aws s3 cp /tmp/media-test.txt s3://saleor-media/health/media-test.txt
aws s3 cp s3://saleor-media/health/media-test.txt /tmp/media-test-download.txt
diff /tmp/media-test.txt /tmp/media-test-download.txt
```

The `AWS_*` names are conventional environment variable names used by S3-compatible clients and libraries. In this deployment they contain Garage credentials, not AWS account credentials.

Generate a signed imgproxy URL:

```sh
IMGPROXY_KEY=<hex key> \
IMGPROXY_SALT=<hex salt> \
IMGPROXY_BASE_URL=http://img.159.69.35.245.sslip.io \
node scripts/sign-imgproxy-url.mjs s3://saleor-media/path/to/image.jpg rs:fill:300:300 webp
```

Then request the generated URL and confirm HTTP 200 plus the expected output format and dimensions.
