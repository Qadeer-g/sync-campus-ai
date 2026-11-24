/** @type {import('next').NextConfig} */
const nextConfig = {
  // BUILD NOT VERIFIED: this project has not been built, type-checked against its real
  // dependencies, or run in a browser in the environment where it was edited (no node_modules
  // and no network were available). `ignoreBuildErrors: true` is the original v0 setting and is
  // intentionally left unchanged for now, so `next build` will NOT fail on TypeScript errors.
  // Run `pnpm exec tsc --noEmit` locally to see real type errors; see DEMO_STATUS.md.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
