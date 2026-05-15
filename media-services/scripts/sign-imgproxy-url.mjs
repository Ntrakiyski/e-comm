import { createHmac } from "node:crypto";

const [sourceUrl, processingOptions = "rs:fill:300:300", extension = "webp"] = process.argv.slice(2);
const key = process.env.IMGPROXY_KEY;
const salt = process.env.IMGPROXY_SALT;
const baseUrl = (process.env.IMGPROXY_BASE_URL || "http://localhost:8080").replace(/\/$/, "");

if (!sourceUrl) {
	console.error("Usage: node scripts/sign-imgproxy-url.mjs <source-url> [processing-options] [extension]");
	process.exit(1);
}

if (!key || !salt) {
	console.error("IMGPROXY_KEY and IMGPROXY_SALT must be set to hex-encoded values.");
	process.exit(1);
}

const encodedSource = Buffer.from(sourceUrl).toString("base64url");
const path = `/${processingOptions}/${encodedSource}.${extension}`;
const hmac = createHmac("sha256", Buffer.from(key, "hex"));

hmac.update(Buffer.from(salt, "hex"));
hmac.update(path);

const signature = hmac.digest("base64url");

console.log(`${baseUrl}/${signature}${path}`);
