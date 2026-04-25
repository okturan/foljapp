import createMDX from '@next/mdx';

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  transpilePackages: ['@foljapp/engine', '@foljapp/data'],
  webpack(config) {
    // Map .js / .jsx import specifiers (used by engine's ESM-style imports)
    // back to .ts / .tsx source files at resolve time.
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
      '.mjs': ['.mjs', '.mts'],
    };
    return config;
  },
};

export default withMDX(nextConfig);
