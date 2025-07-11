export declare const ASTRO_VERSION: string;
/**
 * The name for the header used to help rerouting behavior.
 * When set to "no", astro will NOT try to reroute an error response to the corresponding error page, which is the default behavior that can sometimes lead to loops.
 *
 * ```ts
 * const response = new Response("keep this content as-is", {
 *     status: 404,
 *     headers: {
 *         // note that using a variable name as the key of an object needs to be wrapped in square brackets in javascript
 *         // without them, the header name will be interpreted as "REROUTE_DIRECTIVE_HEADER" instead of "X-Astro-Reroute"
 *         [REROUTE_DIRECTIVE_HEADER]: 'no',
 *     }
 * })
 * ```
 * Alternatively...
 * ```ts
 * response.headers.set(REROUTE_DIRECTIVE_HEADER, 'no');
 * ```
 */
export declare const REROUTE_DIRECTIVE_HEADER = "X-Astro-Reroute";
/**
 * Header and value that are attached to a Response object when a **user rewrite** occurs.
 *
 * This metadata is used to determine the origin of a Response. If a rewrite has occurred, it should be prioritised over other logic.
 */
export declare const REWRITE_DIRECTIVE_HEADER_KEY = "X-Astro-Rewrite";
export declare const REWRITE_DIRECTIVE_HEADER_VALUE = "yes";
/**
 * This header is set by the no-op Astro middleware.
 */
export declare const NOOP_MIDDLEWARE_HEADER = "X-Astro-Noop";
/**
 * The name for the header used to help i18n middleware, which only needs to act on "page" and "fallback" route types.
 */
export declare const ROUTE_TYPE_HEADER = "X-Astro-Route-Type";
/**
 * The value of the `component` field of the default 404 page, which is used when there is no user-provided 404.astro page.
 */
export declare const DEFAULT_404_COMPONENT = "astro-default-404.astro";
/**
 * A response with one of these status codes will create a redirect response.
 */
export declare const REDIRECT_STATUS_CODES: readonly [301, 302, 303, 307, 308, 300, 304];
/**
 * A response with one of these status codes will be rewritten
 * with the result of rendering the respective error page.
 */
export declare const REROUTABLE_STATUS_CODES: number[];
/**
 * The symbol which is used as a field on the request object to store the client address.
 * The clientAddress provided by the adapter (or the dev server) is stored on this field.
 */
export declare const clientAddressSymbol: unique symbol;
/**
 * The symbol used as a field on the request object to store the object to be made available to Astro APIs as `locals`.
 * Use judiciously, as locals are now stored within `RenderContext` by default. Tacking it onto request is no longer necessary.
 */
export declare const clientLocalsSymbol: unique symbol;
/**
 * Use this symbol to set and retrieve the original pathname of a request. This is useful when working with redirects and rewrites
 */
export declare const originPathnameSymbol: unique symbol;
/**
 * The symbol used as a field on the response object to keep track of streaming.
 *
 * It is set when the `<head>` element has been completely generated, rendered, and the response object has been passed onto the adapter.
 *
 * Used to provide helpful errors and warnings when headers or cookies are added during streaming, after the response has already been sent.
 */
export declare const responseSentSymbol: unique symbol;
export declare const SUPPORTED_MARKDOWN_FILE_EXTENSIONS: readonly [".markdown", ".mdown", ".mkdn", ".mkd", ".mdwn", ".md"];
export declare const MIDDLEWARE_PATH_SEGMENT_NAME = "middleware";
