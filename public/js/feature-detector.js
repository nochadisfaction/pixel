/**
 * Feature Detector
 *
 * Detects browser feature support and conditionally loads polyfills
 * for unsupported features. This provides progressive enhancement
 * while minimizing unnecessary code for modern browsers.
 */

// Feature Detection for critical browser features
;(function () {
  // Define polyfill map for various features
  const polyfillMap = {
    intersectionObserver: '/polyfills/intersection-observer.js',
    resizeObserver: '/polyfills/resize-observer.js',
    fetch: '/polyfills/fetch.js',
    promise: '/polyfills/promise.js',
    customElements: '/polyfills/custom-elements.js',
    objectFromEntries: '/polyfills/object-from-entries.js',
    buffer: '/polyfills/buffer-polyfill.js'
  }

  // Check if required features are supported
  const features = {
    webgl: (function () {
      try {
        const canvas = document.createElement('canvas')
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl'))
        )
      } catch (e) {
        return false
      }
    })(),
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    fetch: 'fetch' in window,
    promise: 'Promise' in window,
    customElements: 'customElements' in window,
    objectFromEntries: 'fromEntries' in Object,
    buffer: 'Buffer' in window
  }

  // Determine which features are unsupported
  const unsupportedFeatures = {}
  for (const [feature, isSupported] of Object.entries(features)) {
    unsupportedFeatures[feature] = !isSupported
  }

  // Initialize feature detection global
  window.featureDetection = {
    unsupportedFeatures,
    polyfillMap,
    loadedPolyfills: []
  }

  // Simple polyfill for Buffer if needed
  const BufferPolyfill = {
    from: function(data, encoding) {
      if (typeof data === 'string') {
        return new Uint8Array(data.split('').map(c => c.charCodeAt(0)))
      }
      return new Uint8Array(data)
    },
    isBuffer: function(obj) {
      return obj instanceof Uint8Array
    }
  }

  // Script loader utility
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => {
        window.featureDetection.loadedPolyfills.push(url)
        resolve()
      }
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`))
      document.head.appendChild(script)
    })
  }

  // Collect all unique polyfills to load (except Buffer, which is handled separately)
  const polyfillsToLoad = []
  for (const [feature, isUnsupported] of Object.entries(unsupportedFeatures)) {
    if (
      isUnsupported &&
      feature !== 'buffer' &&
      polyfillMap[feature] &&
      !polyfillsToLoad.includes(polyfillMap[feature])
    ) {
      polyfillsToLoad.push(polyfillMap[feature])
    }
  }

  // Buffer polyfill logic (async + fallback)
  let bufferPolyfillPromise = Promise.resolve()
  if (unsupportedFeatures.buffer) {
    const bufferPolyfillUrl = polyfillMap.buffer
    if (bufferPolyfillUrl) {
      bufferPolyfillPromise = loadScript(bufferPolyfillUrl).catch((err) => {
        console.error('Failed to load Buffer polyfill', err)
        // Fallback to inline BufferPolyfill if import fails
        window.Buffer = BufferPolyfill
        window.featureDetection.loadedPolyfills.push(
          'inline-buffer-polyfill-fallback',
        )
        console.log('Using inline Buffer polyfill as fallback')
      })
    } else {
      // No external polyfill, use inline immediately
      window.Buffer = BufferPolyfill
      window.featureDetection.loadedPolyfills.push('inline-buffer-polyfill')
      console.log('Buffer polyfill loaded successfully (inline)')
    }
  }

  // Log which polyfills are being loaded
  if (polyfillsToLoad.length > 0) {
    console.log('Loading polyfills for unsupported features:', polyfillsToLoad)
    if (window.navigator.sendBeacon) {
      try {
        const polyfillData = {
          unsupportedFeatures: Object.keys(unsupportedFeatures).filter(
            (f) => unsupportedFeatures[f],
          ),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
        const analyticsEndpoint =
          window.ANALYTICS_ENDPOINT || '/api/analytics/polyfill-usage'
        navigator.sendBeacon(analyticsEndpoint, JSON.stringify(polyfillData))
      } catch (e) {
        console.error('Failed to send polyfill analytics', e)
      }
    }
  }

  // Load all polyfills in parallel, including Buffer polyfill logic
  Promise.all([...polyfillsToLoad.map(loadScript), bufferPolyfillPromise])
    .then(() => {
      console.log('All polyfills loaded successfully')
      window.dispatchEvent(new CustomEvent('polyfills-loaded'))
    })
    .catch((error) => {
      console.error('Failed to load some polyfills', error)
      window.dispatchEvent(
        new CustomEvent('polyfills-loaded', { detail: { error } }),
      )
    })
})()
