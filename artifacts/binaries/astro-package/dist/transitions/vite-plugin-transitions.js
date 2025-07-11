const virtualModuleId = "astro:transitions";
const resolvedVirtualModuleId = "\0" + virtualModuleId;
const virtualClientModuleId = "astro:transitions/client";
const resolvedVirtualClientModuleId = "\0" + virtualClientModuleId;
function astroTransitions({ settings }) {
  return {
    name: "astro:transitions",
    config() {
      return {
        optimizeDeps: {
          include: ["astro > cssesc"]
        }
      };
    },
    async resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
      if (id === virtualClientModuleId) {
        return resolvedVirtualClientModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return {
          code: `
						export * from "astro/virtual-modules/transitions.js";
						export {
							default as ViewTransitions,
							default as ClientRouter
						} from "astro/components/ClientRouter.astro";
					`
        };
      }
      if (id === resolvedVirtualClientModuleId) {
        return {
          code: `
						export { navigate, supportsViewTransitions, transitionEnabledOnThisPage } from "astro/virtual-modules/transitions-router.js";
						export * from "astro/virtual-modules/transitions-types.js";
						export {
							TRANSITION_BEFORE_PREPARATION, isTransitionBeforePreparationEvent, TransitionBeforePreparationEvent,
							TRANSITION_AFTER_PREPARATION,
							TRANSITION_BEFORE_SWAP, isTransitionBeforeSwapEvent, TransitionBeforeSwapEvent,
							TRANSITION_AFTER_SWAP, TRANSITION_PAGE_LOAD
						} from "astro/virtual-modules/transitions-events.js";
						export { swapFunctions } from "astro/virtual-modules/transitions-swap-functions.js";
					`
        };
      }
    },
    transform(code, id) {
      if (id.includes("ClientRouter.astro") && id.endsWith(".ts")) {
        const prefetchDisabled = settings.config.prefetch === false;
        return code.replace("__PREFETCH_DISABLED__", JSON.stringify(prefetchDisabled));
      }
    }
  };
}
export {
  astroTransitions as default
};
