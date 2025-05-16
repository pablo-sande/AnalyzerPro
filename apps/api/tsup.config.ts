import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    resolve: true,
    entry: './src/index.ts'
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  platform: 'node',
  outExtension({ format }) {
    return {
      js: '.mjs',
    };
  },
}); 