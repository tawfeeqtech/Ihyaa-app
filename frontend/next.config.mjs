import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/config/i18n/request.js");

const nextConfig = {
  experimental: {
    /**
     * Disable the Turbopack filesystem cache for `next dev`.
     *
     * WHY: On Windows the on-disk RocksDB cache (`.next/dev/cache/turbopack`)
     * can become corrupted (abrupt Ctrl+C/kill, running `next build` while
     * `next dev` is active, antivirus locking `.sst` files). A corrupted
     * cache makes the static-generation workers crash with:
     *   "Jest worker encountered 2 child process exceptions, exceeding retry limit"
     * and `next build` deliberately PRESERVES the `dev` cache dir, so it never
     * self-heals. Dev keeps its fast in-memory cache; only on-disk persistence
     * is turned off. If you want the persistent cache back, set this to `true`
     * (and recover a corrupted cache with `npm run clean`).
     */
    turbopackFileSystemCacheForDev: false,
  },
};

export default withNextIntl(nextConfig);
