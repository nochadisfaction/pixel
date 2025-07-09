export default {
  input: 'src/main.js', // Main client-side entry point for bundling
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    // Add plugins as needed (compatible with Rollup/Vite plugins)
  ],
}
