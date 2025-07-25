import type { FSWatcher } from 'vite';
import type { ZodSchema } from 'zod';
import type { AstroIntegrationLogger } from '../../core/logger/core.js';
import type { AstroConfig } from '../../types/public/config.js';
import type { LiveDataCollection, LiveDataEntry } from '../../types/public/content.js';
import type { RenderedContent } from '../data-store.js';
import type { DataStore, MetaStore } from '../mutable-data-store.js';
export type { DataStore, MetaStore };
export interface ParseDataOptions<TData extends Record<string, unknown>> {
    /** The ID of the entry. Unique per collection */
    id: string;
    /** The raw, unvalidated data of the entry */
    data: TData;
    /** An optional file path, where the entry represents a local file. */
    filePath?: string;
}
export interface LoaderContext {
    /** The unique name of the collection */
    collection: string;
    /** A database to store the actual data */
    store: DataStore;
    /**  A simple KV store, designed for things like sync tokens */
    meta: MetaStore;
    logger: AstroIntegrationLogger;
    /** Astro config, with user config and merged defaults */
    config: AstroConfig;
    /** Validates and parses the data according to the collection schema */
    parseData<TData extends Record<string, unknown>>(props: ParseDataOptions<TData>): Promise<TData>;
    /** Renders markdown content to HTML and metadata */
    renderMarkdown(content: string): Promise<RenderedContent>;
    /** Generates a non-cryptographic content digest. This can be used to check if the data has changed */
    generateDigest(data: Record<string, unknown> | string): string;
    /** When running in dev, this is a filesystem watcher that can be used to trigger updates */
    watcher?: FSWatcher;
    /** If the loader has been triggered by an integration, this may optionally contain extra data set by that integration */
    refreshContextData?: Record<string, unknown>;
}
export interface Loader {
    /** Unique name of the loader, e.g. the npm package name */
    name: string;
    /** Do the actual loading of the data */
    load: (context: LoaderContext) => Promise<void>;
    /** Optionally, define the schema of the data. Will be overridden by user-defined schema */
    schema?: ZodSchema | Promise<ZodSchema> | (() => ZodSchema | Promise<ZodSchema>);
}
export interface LoadEntryContext<TEntryFilter = never> {
    filter: TEntryFilter extends never ? {
        id: string;
    } : TEntryFilter;
}
export interface LoadCollectionContext<TCollectionFilter = unknown> {
    filter?: TCollectionFilter;
}
export interface LiveLoader<TData extends Record<string, any> = Record<string, unknown>, TEntryFilter extends Record<string, any> | never = never, TCollectionFilter extends Record<string, any> | never = never, TError extends Error = Error> {
    /** Unique name of the loader, e.g. the npm package name */
    name: string;
    /** Load a single entry */
    loadEntry: (context: LoadEntryContext<TEntryFilter>) => Promise<LiveDataEntry<TData> | undefined | {
        error: TError;
    }>;
    /** Load a collection of entries */
    loadCollection: (context: LoadCollectionContext<TCollectionFilter>) => Promise<LiveDataCollection<TData> | {
        error: TError;
    }>;
}
