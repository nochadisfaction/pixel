import type { ZodError } from 'zod';
export interface ErrorData {
    name: string;
    title: string;
    message?: string | ((...params: any) => string);
    hint?: string | ((...params: any) => string);
}
/**
 * @docs
 * @kind heading
 * @name Astro Errors
 */
/**
 * @docs
 * @message
 * Unknown compiler error.
 * @see
 * - [withastro/compiler issues list](https://astro.build/issues/compiler)
 * @description
 * Astro encountered an unknown error while compiling your files. In most cases, this is not your fault, but an issue in our compiler.
 *
 * If there isn't one already, please [create an issue](https://astro.build/issues/compiler).
 */
export declare const UnknownCompilerError: {
    name: string;
    title: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Official integrations](https://docs.astro.build/en/guides/integrations-guide/#official-integrations)
 * - [Astro.clientAddress](https://docs.astro.build/en/reference/api-reference/#clientaddress)
 * @description
 * The adapter you're using unfortunately does not support `Astro.clientAddress`.
 */
export declare const ClientAddressNotAvailable: {
    name: string;
    title: string;
    message: (adapterName: string) => string;
};
/**
 * @docs
 * @see
 * - [On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
 * - [Astro.clientAddress](https://docs.astro.build/en/reference/api-reference/#clientaddress)
 * @description
 * The `Astro.clientAddress` property cannot be used inside prerendered routes.
 */
export declare const PrerenderClientAddressNotAvailable: {
    name: string;
    title: string;
    message: (name: string) => string;
};
/**
 * @docs
 * @see
 * - [Enabling SSR in Your Project](https://docs.astro.build/en/guides/on-demand-rendering/)
 * - [Astro.clientAddress](https://docs.astro.build/en/reference/api-reference/#clientaddress)
 * @description
 * The `Astro.clientAddress` property is only available when [Server-side rendering](https://docs.astro.build/en/guides/on-demand-rendering/) is enabled.
 *
 * To get the user's IP address in static mode, different APIs such as [Ipify](https://www.ipify.org/) can be used in a [Client-side script](https://docs.astro.build/en/guides/client-side-scripts/) or it may be possible to get the user's IP using a serverless function hosted on your hosting provider.
 */
export declare const StaticClientAddressNotAvailable: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [getStaticPaths()](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * @description
 * A [dynamic route](https://docs.astro.build/en/guides/routing/#dynamic-routes) was matched, but no corresponding path was found for the requested parameters. This is often caused by a typo in either the generated or the requested path.
 */
export declare const NoMatchingStaticPathFound: {
    name: string;
    title: string;
    message: (pathName: string) => string;
    hint: (possibleRoutes: string[]) => string;
};
/**
 * @docs
 * @message Route returned a `RETURNED_VALUE`. Only a Response can be returned from Astro files.
 * @see
 * - [Response](https://docs.astro.build/en/guides/on-demand-rendering/#response)
 * @description
 * Only instances of [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) can be returned inside Astro files.
 * ```astro title="pages/login.astro"
 * ---
 * return new Response(null, {
 *  status: 404,
 *  statusText: 'Not found'
 * });
 *
 * // Alternatively, for redirects, Astro.redirect also returns an instance of Response
 * return Astro.redirect('/login');
 * ---
 * ```
 *
 */
export declare const OnlyResponseCanBeReturned: {
    name: string;
    title: string;
    message: (route: string | undefined, returnedValue: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [`client:media`](https://docs.astro.build/en/reference/directives-reference/#clientmedia)
 * @description
 * A [media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries) parameter is required when using the `client:media` directive.
 *
 * ```astro
 * <Counter client:media="(max-width: 640px)" />
 * ```
 */
export declare const MissingMediaQueryDirective: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @message Unable to render `COMPONENT_NAME`. There are `RENDERER_COUNT` renderer(s) configured in your `astro.config.mjs` file, but none were able to server-side render `COMPONENT_NAME`.
 * @see
 * - [Frameworks components](https://docs.astro.build/en/guides/framework-components/)
 * - [UI Frameworks](https://docs.astro.build/en/guides/integrations-guide/#official-integrations)
 * @description
 * None of the installed integrations were able to render the component you imported. Make sure to install the appropriate integration for the type of component you are trying to include in your page.
 *
 * For JSX / TSX files, [@astrojs/react](https://docs.astro.build/en/guides/integrations-guide/react/), [@astrojs/preact](https://docs.astro.build/en/guides/integrations-guide/preact/) or [@astrojs/solid-js](https://docs.astro.build/en/guides/integrations-guide/solid-js/) can be used. For Vue and Svelte files, the [@astrojs/vue](https://docs.astro.build/en/guides/integrations-guide/vue/) and [@astrojs/svelte](https://docs.astro.build/en/guides/integrations-guide/svelte/) integrations can be used respectively
 */
export declare const NoMatchingRenderer: {
    name: string;
    title: string;
    message: (componentName: string, componentExtension: string | undefined, plural: boolean, validRenderersCount: number) => string;
    hint: (probableRenderers: string) => string;
};
/**
 * @docs
 * @see
 * - [addRenderer option](https://docs.astro.build/en/reference/integrations-reference/#addrenderer-option)
 * - [Hydrating framework components](https://docs.astro.build/en/guides/framework-components/#hydrating-interactive-components)
 * @description
 * Astro tried to hydrate a component on the client, but the renderer used does not provide a client entrypoint to use to hydrate.
 *
 */
export declare const NoClientEntrypoint: {
    name: string;
    title: string;
    message: (componentName: string, clientDirective: string, rendererName: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [`client:only`](https://docs.astro.build/en/reference/directives-reference/#clientonly)
 * @description
 *
 * `client:only` components are not run on the server, as such Astro does not know (and cannot guess) which renderer to use and require a hint. Like such:
 *
 * ```astro
 *	<SomeReactComponent client:only="react" />
 * ```
 */
export declare const NoClientOnlyHint: {
    name: string;
    title: string;
    message: (componentName: string) => string;
    hint: (probableRenderers: string) => string;
};
/**
 * @docs
 * @see
 * - [`getStaticPaths()`](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * - [`params`](https://docs.astro.build/en/reference/api-reference/#params)
 * @description
 * The `params` property in `getStaticPaths`'s return value (an array of objects) should also be an object.
 *
 * ```astro title="pages/blog/[id].astro"
 * ---
 * export async function getStaticPaths() {
 *	return [
 *		{ params: { slug: "blog" } },
 * 		{ params: { slug: "about" } }
 * 	];
 *}
 *---
 * ```
 */
export declare const InvalidGetStaticPathParam: {
    name: string;
    title: string;
    message: (paramType: any) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [`getStaticPaths()`](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * @description
 * `getStaticPaths`'s return value must be an array of objects. In most cases, this error happens because an array of array was returned. Using [`.flatMap()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) or a [`.flat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) call may be useful.
 *
 * ```ts title="pages/blog/[id].astro"
 * export async function getStaticPaths() {
 *	return [ // <-- Array
 *		{ params: { slug: "blog" } }, // <-- Object
 * 		{ params: { slug: "about" } }
 * 	];
 *}
 * ```
 */
export declare const InvalidGetStaticPathsEntry: {
    name: string;
    title: string;
    message: (entryType: any) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [`getStaticPaths()`](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * - [`params`](https://docs.astro.build/en/reference/api-reference/#params)
 * @description
 * `getStaticPaths`'s return value must be an array of objects.
 *
 * ```ts title="pages/blog/[id].astro"
 * export async function getStaticPaths() {
 *	return [ // <-- Array
 *		{ params: { slug: "blog" } },
 * 		{ params: { slug: "about" } }
 * 	];
 *}
 * ```
 */
export declare const InvalidGetStaticPathsReturn: {
    name: string;
    title: string;
    message: (returnType: any) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [`getStaticPaths()`](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * - [`params`](https://docs.astro.build/en/reference/api-reference/#params)
 * @description
 * Every route specified by `getStaticPaths` require a `params` property specifying the path parameters needed to match the route.
 *
 * For instance, the following code:
 * ```astro title="pages/blog/[id].astro"
 * ---
 * export async function getStaticPaths() {
 * 	return [
 * 		{ params: { id: '1' } }
 * 	];
 * }
 * ---
 * ```
 * Will create the following route: `site.com/blog/1`.
 */
export declare const GetStaticPathsExpectedParams: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [`getStaticPaths()`](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * - [`params`](https://docs.astro.build/en/reference/api-reference/#params)
 * @description
 * Since `params` are encoded into the URL, only certain types are supported as values.
 *
 * ```astro title="/route/[id].astro"
 * ---
 * export async function getStaticPaths() {
 * 	return [
 * 		{ params: { id: '1' } } // Works
 * 		{ params: { id: 2 } } // Works
 * 		{ params: { id: false } } // Does not work
 * 	];
 * }
 * ---
 * ```
 *
 * In routes using [rest parameters](https://docs.astro.build/en/guides/routing/#rest-parameters), `undefined` can be used to represent a path with no parameters passed in the URL:
 *
 * ```astro title="/route/[...id].astro"
 * ---
 * export async function getStaticPaths() {
 * 	return [
 * 		{ params: { id: 1 } } // /route/1
 * 		{ params: { id: 2 } } // /route/2
 * 		{ params: { id: undefined } } // /route/
 * 	];
 * }
 * ---
 * ```
 */
export declare const GetStaticPathsInvalidRouteParam: {
    name: string;
    title: string;
    message: (key: string, value: any, valueType: any) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Dynamic Routes](https://docs.astro.build/en/guides/routing/#dynamic-routes)
 * - [`getStaticPaths()`](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * - [Server-side Rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
 * @description
 * In [Static Mode](https://docs.astro.build/en/guides/routing/#static-ssg-mode), all routes must be determined at build time. As such, dynamic routes must `export` a `getStaticPaths` function returning the different paths to generate.
 */
export declare const GetStaticPathsRequired: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Named slots](https://docs.astro.build/en/basics/astro-components/#named-slots)
 * @description
 * Certain words cannot be used for slot names due to being already used internally.
 */
export declare const ReservedSlotName: {
    name: string;
    title: string;
    message: (slotName: string) => string;
};
/**
 * @docs
 * @see
 * - [Server-side Rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
 * @description
 * To use server-side rendering, an adapter needs to be installed so Astro knows how to generate the proper output for your targeted deployment platform.
 */
export declare const NoAdapterInstalled: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Server-side Rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
 * @description
 * The currently configured adapter does not support server-side rendering, which is required for the current project setup.
 *
 * Depending on your adapter, there may be a different entrypoint to use for server-side rendering. For example, the `@astrojs/vercel` adapter has a `@astrojs/vercel/static` entrypoint for static rendering, and a `@astrojs/vercel/serverless` entrypoint for server-side rendering.
 *
 */
export declare const AdapterSupportOutputMismatch: {
    name: string;
    title: string;
    message: (adapterName: string) => string;
};
/**
 * @docs
 * @see
 * - [On-demand Rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
 * @description
 * To use server islands, the same constraints exist as for sever-side rendering, so an adapter is needed.
 */
export declare const NoAdapterInstalledServerIslands: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @description
 * No import statement was found for one of the components. If there is an import statement, make sure you are using the same identifier in both the imports and the component usage.
 */
export declare const NoMatchingImport: {
    name: string;
    title: string;
    message: (componentName: string) => string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error messages:**<br/>
 * InvalidPrerenderExport: A `prerender` export has been detected, but its value cannot be statically analyzed.
 * @description
 * The `prerender` feature only supports a subset of valid JavaScript — be sure to use exactly `export const prerender = true` so that our compiler can detect this directive at build time. Variables, `let`, and `var` declarations are not supported.
 */
export declare const InvalidPrerenderExport: {
    name: string;
    title: string;
    message(prefix: string, suffix: string, isHydridOutput: boolean): string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error messages:**<br/>
 * InvalidComponentArgs: Invalid arguments passed to `<MyAstroComponent>` component.
 * @description
 * Astro components cannot be rendered manually via a function call, such as `Component()` or `{items.map(Component)}`. Prefer the component syntax `<Component />` or `{items.map(item => <Component {...item} />)}`.
 */
export declare const InvalidComponentArgs: {
    name: string;
    title: string;
    message: (name: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Pagination](https://docs.astro.build/en/guides/routing/#pagination)
 * @description
 * The page number parameter was not found in your filepath.
 */
export declare const PageNumberParamNotFound: {
    name: string;
    title: string;
    message: (paramName: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * - [Image component](https://docs.astro.build/en/reference/modules/astro-assets/#image-)
 * - [Image component#alt](https://docs.astro.build/en/reference/modules/astro-assets/#alt-required)
 * @description
 * The `alt` property allows you to provide descriptive alt text to users of screen readers and other assistive technologies. In order to ensure your images are accessible, the `Image` component requires that an `alt` be specified.
 *
 * If the image is merely decorative (i.e. doesn’t contribute to the understanding of the page), set `alt=""` so that screen readers know to ignore the image.
 */
export declare const ImageMissingAlt: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Image Service API](https://docs.astro.build/en/reference/image-service-reference/)
 * @description
 * There was an error while loading the configured image service. This can be caused by various factors, such as your image service not properly exporting a compatible object in its default export, or an incorrect path.
 *
 * If you believe that your service is properly configured and this error is wrong, please [open an issue](https://astro.build/issues/).
 */
export declare const InvalidImageService: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @message
 * Missing width and height attributes for `IMAGE_URL`. When using remote images, both dimensions are required in order to avoid cumulative layout shift (CLS).
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * - [Image component#width-and-height-required](https://docs.astro.build/en/reference/modules/astro-assets/#width-and-height-required-for-images-in-public)
 * @description
 * For remote images, `width` and `height` cannot automatically be inferred from the original file. To avoid cumulative layout shift (CLS), either specify these two properties, or set [`inferSize`](https://docs.astro.build/en/reference/modules/astro-assets/#infersize) to `true` to fetch a remote image's original dimensions.
 *
 * If your image is inside your `src` folder, you probably meant to import it instead. See [the Imports guide for more information](https://docs.astro.build/en/guides/imports/#other-assets).
 */
export declare const MissingImageDimension: {
    name: string;
    title: string;
    message: (missingDimension: "width" | "height" | "both", imageURL: string) => string;
    hint: string;
};
/**
 * @docs
 * @message
 * Failed to get the dimensions for `IMAGE_URL`.
 * @description
 * Determining the remote image's dimensions failed. This is typically caused by an incorrect URL or attempting to infer the size of an image in the public folder which is not possible.
 */
export declare const FailedToFetchRemoteImageDimensions: {
    name: string;
    title: string;
    message: (imageURL: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * The built-in image services do not currently support optimizing all image formats.
 *
 * For unsupported formats such as GIFs, you may be able to use an `img` tag directly:
 * ```astro
 * ---
 * import rocket from '../assets/images/rocket.gif';
 * ---
 *
 * <img src={rocket.src} width={rocket.width} height={rocket.height} alt="A rocketship in space." />
 * ```
 */
export declare const UnsupportedImageFormat: {
    name: string;
    title: string;
    message: (format: string, imagePath: string, supportedFormats: readonly string[]) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * Astro does not currently supporting converting between vector (such as SVGs) and raster (such as PNGs and JPEGs) images.
 */
export declare const UnsupportedImageConversion: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @see
 * - [`getStaticPaths()`](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths)
 * - [`params`](https://docs.astro.build/en/reference/api-reference/#params)
 * @description
 * The endpoint is prerendered with an `undefined` param so the generated path will collide with another route.
 *
 * If you cannot prevent passing `undefined`, then an additional extension can be added to the endpoint file name to generate the file with a different name. For example, renaming `pages/api/[slug].ts` to `pages/api/[slug].json.ts`.
 */
export declare const PrerenderDynamicEndpointPathCollide: {
    name: string;
    title: string;
    message: (pathname: string) => string;
    hint: (filename: string) => string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * An image's `src` property is not valid. The Image component requires the `src` attribute to be either an image that has been ESM imported or a string. This is also true for the first parameter of `getImage()`.
 *
 * ```astro
 * ---
 * import { Image } from "astro:assets";
 * import myImage from "../assets/my_image.png";
 * ---
 *
 * <Image src={myImage} alt="..." />
 * <Image src="https://example.com/logo.png" width={300} height={300} alt="..." />
 * ```
 *
 * In most cases, this error happens when the value passed to `src` is undefined.
 */
export declare const ExpectedImage: {
    name: string;
    title: string;
    message: (src: string, typeofOptions: string, fullOptions: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * `getImage()`'s first parameter should be an object with the different properties to apply to your image.
 *
 * ```ts
 * import { getImage } from "astro:assets";
 * import myImage from "../assets/my_image.png";
 *
 * const optimizedImage = await getImage({src: myImage, width: 300, height: 300});
 * ```
 *
 * In most cases, this error happens because parameters were passed directly instead of inside an object.
 */
export declare const ExpectedImageOptions: {
    name: string;
    title: string;
    message: (options: string) => string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * An ESM-imported image cannot be passed directly to `getImage()`. Instead, pass an object with the image in the `src` property.
 *
 * ```diff
 * import { getImage } from "astro:assets";
 * import myImage from "../assets/my_image.png";
 * - const optimizedImage = await getImage( myImage );
 * + const optimizedImage = await getImage({ src: myImage });
 * ```
 */
export declare const ExpectedNotESMImage: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * Only one of `densities` or `widths` can be specified. Those attributes are used to construct a `srcset` attribute, which cannot have both `x` and `w` descriptors.
 */
export declare const IncompatibleDescriptorOptions: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * Astro could not find an image you imported. Often, this is simply caused by a typo in the path.
 *
 * Images in Markdown are relative to the current file. To refer to an image that is located in the same folder as the `.md` file, the path should start with `./`
 */
export declare const ImageNotFound: {
    name: string;
    title: string;
    message: (imagePath: string) => string;
    hint: string;
};
/**
 * @docs
 * @message Could not process image metadata for `IMAGE_PATH`.
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * Astro could not process the metadata of an image you imported. This is often caused by a corrupted or malformed image and re-exporting the image from your image editor may fix this issue.
 */
export declare const NoImageMetadata: {
    name: string;
    title: string;
    message: (imagePath: string | undefined) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * Astro could not transform one of your images. Often, this is caused by a corrupted or malformed image. Re-exporting the image from your image editor may fix this issue.
 *
 * Depending on the image service you are using, the stack trace may contain more information on the specific error encountered.
 */
export declare const CouldNotTransformImage: {
    name: string;
    title: string;
    message: (imagePath: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * Making changes to the response, such as setting headers, cookies, and the status code cannot be done outside of page components.
 */
export declare const ResponseSentError: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * Thrown when the middleware does not return any data or call the `next` function.
 *
 * For example:
 * ```ts
 * import {defineMiddleware} from "astro:middleware";
 * export const onRequest = defineMiddleware((context, _) => {
 * 	// doesn't return anything or call `next`
 * 	context.locals.someData = false;
 * });
 * ```
 */
export declare const MiddlewareNoDataOrNextCalled: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * Thrown in development mode when middleware returns something that is not a `Response` object.
 *
 * For example:
 * ```ts
 * import {defineMiddleware} from "astro:middleware";
 * export const onRequest = defineMiddleware(() => {
 *   return "string"
 * });
 * ```
 */
export declare const MiddlewareNotAResponse: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * Thrown when an endpoint does not return anything or returns an object that is not a `Response` object.
 *
 * An endpoint must return either a `Response`, or a `Promise` that resolves with a `Response`. For example:
 * ```ts
 * import type { APIContext } from 'astro';
 *
 * export async function GET({ request, url, cookies }: APIContext): Promise<Response> {
 *     return Response.json({
 *         success: true,
 *         result: 'Data from Astro Endpoint!'
 *     })
 * }
 * ```
 */
export declare const EndpointDidNotReturnAResponse: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 *
 * Thrown when `locals` is overwritten with something that is not an object
 *
 * For example:
 * ```ts
 * import {defineMiddleware} from "astro:middleware";
 * export const onRequest = defineMiddleware((context, next) => {
 *   context.locals = 1541;
 *   return next();
 * });
 * ```
 */
export declare const LocalsNotAnObject: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @description
 * Thrown when a value is being set as the `locals` field on the Astro global or context.
 */
export declare const LocalsReassigned: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @description
 * Thrown when a value is being set as the `headers` field on the `ResponseInit` object available as `Astro.response`.
 */
export declare const AstroResponseHeadersReassigned: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @description
 * Thrown in development mode when middleware throws an error while attempting to loading it.
 *
 * For example:
 * ```ts
 * import {defineMiddleware} from "astro:middleware";
 * throw new Error("Error thrown while loading the middleware.")
 * export const onRequest = defineMiddleware(() => {
 *   return "string"
 * });
 * ```
 */
export declare const MiddlewareCantBeLoaded: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @see
 * - [Images](https://docs.astro.build/en/guides/images/)
 * @description
 * When using the default image services, `Image`'s and `getImage`'s `src` parameter must be either an imported image or an URL, it cannot be a string of a filepath.
 *
 * For local images from content collections, you can use the [image() schema helper](https://docs.astro.build/en/guides/images/#images-in-content-collections) to resolve the images.
 *
 * ```astro
 * ---
 * import { Image } from "astro:assets";
 * import myImage from "../my_image.png";
 * ---
 *
 * <!-- GOOD: `src` is the full imported image. -->
 * <Image src={myImage} alt="Cool image" />
 *
 * <!-- GOOD: `src` is a URL. -->
 * <Image src="https://example.com/my_image.png" alt="Cool image" />
 *
 * <!-- BAD: `src` is an image's `src` path instead of the full image object. -->
 * <Image src={myImage.src} alt="Cool image" />
 *
 * <!-- BAD: `src` is a string filepath. -->
 * <Image src="../my_image.png" alt="Cool image" />
 * ```
 */
export declare const LocalImageUsedWrongly: {
    name: string;
    title: string;
    message: (imageFilePath: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Astro.glob](https://docs.astro.build/en/reference/api-reference/#astroglob)
 * @description
 * `Astro.glob()` can only be used in `.astro` files. You can use [`import.meta.glob()`](https://vite.dev/guide/features.html#glob-import) instead to achieve the same result.
 */
export declare const AstroGlobUsedOutside: {
    name: string;
    title: string;
    message: (globStr: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Astro.glob](https://docs.astro.build/en/reference/api-reference/#astroglob)
 * @description
 * `Astro.glob()` did not return any matching files. There might be a typo in the glob pattern.
 */
export declare const AstroGlobNoMatch: {
    name: string;
    title: string;
    message: (globStr: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Astro.redirect](https://docs.astro.build/en/reference/api-reference/#redirect)
 * @description
 * A redirect must be given a location with the `Location` header.
 */
export declare const RedirectWithNoLocation: {
    name: string;
    title: string;
};
/**
 * @docs
 * @see
 * - [Astro.redirect](https://docs.astro.build/en/reference/api-reference/#redirect)
 * @description
 * An external redirect must start with http or https, and must be a valid URL.
 */
export declare const UnsupportedExternalRedirect: {
    name: string;
    title: string;
    message: (from: string, to: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Dynamic routes](https://docs.astro.build/en/guides/routing/#dynamic-routes)
 * @description
 * A dynamic route param is invalid. This is often caused by an `undefined` parameter or a missing [rest parameter](https://docs.astro.build/en/guides/routing/#rest-parameters).
 */
export declare const InvalidDynamicRoute: {
    name: string;
    title: string;
    message: (route: string, invalidParam: string, received: string) => string;
};
/**
 * @docs
 * @see
 * - [Default Image Service](https://docs.astro.build/en/guides/images/#default-image-service)
 * - [Image Services API](https://docs.astro.build/en/reference/image-service-reference/)
 * @description
 * Sharp is the default image service used for `astro:assets`. When using a [strict package manager](https://pnpm.io/pnpm-vs-npm#npms-flat-tree) like pnpm, Sharp must be installed manually into your project in order to use image processing.
 *
 * If you are not using `astro:assets` for image processing, and do not wish to install Sharp, you can configure the following passthrough image service that does no processing:
 *
 * ```js
 * import { defineConfig, passthroughImageService } from "astro/config";
 * export default defineConfig({
 *  image: {
 *    service: passthroughImageService(),
 *  },
 * });
 * ```
 */
export declare const MissingSharp: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Vite troubleshooting guide](https://vite.dev/guide/troubleshooting.html)
 * @description
 * Vite encountered an unknown error while rendering your project. We unfortunately do not know what happened (or we would tell you!)
 *
 * If you can reliably cause this error to happen, we'd appreciate if you could [open an issue](https://astro.build/issues/)
 */
export declare const UnknownViteError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @see
 * - [Type Imports](https://docs.astro.build/en/guides/typescript/#type-imports)
 * @description
 * Astro could not import the requested file. Oftentimes, this is caused by the import path being wrong (either because the file does not exist, or there is a typo in the path)
 *
 * This message can also appear when a type is imported without specifying that it is a [type import](https://docs.astro.build/en/guides/typescript/#type-imports).
 */
export declare const FailedToLoadModuleSSR: {
    name: string;
    title: string;
    message: (importName: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Glob Patterns](https://docs.astro.build/en/guides/imports/#glob-patterns)
 * @description
 * Astro encountered an invalid glob pattern. This is often caused by the glob pattern not being a valid file path.
 */
export declare const InvalidGlob: {
    name: string;
    title: string;
    message: (globPattern: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error.
 */
export declare const FailedToFindPageMapSSR: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * Astro can't find the requested locale. All supported locales must be configured in [i18n.locales](/en/reference/configuration-reference/#i18nlocales) and have corresponding directories within `src/pages/`.
 */
export declare const MissingLocale: {
    name: string;
    title: string;
    message: (locale: string) => string;
};
/**
 * @docs
 * @description
 * Astro could not find the index URL of your website. An index page is required so that Astro can create a redirect from the main index page to the localized index page of the default locale when using [`i18n.routing.prefixDefaultLocale`](https://docs.astro.build/en/reference/configuration-reference/#i18nroutingprefixdefaultlocale).
 * @see
 * - [Internationalization](https://docs.astro.build/en/guides/internationalization/#routing)
 * - [`i18n.routing` Configuration Reference](https://docs.astro.build/en/reference/configuration-reference/#i18nrouting)
 */
export declare const MissingIndexForInternationalization: {
    name: string;
    title: string;
    message: (defaultLocale: string) => string;
    hint: (src: string) => string;
};
/**
 * @docs
 * @description
 * Some internationalization functions are only available when Astro's own i18n routing is disabled by the configuration setting `i18n.routing: "manual"`.
 *
 * @see
 * - [`i18n` routing](https://docs.astro.build/en/guides/internationalization/#routing)
 */
export declare const IncorrectStrategyForI18n: {
    name: string;
    title: string;
    message: (functionName: string) => string;
};
/**
 * @docs
 * @description
 * Static pages aren't yet supported with i18n domains. If you wish to enable this feature, you have to disable prerendering.
 */
export declare const NoPrerenderedRoutesWithDomains: {
    name: string;
    title: string;
    message: (component: string) => string;
};
/**
 * @docs
 * @description
 * Astro throws an error if the user enables manual routing, but it doesn't have a middleware file.
 */
export declare const MissingMiddlewareForInternationalization: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * Astro could not find an associated file with content while trying to render the route. This is an Astro error and not a user error. If restarting the dev server does not fix the problem, please file an issue.
 */
export declare const CantRenderPage: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @description
 * Astro could not find any code to handle a rejected `Promise`. Make sure all your promises have an `await` or `.catch()` handler.
 */
export declare const UnhandledRejection: {
    name: string;
    title: string;
    message: (stack: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * The `astro:i18n` module can not be used without enabling i18n in your Astro config. To enable i18n, add a default locale and a list of supported locales to your Astro config:
 * ```js
 * import { defineConfig } from 'astro'
 * export default defineConfig({
 *  i18n: {
 * 	 locales: ['en', 'fr'],
 * 	 defaultLocale: 'en',
 * 	},
 * })
 * ```
 *
 * For more information on internationalization support in Astro, see our [Internationalization guide](https://docs.astro.build/en/guides/internationalization/).
 * @see
 * - [Internationalization](https://docs.astro.build/en/guides/internationalization/)
 * - [`i18n` Configuration Reference](https://docs.astro.build/en/reference/configuration-reference/#i18n)
 */
export declare const i18nNotEnabled: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @description
 * An i18n utility tried to use the locale from a URL path that does not contain one. You can prevent this error by using pathHasLocale to check URLs for a locale first before using i18n utilities.
 *
 */
export declare const i18nNoLocaleFoundInPath: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * Astro couldn't find a route matching the one provided by the user
 */
export declare const RouteNotFound: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * Some environment variables do not match the data type and/or properties defined in `env.schema`.
 * @message
 * The following environment variables defined in `env.schema` are invalid.
 */
export declare const EnvInvalidVariables: {
    name: string;
    title: string;
    message: (errors: Array<string>) => string;
};
/**
 * @docs
 * @description
 * This module is only available server-side.
 */
export declare const ServerOnlyModule: {
    name: string;
    title: string;
    message: (name: string) => string;
};
/**
 * @docs
 * @description
 * `Astro.rewrite()` cannot be used if the request body has already been read. If you need to read the body, first clone the request. For example:
 *
 * ```js
 * const data = await Astro.request.clone().formData();
 *
 * Astro.rewrite("/target")
 * ```
 *
 * @see
 * - [Request.clone()](https://developer.mozilla.org/en-US/docs/Web/API/Request/clone)
 * - [Astro.rewrite](https://docs.astro.build/en/reference/api-reference/#rewrite)
 */
export declare const RewriteWithBodyUsed: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @description
 * `Astro.rewrite()` can't be used to rewrite an on-demand route with a static route when using the `"server"` output.
 *
 */
export declare const ForbiddenRewrite: {
    name: string;
    title: string;
    message: (from: string, to: string, component: string) => string;
    hint: (component: string) => string;
};
/**
 * @docs
 * @description
 * An unknown error occurred while reading or writing files to disk. It can be caused by many things, eg. missing permissions or a file not existing we attempt to read.
 */
export declare const UnknownFilesystemError: {
    name: string;
    title: string;
    hint: string;
};
/**
 * @docs
 * @description
 * Cannot extract the font type from the given URL.
 * @message
 * An error occured while trying to extract the font type from the given URL.
 */
export declare const CannotExtractFontType: {
    name: string;
    title: string;
    message: (url: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * Cannot determine weight and style from font file, update your family config and set `weight` and `style` manually instead.
 * @message
 * An error occured while determining the weight and style from the local font file.
 */
export declare const CannotDetermineWeightAndStyleFromFontFile: {
    name: string;
    title: string;
    message: (family: string, url: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * Cannot fetch the given font file
 * @message
 * An error occured while fetching font file from the given URL.
 */
export declare const CannotFetchFontFile: {
    name: string;
    title: string;
    message: (url: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * Cannot load font provider
 * @message
 * Astro is unable to load the given font provider. Open an issue on the corresponding provider's repository.
 */
export declare const CannotLoadFontProvider: {
    name: string;
    title: string;
    message: (entrypoint: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * Font component is used but experimental fonts have not been registered in the config.
 */
export declare const ExperimentalFontsNotEnabled: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @description
 * Font family not found
 * @message
 * No data was found for the family passed to the Font component.
 */
export declare const FontFamilyNotFound: {
    name: string;
    title: string;
    message: (family: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * The CSP feature isn't enabled
 * @message
 * The `experimental.csp` configuration isn't enabled.
 */
export declare const CspNotEnabled: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @kind heading
 * @name CSS Errors
 */
/**
 * @docs
 * @see
 * 	- [Styles and CSS](https://docs.astro.build/en/guides/styling/)
 * @description
 * Astro encountered an unknown error while parsing your CSS. Oftentimes, this is caused by a syntax error and the error message should contain more information.
 */
export declare const UnknownCSSError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @message
 * **Example error messages:**<br/>
 * CSSSyntaxError: Missed semicolon<br/>
 * CSSSyntaxError: Unclosed string<br/>
 * @description
 * Astro encountered an error while parsing your CSS, due to a syntax error. This is often caused by a missing semicolon.
 */
export declare const CSSSyntaxError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @kind heading
 * @name Markdown Errors
 */
/**
 * @docs
 * @description
 * Astro encountered an unknown error while parsing your Markdown. Oftentimes, this is caused by a syntax error and the error message should contain more information.
 */
export declare const UnknownMarkdownError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @message
 * **Example error messages:**<br/>
 * can not read an implicit mapping pair; a colon is missed<br/>
 * unexpected end of the stream within a double quoted scalar<br/>
 * can not read a block mapping entry; a multiline key may not be an implicit key
 * @description
 * Astro encountered an error while parsing the frontmatter of your Markdown file.
 * This is often caused by a mistake in the syntax, such as a missing colon or a missing end quote.
 */
export declare const MarkdownFrontmatterParseError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @see
 * - [Modifying frontmatter programmatically](https://docs.astro.build/en/guides/markdown-content/#modifying-frontmatter-programmatically)
 * @description
 * A remark or rehype plugin attempted to inject invalid frontmatter. This occurs when "astro.frontmatter" is set to `null`, `undefined`, or an invalid JSON object.
 */
export declare const InvalidFrontmatterInjectionError: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [MDX installation and usage](https://docs.astro.build/en/guides/integrations-guide/mdx/)
 * @description
 * Unable to find the official `@astrojs/mdx` integration. This error is raised when using MDX files without an MDX integration installed.
 */
export declare const MdxIntegrationMissingError: {
    name: string;
    title: string;
    message: (file: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Configuration Reference](https://docs.astro.build/en/reference/configuration-reference/)
 * @description
 * Astro encountered an unknown error loading your Astro configuration file.
 * This is often caused by a syntax error in your config and the message should offer more information.
 *
 * If you can reliably cause this error to happen, we'd appreciate if you could [open an issue](https://astro.build/issues/)
 */
export declare const UnknownConfigError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @see
 * - [--config](https://docs.astro.build/en/reference/cli-reference/#--config-path)
 * @description
 * The specified configuration file using `--config` could not be found. Make sure that it exists or that the path is correct
 */
export declare const ConfigNotFound: {
    name: string;
    title: string;
    message: (configFile: string) => string;
};
/**
 * @docs
 * @see
 * - [Configuration reference](https://docs.astro.build/en/reference/configuration-reference/)
 * @description
 * Astro detected a legacy configuration option in your configuration file.
 */
export declare const ConfigLegacyKey: {
    name: string;
    title: string;
    message: (legacyConfigKey: string) => string;
    hint: string;
};
/**
 * @docs
 * @kind heading
 * @name CLI Errors
 */
/**
 * @docs
 * @description
 * Astro encountered an unknown error while starting one of its CLI commands. The error message should contain more information.
 *
 * If you can reliably cause this error to happen, we'd appreciate if you could [open an issue](https://astro.build/issues/)
 */
export declare const UnknownCLIError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @description
 * `astro sync` command failed to generate content collection types.
 * @see
 * - [Content collections documentation](https://docs.astro.build/en/guides/content-collections/)
 */
export declare const GenerateContentTypesError: {
    name: string;
    title: string;
    message: (errorMessage: string) => string;
    hint: (fileName?: string) => string;
};
/**
 * @docs
 * @kind heading
 * @name Content Collection Errors
 */
/**
 * @docs
 * @description
 * Astro encountered an unknown error loading your content collections.
 * This can be caused by certain errors inside your `src/content.config.ts` file or some internal errors.
 *
 * If you can reliably cause this error to happen, we'd appreciate if you could [open an issue](https://astro.build/issues/)
 */
export declare const UnknownContentCollectionError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @description
 * Astro tried to render a content collection entry that was undefined. This can happen if you try to render an entry that does not exist.
 */
export declare const RenderUndefinedEntryError: {
    name: string;
    title: string;
    hint: string;
};
/**
 * @docs
 * @description
 * The `getDataEntryById` and `getEntryBySlug` functions are deprecated and cannot be used with content layer collections. Use the `getEntry` function instead.
 */
export declare const GetEntryDeprecationError: {
    name: string;
    title: string;
    message: (collection: string, method: string) => string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error message:**<br/>
 * **blog** → **post.md** frontmatter does not match collection schema.<br/>
 * "title" is required.<br/>
 * "date" must be a valid date.
 * @description
 * A Markdown or MDX entry does not match its collection schema.
 * Make sure that all required fields are present, and that all fields are of the correct type.
 * You can check against the collection schema in your `src/content.config.*` file.
 * See the [Content collections documentation](https://docs.astro.build/en/guides/content-collections/) for more information.
 */
export declare const InvalidContentEntryFrontmatterError: {
    name: string;
    title: string;
    message(collection: string, entryId: string, error: ZodError): string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error message:**<br/>
 * **blog** → **post** frontmatter does not match collection schema.<br/>
 * "title" is required.<br/>
 * "date" must be a valid date.
 * @description
 * A content entry does not match its collection schema.
 * Make sure that all required fields are present, and that all fields are of the correct type.
 * You can check against the collection schema in your `src/content.config.*` file.
 * See the [Content collections documentation](https://docs.astro.build/en/guides/content-collections/) for more information.
 */
export declare const InvalidContentEntryDataError: {
    name: string;
    title: string;
    message(collection: string, entryId: string, error: ZodError): string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error message:**<br/>
 * The content loader for the collection **blog** returned an entry with an invalid `id`:<br/>
 * &#123;<br/>
 *   "id": 1,<br/>
 *   "title": "Hello, World!"<br/>
 * &#125;
 * @description
 * A content loader returned an invalid `id`.
 * Make sure that the `id` of the entry is a string.
 * See the [Content collections documentation](https://docs.astro.build/en/guides/content-collections/) for more information.
 */
export declare const ContentLoaderReturnsInvalidId: {
    name: string;
    title: string;
    message(collection: string, entry: any): string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error message:**<br/>
 * **blog** → **post** data does not match collection schema.<br/>
 * "title" is required.<br/>
 * "date" must be a valid date.
 * @description
 * A content entry does not match its collection schema.
 * Make sure that all required fields are present, and that all fields are of the correct type.
 * You can check against the collection schema in your `src/content.config.*` file.
 * See the [Content collections documentation](https://docs.astro.build/en/guides/content-collections/) for more information.
 */
export declare const ContentEntryDataError: {
    name: string;
    title: string;
    message(collection: string, entryId: string, error: ZodError): string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error message:**<br/>
 * The schema cannot be a function for live collections. Please use a schema object instead. Check your collection definitions in your live content config file.
 * @description
 * Error in live content config.
 * @see
 * - [Experimental live content](https://docs.astro.build/en/reference/experimental-flags/live-content-collections/)
 */
export declare const LiveContentConfigError: {
    name: string;
    title: string;
    message: (error: string, filename?: string) => string;
    hint: string;
};
/**
 * @docs
 * @message
 * **Example error message:**<br/>
 * The loader for **blog** returned invalid data.<br/>
 * Object is missing required property "id".
 * @description
 * The loader for a content collection returned invalid data.
 * Inline loaders must return an array of objects with unique ID fields or a plain object with IDs as keys and entries as values.
 */
export declare const ContentLoaderInvalidDataError: {
    name: string;
    title: string;
    message(collection: string, extra: string): string;
    hint: string;
};
/**
 * @docs
 * @message `COLLECTION_NAME` → `ENTRY_ID` has an invalid slug. `slug` must be a string.
 * @see
 * - [The reserved entry `slug` field](https://docs.astro.build/en/guides/content-collections/)
 * @description
 * A collection entry has an invalid `slug`. This field is reserved for generating entry slugs, and must be a string when present.
 */
export declare const InvalidContentEntrySlugError: {
    name: string;
    title: string;
    message(collection: string, entryId: string): string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Legacy content collections](https://docs.astro.build/en/guides/upgrade-to/v5/#updating-existing-collections)
 * @description
 * A legacy content collection schema should not contain the `slug` field. This is reserved by Astro for generating entry slugs. Remove `slug` from your schema. You can still use custom slugs in your frontmatter.
 */
export declare const ContentSchemaContainsSlugError: {
    name: string;
    title: string;
    message: (collectionName: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Legacy content collections](https://docs.astro.build/en/guides/upgrade-to/v5/#updating-existing-collections)
 * @description
 * A legacy content collection cannot contain a mix of content and data entries. You must store entries in separate collections by type.
 */
export declare const MixedContentDataCollectionError: {
    name: string;
    title: string;
    message: (collectionName: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Legacy content collections](https://docs.astro.build/en/guides/upgrade-to/v5/#updating-existing-collections)
 * @description
 * Legacy content collections must contain entries of the type configured. Collections are `type: 'content'` by default. Try adding `type: 'data'` to your collection config for data collections.
 */
export declare const ContentCollectionTypeMismatchError: {
    name: string;
    title: string;
    message: (collection: string, expectedType: string, actualType: string) => string;
};
/**
 * @docs
 * @message `COLLECTION_ENTRY_NAME` failed to parse.
 * @description
 * Collection entries of `type: 'data'` must return an object with valid JSON (for `.json` entries) or YAML (for `.yaml` entries).
 */
export declare const DataCollectionEntryParseError: {
    name: string;
    title: string;
    message(entryId: string, errorMessage: string): string;
    hint: string;
};
/**
 * @docs
 * @message `COLLECTION_NAME` contains multiple entries with the same slug: `SLUG`. Slugs must be unique.
 * @description
 * Content collection entries must have unique slugs. Duplicates are often caused by the `slug` frontmatter property.
 */
export declare const DuplicateContentEntrySlugError: {
    name: string;
    title: string;
    message(collection: string, slug: string, preExisting: string, alsoFound: string): string;
};
/**
 * @docs
 * @see
 * - [devalue library](https://github.com/rich-harris/devalue)
 * @description
 * `transform()` functions in your content config must return valid JSON, or data types compatible with the devalue library (including Dates, Maps, and Sets).
 */
export declare const UnsupportedConfigTransformError: {
    name: string;
    title: string;
    message: (parseError: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 *  - [Passing a `parser` to the `file` loader](https://docs.astro.build/en/guides/content-collections/#parser-function)
 * @description
 * The `file` loader can’t determine which parser to use. Please provide a custom parser (e.g. `toml.parse` or `csv-parse`) to create a collection from your file type.
 */
export declare const FileParserNotFound: {
    name: string;
    title: string;
    message: (fileName: string) => string;
};
/**
 * @docs
 * @see
 *  - [Astro's built-in loaders](https://docs.astro.build/en/guides/content-collections/#built-in-loaders)
 * @description
 * The `file` loader must be passed a single local file. Glob patterns are not supported. Use the built-in `glob` loader to create entries from patterns of multiple local files.
 */
export declare const FileGlobNotSupported: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @kind heading
 * @name Action Errors
 */
/**
 * @docs
 * @see
 * - [On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
 * @description
 * Your project must have a server output to create backend functions with Actions.
 */
export declare const ActionsWithoutServerOutputError: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [Actions handler reference](https://docs.astro.build/en/reference/modules/astro-actions/#handler-property)
 * @description
 * Action handler returned invalid data. Handlers should return serializable data types, and cannot return a Response object.
 */
export declare const ActionsReturnedInvalidDataError: {
    name: string;
    title: string;
    message: (error: string) => string;
    hint: string;
};
/**
 * @docs
 * @description
 * The server received a request for an action but could not find a match with the same name.
 */
export declare const ActionNotFoundError: {
    name: string;
    title: string;
    message: (actionName: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * - [`Astro.callAction()` reference](https://docs.astro.build/en/reference/api-reference/#callaction)
 * @description
 * Action called from a server page or endpoint without using `Astro.callAction()`.
 */
export declare const ActionCalledFromServerError: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
export declare const UnknownError: {
    name: string;
    title: string;
};
/**
 * @docs
 * @description
 * Thrown in development mode when the actions file can't be loaded.
 *
 */
export declare const ActionsCantBeLoaded: {
    name: string;
    title: string;
    message: string;
};
/**
 * @docs
 * @kind heading
 * @name Session Errors
 */
/**
 * @docs
 * @message Error when initializing session storage with driver `DRIVER`. `ERROR`
 * @see
 * 	- [Sessions](https://docs.astro.build/en/guides/sessions/)
 * @description
 * Thrown when the session storage could not be initialized.
 */
export declare const SessionStorageInitError: {
    name: string;
    title: string;
    message: (error: string, driver?: string) => string;
    hint: string;
};
/**
 * @docs
 * @message Error when saving session data with driver `DRIVER`. `ERROR`
 * @see
 * 	- [Sessions](https://docs.astro.build/en/guides/sessions/)
 * @description
 * Thrown when the session data could not be saved.
 */
export declare const SessionStorageSaveError: {
    name: string;
    title: string;
    message: (error: string, driver?: string) => string;
    hint: string;
};
/**
 * @docs
 * @see
 * 	- [Sessions](https://docs.astro.build/en/guides/sessions/)
 * @deprecated This error was removed in Astro 5.7, when the Sessions feature stopped being experimental.
 * @description
 * Your adapter must support server output to use sessions.
 */
export declare const SessionWithoutSupportedAdapterOutputError: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @message The `experimental.session` flag was set to `true`, but no storage was configured. Either configure the storage manually or use an adapter that provides session storage.
 * @deprecated This error was removed in Astro 5.7, when the Sessions feature stopped being experimental.
 * @see
 * 	- [Sessions](https://docs.astro.build/en/guides/sessions/)
 * @description
 * Thrown when session storage is enabled but not configured.
 */
export declare const SessionConfigMissingError: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
/**
 * @docs
 * @message Session config was provided without enabling the `experimental.session` flag
 * @deprecated This error was removed in Astro 5.7, when the Sessions feature stopped being experimental.
 * @see
 * 	- [Sessions](https://docs.astro.build/en/guides/sessions/)
 * @description
 * Thrown when session storage is configured but the `experimental.session` flag is not enabled.
 */
export declare const SessionConfigWithoutFlagError: {
    name: string;
    title: string;
    message: string;
    hint: string;
};
