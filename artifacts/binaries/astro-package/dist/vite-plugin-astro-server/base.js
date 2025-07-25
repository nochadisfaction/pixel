import * as fs from "node:fs";
import path from "node:path";
import { appendForwardSlash } from "@astrojs/internal-helpers/path";
import { bold } from "kleur/colors";
import { notFoundTemplate, subpathNotUsedTemplate } from "../template/4xx.js";
import { writeHtmlResponse } from "./response.js";
function baseMiddleware(settings, logger) {
  const { config } = settings;
  const site = config.site ? new URL(config.base, config.site) : void 0;
  const devRootURL = new URL(config.base, "http://localhost");
  const devRoot = site ? site.pathname : devRootURL.pathname;
  const devRootReplacement = devRoot.endsWith("/") ? "/" : "";
  return function devBaseMiddleware(req, res, next) {
    const url = req.url;
    let pathname;
    try {
      pathname = decodeURI(new URL(url, "http://localhost").pathname);
    } catch (e) {
      return next(e);
    }
    if (pathname.startsWith(devRoot)) {
      req.url = url.replace(devRoot, devRootReplacement);
      return next();
    }
    if (pathname === "/" || pathname === "/index.html") {
      const html = subpathNotUsedTemplate(devRoot, pathname);
      return writeHtmlResponse(res, 404, html);
    }
    if (req.headers.accept?.includes("text/html")) {
      const html = notFoundTemplate(pathname);
      return writeHtmlResponse(res, 404, html);
    }
    const publicPath = new URL("." + req.url, config.publicDir);
    fs.stat(publicPath, (_err, stats) => {
      if (stats) {
        const publicDir = appendForwardSlash(
          path.posix.relative(config.root.pathname, config.publicDir.pathname)
        );
        const expectedLocation = new URL(devRootURL.pathname + url, devRootURL).pathname;
        logger.error(
          "router",
          `Request URLs for ${bold(
            publicDir
          )} assets must also include your base. "${expectedLocation}" expected, but received "${url}".`
        );
        const html = subpathNotUsedTemplate(devRoot, pathname);
        return writeHtmlResponse(res, 404, html);
      } else {
        next();
      }
    });
  };
}
export {
  baseMiddleware
};
