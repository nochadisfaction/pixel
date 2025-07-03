/**
 * Temporal Analysis Algorithm
 * Analyzes multidimensional emotion patterns and trends over time
 */

import { createLogger } from '../../../utils/logger'
import type {
  EmotionAnalysis,
  DimensionalMap,
  MultidimensionalPattern,
  EmotionStatistics,
  EmotionDimensions,
} from '../emotions/types'

const logger = createLogger({ context: 'temporal-analysis-algorithm' })

// Temporal Analysis Functions
  /**
   * Analyze multidimensional patterns in emotion data over time
   */
export function analyzeMultidimensionalPatterns(
    emotionData: EmotionAnalysis[],
    dimensionalMaps: DimensionalMap[],
  ): MultidimensionalPattern[] {
    logger.info('Analyzing multidimensional patterns', {
      dataPoints: emotionData.length,
      dimensionalMaps: dimensionalMaps.length,
    })

    const patterns: MultidimensionalPattern[] = []

    // Ensure we have enough data for analysis
    if (dimensionalMaps.length < 3) {
      logger.warn('Insufficient data for pattern analysis', {
        required: 3,
        actual: dimensionalMaps.length,
      })
      return patterns
    }

    // Sort by timestamp to ensure chronological order
    const sortedMaps = [...dimensionalMaps].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    // Analyze different pattern types
    patterns.push(...detectTrends(sortedMaps))
    patterns.push(...detectCycles(sortedMaps))
    patterns.push(...detectShifts(sortedMaps))
    patterns.push(...detectStability(sortedMaps))

    // Filter out low-confidence patterns
    const filteredPatterns = patterns.filter(
      (pattern) => pattern.confidence > 0.5,
    )

    logger.info('Pattern analysis complete', {
      totalPatterns: patterns.length,
      filteredPatterns: filteredPatterns.length,
    })

    return filteredPatterns
  }

  /**
   * Detect trending patterns in dimensional data
   */
function detectTrends(
    maps: DimensionalMap[],
  ): MultidimensionalPattern[] {
    const trends: MultidimensionalPattern[] = []
    const windowSize = Math.min(10, Math.floor(maps.length / 3))

    if (windowSize < 3) {
      return trends
    }

    for (let i = 0; i <= maps.length - windowSize; i++) {
      const window = maps.slice(i, i + windowSize)

      // Calculate trend slopes for each dimension
      const valenceTrend = calculateTrendSlope(window, 'valence')
      const arousalTrend = calculateTrendSlope(window, 'arousal')
      const dominanceTrend = calculateTrendSlope(window, 'dominance')

      // Skip if any trend calculation failed
      if (valenceTrend === null || arousalTrend === null || dominanceTrend === null) {
        continue
      }

      // Check if any dimension shows significant trend
      const significantThreshold = 0.1
      const hasSignificantTrend =
        Math.abs(valenceTrend) > significantThreshold ||
        Math.abs(arousalTrend) > significantThreshold ||
        Math.abs(dominanceTrend) > significantThreshold

      if (hasSignificantTrend) {
        const confidence = calculateTrendConfidence(window)
        
        if (confidence !== null) {
          trends.push({
          id: `trend-${i}-${window[0]?.timestamp ?? 'unknown'}`,
          type: 'trend',
          timeRange: {
            start: window[0]?.timestamp ?? '',
            end: window[window.length - 1]?.timestamp ?? '',
          },
          description: describeTrend(
            valenceTrend,
            arousalTrend,
            dominanceTrend,
          ),
          dimensions: window.map((w) => w.dimensions).filter((d): d is EmotionDimensions => d !== undefined),
          confidence,
          significance: Math.max(
            Math.abs(valenceTrend),
            Math.abs(arousalTrend),
            Math.abs(dominanceTrend),
          ),
        })
        }
      }
    }

    return trends
  }

  /**
   * Detect cyclical patterns
   */
function detectCycles(
    maps: DimensionalMap[],
  ): MultidimensionalPattern[] {
    const cycles: MultidimensionalPattern[] = []

    // Look for periodic patterns using autocorrelation
    const minCycleLength = 4
    const maxCycleLength = Math.floor(maps.length / 3)

    for (
      let cycleLength = minCycleLength;
      cycleLength <= maxCycleLength;
      cycleLength++
    ) {
      const correlation = calculateAutocorrelation(maps, cycleLength)

      if (correlation !== null && correlation > 0.6) {
        // Strong correlation threshold
        cycles.push({
          id: `cycle-${cycleLength}-${maps[0]?.timestamp ?? 'unknown'}`,
          type: 'cycle',
          timeRange: {
            start: maps[0]?.timestamp ?? '',
            end: maps[maps.length - 1]?.timestamp ?? '',
          },
          description: `Cyclical pattern with period of ${cycleLength} data points`,
          dimensions: maps.map((m) => m.dimensions).filter((d): d is EmotionDimensions => d !== undefined),
          confidence: correlation,
          significance: correlation,
        })
      }
    }

    return cycles
  }

  /**
   * Detect sudden shifts or transitions
   */
