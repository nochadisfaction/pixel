/** @type {import('@astrojs/language-server').AstroConfig} */
export default {
  languageServer: {
    // Increase memory limit for the language server (8GB)
    memoryLimit: 8192,
    // Increase timeout for language server operations
    timeout: 90000,
    // Disable features that consume memory
    disableFeatures: [
      'documentSymbols',
      'workspaceSymbols',
      'codeActions',
      'inlayHints'
    ],
  },
  typescript: {
    // Use the project's TypeScript version
    preferProjectVersion: true,
  },
  // Disable telemetry
  telemetry: false,
}
