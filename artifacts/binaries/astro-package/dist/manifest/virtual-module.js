import { AstroError, AstroErrorData } from "../core/errors/index.js";
import { fromRoutingStrategy } from "../i18n/utils.js";
const VIRTUAL_SERVER_ID = "astro:config/server";
const RESOLVED_VIRTUAL_SERVER_ID = "\0" + VIRTUAL_SERVER_ID;
const VIRTUAL_CLIENT_ID = "astro:config/client";
const RESOLVED_VIRTUAL_CLIENT_ID = "\0" + VIRTUAL_CLIENT_ID;
function virtualModulePlugin({ manifest }) {
  return {
    enforce: "pre",
    name: "astro-manifest-plugin",
    resolveId(id) {
      if (VIRTUAL_SERVER_ID === id) {
        return RESOLVED_VIRTUAL_SERVER_ID;
      } else if (VIRTUAL_CLIENT_ID === id) {
        return RESOLVED_VIRTUAL_CLIENT_ID;
      }
    },
    load(id, opts) {
      if (id === RESOLVED_VIRTUAL_CLIENT_ID) {
        return { code: serializeClientConfig(manifest) };
      } else if (id == RESOLVED_VIRTUAL_SERVER_ID) {
        if (!opts?.ssr) {
          throw new AstroError({
            ...AstroErrorData.ServerOnlyModule,
            message: AstroErrorData.ServerOnlyModule.message(VIRTUAL_SERVER_ID)
          });
        }
        return { code: serializeServerConfig(manifest) };
      }
    }
  };
}
function serializeClientConfig(manifest) {
  let i18n = void 0;
  if (manifest.i18n) {
    i18n = {
      defaultLocale: manifest.i18n.defaultLocale,
      locales: manifest.i18n.locales,
      routing: fromRoutingStrategy(manifest.i18n.strategy, manifest.i18n.fallbackType),
      fallback: manifest.i18n.fallback
    };
  }
  const serClientConfig = {
    base: manifest.base,
    i18n,
    build: {
      format: manifest.buildFormat
    },
    trailingSlash: manifest.trailingSlash,
    compressHTML: manifest.compressHTML,
    site: manifest.site
  };
  const output = [];
  for (const [key, value] of Object.entries(serClientConfig)) {
    output.push(`export const ${key} = ${JSON.stringify(value)};`);
  }
  return output.join("\n") + "\n";
}
function serializeServerConfig(manifest) {
  let i18n = void 0;
  if (manifest.i18n) {
    i18n = {
      defaultLocale: manifest.i18n.defaultLocale,
      routing: fromRoutingStrategy(manifest.i18n.strategy, manifest.i18n.fallbackType),
      locales: manifest.i18n.locales,
      fallback: manifest.i18n.fallback
    };
  }
  const serverConfig = {
    build: {
      server: new URL(manifest.buildServerDir),
      client: new URL(manifest.buildClientDir),
      format: manifest.buildFormat
    },
    cacheDir: new URL(manifest.cacheDir),
    outDir: new URL(manifest.outDir),
    publicDir: new URL(manifest.publicDir),
    srcDir: new URL(manifest.srcDir),
    root: new URL(manifest.hrefRoot),
    base: manifest.base,
    i18n,
    trailingSlash: manifest.trailingSlash,
    site: manifest.site,
    compressHTML: manifest.compressHTML
  };
  const output = [];
  for (const [key, value] of Object.entries(serverConfig)) {
    output.push(`export const ${key} = ${JSON.stringify(value)};`);
  }
  return output.join("\n") + "\n";
}
export {
  virtualModulePlugin as default
};