function detectShifts(
    maps: DimensionalMap[],
  ): MultidimensionalPattern[] {
    const shifts: MultidimensionalPattern[] = []
    const changeThreshold = 0.5 // Minimum change to consider a shift

    for (let i = 1; i < maps.length - 1; i++) {
      const prevDims = maps[i - 1]?.dimensions
      const currDims = maps[i]?.dimensions
      const nextDims = maps[i + 1]?.dimensions

      if (!prevDims || !currDims || !nextDims) {
        continue
      }

      // Calculate magnitude of change
      const changeMagnitude = calculateDimensionalDistance(prevDims, currDims)

      // Check if change is sustained (not just noise)
      const nextChangeMagnitude = calculateDimensionalDistance(currDims, nextDims)
      const isSustained = nextChangeMagnitude < changeMagnitude * 0.5

      if (changeMagnitude > changeThreshold && isSustained) {
        shifts.push({
          id: `shift-${i}-${maps[i - 1]?.timestamp ?? 'unknown'}`,
          type: 'shift',
          timeRange: {
            start: maps[i - 1]?.timestamp ?? '',
            end: maps[i + 1]?.timestamp ?? '',
          },
          description: describeShift(prevDims, currDims),
          dimensions: [prevDims, currDims, nextDims],
          confidence: Math.min(changeMagnitude / changeThreshold, 1),
          significance: changeMagnitude,
        })
      }
    }

    return shifts
  }

  /**
   * Helper method to create a stable pattern from a segment
   */
function createStablePattern(
    stableSegment: DimensionalMap[],
    stableStart: number,
    reason: string
  ): MultidimensionalPattern | null {
    const filtered = stableSegment.filter(m => m.dimensions);
    if (filtered.length >= 5 && filtered[0]?.dimensions) {
      const confidence = calculateStabilityConfidence(filtered);
      if (confidence !== null) {
        return {
          id: `stability-${stableStart}-${reason}-${filtered[0].timestamp}`,
          type: 'stability',
          timeRange: {
            start: filtered[0]?.timestamp ?? '',
            end: filtered[filtered.length - 1]?.timestamp ?? '',
          },
          description: `Stable emotional state period${reason === 'missingData' ? ' (ended due to missing data point)' : ''}`,
          dimensions: filtered.map((w) => w.dimensions).filter((d): d is EmotionDimensions => d !== undefined),
          confidence,
          significance: filtered.length,
        };
      }
    }
    return null;
  }

  /**
   * Detect stability periods
   */
function detectStability(
    maps: DimensionalMap[],
  ): MultidimensionalPattern[] {
    const stablePatterns: MultidimensionalPattern[] = []
    const stabilityThreshold = 0.2
    const minStabilityLength = 5

    let stableStart = 0
    let isStable = true

    for (let i = 1; i < maps.length; i++) {
      const prevDims = maps[i - 1]?.dimensions
      const currDims = maps[i]?.dimensions
      let change = Infinity // Default to a large change if dimensions are missing

      if (prevDims && currDims) {
        change = calculateDimensionalDistance(prevDims, currDims)
      } else {
        // If dimensions are missing, this marks the end of any current stable period
        if (isStable && i - stableStart >= minStabilityLength) {
          // Process the stable period ending *before* the current problematic point
          const stableSegment = maps.slice(stableStart, i);
          const pattern = createStablePattern(stableSegment, stableStart, 'missingData');
          if (pattern) {
            stablePatterns.push(pattern);
          }
        }
        stableStart = i; // Next potential stable period starts after this problematic point
        isStable = false; // Not currently stable
        continue; // Move to the next iteration
      }

      if (change > stabilityThreshold) {
        // End of stable period due to significant change
        if (isStable && i - stableStart >= minStabilityLength) {
           const stableSegment = maps.slice(stableStart, i);
           const pattern = createStablePattern(stableSegment, stableStart, 'change');
           if (pattern) {
             stablePatterns.push(pattern);
           }
        }
        stableStart = i
        isStable = false
      } else {
        if (!isStable) {
          // If it wasn't stable, and now the change is small, start new stable period
          stableStart = i - 1 // Start from the previous point as this one is close to it
        }
        isStable = true
      }
    }
    // Check for any remaining stable period at the end
    if (isStable && maps.length - stableStart >= minStabilityLength) {
      const stableSegment = maps.slice(stableStart);
      const pattern = createStablePattern(stableSegment, stableStart, 'end');
      if (pattern) {
        stablePatterns.push(pattern);
      }
    }

    return stablePatterns
  }

  /**
   * Get valid dimensions from a window, filtering out undefined values
   */
