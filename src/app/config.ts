export const ProductsPerPage = 12;
export const SaleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? "http://localhost:8000/graphql/";

/**
 * Default channel slug - REQUIRED for the storefront to work.
 *
 * Set via NEXT_PUBLIC_DEFAULT_CHANNEL environment variable.
 * Example: NEXT_PUBLIC_DEFAULT_CHANNEL=default-channel
 */
export const DefaultChannelSlug = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL ?? "default-channel";