function getValidDimensions(
    window: DimensionalMap[],
    dimension?: keyof EmotionDimensions,
  ): number[] {
    if (dimension) {
      return window
        .map((w) => w.dimensions?.[dimension])
        .filter((v): v is number => typeof v === 'number')
    }
    // Return combined values for all dimensions
    return window
      .map((w) => {
        if (!w.dimensions) {
          return undefined
        }
        return (w.dimensions.valence + w.dimensions.arousal + w.dimensions.dominance) / 3
      })
      .filter((v): v is number => typeof v === 'number')
  }

  /**
   * Calculate trend slope for a dimension
   */
function calculateTrendSlope(
    window: DimensionalMap[],
    dimension: keyof EmotionDimensions,
  ): number | null {
    if (window.length < 2) {
      return null
    }

    const values = getValidDimensions(window, dimension)

    if (values.length < 2) {
      return null // Not enough data points after filtering
    }
    const n = values.length

    // Simple linear regression slope calculation
    const sumX = (n * (n - 1)) / 2 // Sum of indices 0, 1, 2, ...
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6 // Sum of squares

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  }

  /**
   * Calculate autocorrelation for cycle detection
   */
function calculateAutocorrelation(
    maps: DimensionalMap[],
    lag: number,
  ): number | null {
    if (maps.length <= lag) {
      return null
    }

    const values = getValidDimensions(maps)

    if (values.length <= lag) {
      return null
    }
    const n = values.length - lag
    let correlation = 0

    for (let i = 0; i < n; i++) {
      const current = values[i]
      const lagged = values[i + lag]
      if (current !== undefined && lagged !== undefined) {
        correlation += current * lagged
      }
    }

    return correlation / n
  }

  /**
   * Calculate Euclidean distance between two dimensional points
   */
function calculateDimensionalDistance(
    dim1: EmotionDimensions,
    dim2: EmotionDimensions,
  ): number {
    const valenceDiff = dim1.valence - dim2.valence
    const arousalDiff = dim1.arousal - dim2.arousal
    const dominanceDiff = dim1.dominance - dim2.dominance

    return Math.sqrt(valenceDiff ** 2 + arousalDiff ** 2 + dominanceDiff ** 2)
  }

  /**
   * Calculate confidence for trend patterns
   */
function calculateTrendConfidence(window: DimensionalMap[]): number | null {
    // R-squared calculation for trend confidence
    const values = getValidDimensions(window)

    if (values.length < 2) {
      return null // Not enough data for confidence calculation
    }
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const totalVariance = values.reduce(
      (sum, val) => sum + (val - mean) ** 2,
      0,
    )

    if (totalVariance === 0) {
      return null
    }

    // Simple linear regression
    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    const residualVariance = values.reduce((sum, val, idx) => {
      const predicted = slope * idx + intercept
      return sum + (val - predicted) ** 2
    }, 0)

    return Math.max(0, 1 - residualVariance / totalVariance)
  }

  /**
   * Calculate stability confidence
   */
function calculateStabilityConfidence(
    window: DimensionalMap[],
  ): number | null {
    if (window.length < 2) {
      return null
    }

    const changes: number[] = []
    for (let i = 1; i < window.length; i++) {
      const prevDims = window[i-1]?.dimensions;
      const currDims = window[i]?.dimensions;
      if (prevDims && currDims) {
        changes.push(
          calculateDimensionalDistance(
            prevDims,
            currDims,
          ),
        )
      }
    }
    if (changes.length === 0) {
      return null // If no valid pairs to compare, return null
    }

    const avgChange =
      changes.reduce((sum, change) => sum + change, 0) / changes.length
    return Math.max(0, 1 - avgChange * 2) // Inverse relationship with average change
  }

  /**
   * Describe trend pattern
   */
function describeTrend(
    valenceTrend: number,
    arousalTrend: number,
    dominanceTrend: number,
  ): string {
    const descriptions: string[] = []

    if (Math.abs(valenceTrend) > 0.1) {
      descriptions.push(
        `${valenceTrend > 0 ? 'Increasing' : 'Decreasing'} emotional valence`,
      )
    }
    if (Math.abs(arousalTrend) > 0.1) {
      descriptions.push(
        `${arousalTrend > 0 ? 'Increasing' : 'Decreasing'} emotional arousal`,
      )
    }
    if (Math.abs(dominanceTrend) > 0.1) {
      descriptions.push(
        `${dominanceTrend > 0 ? 'Gaining' : 'Losing'} emotional control`,
      )
    }

    return descriptions.length > 0
      ? descriptions.join(', ')
      : 'Subtle emotional trend'
  }

  /**
   * Describe shift pattern
   */
function describeShift(
    from: EmotionDimensions,
    to: EmotionDimensions,
  ): string {
    const valenceDiff = to.valence - from.valence
    const arousalDiff = to.arousal - from.arousal
    const dominanceDiff = to.dominance - from.dominance

    const changes: string[] = []

    if (Math.abs(valenceDiff) > 0.3) {
      changes.push(
        `Shift to ${valenceDiff > 0 ? 'more positive' : 'more negative'} emotions`,
      )
    }
    if (Math.abs(arousalDiff) > 0.3) {
      changes.push(
        `${arousalDiff > 0 ? 'Increased' : 'Decreased'} emotional intensity`,
      )
    }
    if (Math.abs(dominanceDiff) > 0.3) {
      changes.push(
        `Shift to ${dominanceDiff > 0 ? 'more' : 'less'} emotional control`,
      )
    }

    return changes.length > 0
      ? changes.join(', ')
      : 'Sudden emotional state change'
  }

  /**
   * Calculate comprehensive emotion statistics
   */
export function calculateEmotionStatistics(
    emotionData: EmotionAnalysis[],
  ): EmotionStatistics {
    if (emotionData.length === 0) {
      throw new Error('Cannot calculate statistics for empty emotion data')
    }

    const dimensions = emotionData
        .map((e) => e.dimensions)
        .filter((d): d is EmotionDimensions => d !== undefined);

    if (dimensions.length === 0) {
      // Handle case where all emotionData items might have undefined dimensions
      throw new Error('No valid dimensions available for statistics calculation after filtering');
    }

    // Calculate means
    const mean: EmotionDimensions = {
      valence:
        dimensions.reduce((sum, d) => sum + d.valence, 0) / dimensions.length,
      arousal:
        dimensions.reduce((sum, d) => sum + d.arousal, 0) / dimensions.length,
      dominance:
        dimensions.reduce((sum, d) => sum + d.dominance, 0) / dimensions.length,
    }

    // Calculate variances
    const variance: EmotionDimensions = {
      valence:
        dimensions.reduce(
          (sum, d) => sum + (d.valence - mean.valence) ** 2,
          0,
        ) / dimensions.length,
      arousal:
        dimensions.reduce(
          (sum, d) => sum + (d.arousal - mean.arousal) ** 2,
          0,
        ) / dimensions.length,
      dominance:
        dimensions.reduce(
          (sum, d) => sum + (d.dominance - mean.dominance) ** 2,
          0,
        ) / dimensions.length,
    }

    // Calculate trends (using first and last quarters)
    const quarterSize = Math.floor(dimensions.length / 4)
    let firstQuarter: EmotionDimensions[] = [];
    let lastQuarter: EmotionDimensions[] = [];
    let firstMean: EmotionDimensions = { valence: 0, arousal: 0, dominance: 0 };
    let lastMean: EmotionDimensions = { valence: 0, arousal: 0, dominance: 0 };

    if (quarterSize > 0) {
      firstQuarter = dimensions.slice(0, quarterSize)
      lastQuarter = dimensions.slice(-quarterSize)

      if (firstQuarter.length > 0) {
        firstMean = {
          valence:
            firstQuarter.reduce((sum, d) => sum + d.valence, 0) /
            firstQuarter.length,
          arousal:
            firstQuarter.reduce((sum, d) => sum + d.arousal, 0) /
            firstQuarter.length,
          dominance:
            firstQuarter.reduce((sum, d) => sum + d.dominance, 0) /
            firstQuarter.length,
        }
      }
      if (lastQuarter.length > 0) {
        lastMean = {
          valence:
            lastQuarter.reduce((sum, d) => sum + d.valence, 0) / lastQuarter.length,
          arousal:
            lastQuarter.reduce((sum, d) => sum + d.arousal, 0) / lastQuarter.length,
          dominance:
            lastQuarter.reduce((sum, d) => sum + d.dominance, 0) /
            lastQuarter.length,
        }
      }
    }


    const trend: EmotionDimensions = {
      valence: lastMean.valence - firstMean.valence,
      arousal: lastMean.arousal - firstMean.arousal,
      dominance: lastMean.dominance - firstMean.dominance,
    }

    // Calculate stability (inverse of average variance)
    const stability =
      1 / (1 + (variance.valence + variance.arousal + variance.dominance) / 3)

    // Calculate volatility (average change between consecutive points)
    let totalChange = 0
    if (dimensions.length > 1) {
      for (let i = 1; i < dimensions.length; i++) {
        // dimensions[i-1] and dimensions[i] are guaranteed to be defined here due to earlier filter
        const prev = dimensions[i - 1]
        const curr = dimensions[i]
        if (prev && curr) {
          totalChange += calculateDimensionalDistance(prev, curr)
        }
      }
    }
    const volatility = dimensions.length > 1 ? totalChange / (dimensions.length - 1) : 0;

    return {
      mean,
      variance,
      trend,
      stability,
      volatility,
    }
  }

