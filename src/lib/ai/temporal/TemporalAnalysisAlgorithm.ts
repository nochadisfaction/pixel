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

  if (dimensionalMaps.length < 3) {
    logger.warn('Insufficient data for pattern analysis', {
      required: 3,
      actual: dimensionalMaps.length,
    })
    return patterns
  }

  const sortedMaps = [...dimensionalMaps].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  patterns.push(...detectTrends(sortedMaps))
  patterns.push(...detectCycles(sortedMaps))
  patterns.push(...detectShifts(sortedMaps))
  patterns.push(...detectStability(sortedMaps))

  const filteredPatterns = patterns.filter((pattern) => pattern.confidence > 0.5)

  logger.info('Pattern analysis complete', {
    totalPatterns: patterns.length,
    filteredPatterns: filteredPatterns.length,
  })

  return filteredPatterns
}

function detectTrends(maps: DimensionalMap[]): MultidimensionalPattern[] {
  const trends: MultidimensionalPattern[] = []
  const windowSize = Math.min(10, Math.floor(maps.length / 3))

  if (windowSize < 3) {
    return trends
  }

  for (let i = 0; i <= maps.length - windowSize; i++) {
    const window = maps.slice(i, i + windowSize)
    const valenceTrend = calculateTrendSlope(window, 'valence')
    const arousalTrend = calculateTrendSlope(window, 'arousal')
    const dominanceTrend = calculateTrendSlope(window, 'dominance')

    const significantThreshold = 0.1
    const hasSignificantTrend =
      Math.abs(valenceTrend) > significantThreshold ||
      Math.abs(arousalTrend) > significantThreshold ||
      Math.abs(dominanceTrend) > significantThreshold

    if (hasSignificantTrend) {
      const confidence = calculateTrendConfidence(window)
      trends.push({
        id: `trend-${i}-${Date.now()}`,
        type: 'trend',
        timeRange: {
          start: window[0]?.timestamp ?? '',
          end: window[window.length - 1]?.timestamp ?? '',
        },
        description: describeTrend(valenceTrend, arousalTrend, dominanceTrend),
        dimensions: window.map((w) => w.dimensions),
        confidence,
        significance: Math.max(
          Math.abs(valenceTrend),
          Math.abs(arousalTrend),
          Math.abs(dominanceTrend),
        ),
      })
    }
  }

  return trends
}

function detectCycles(maps: DimensionalMap[]): MultidimensionalPattern[] {
  const cycles: MultidimensionalPattern[] = []
  const minCycleLength = 4
  const maxCycleLength = Math.floor(maps.length / 3)

  for (let cycleLength = minCycleLength; cycleLength <= maxCycleLength; cycleLength++) {
    const correlation = calculateAutocorrelation(maps, cycleLength)

    if (correlation > 0.6) {
      cycles.push({
        id: `cycle-${cycleLength}-${Date.now()}`,
        type: 'cycle',
        timeRange: {
          start: maps[0]?.timestamp ?? '',
          end: maps[maps.length - 1]?.timestamp ?? '',
        },
        description: `Cyclical pattern with period of ${cycleLength} data points`,
        dimensions: maps.map((m) => m.dimensions),
        confidence: correlation,
        significance: correlation,
      })
    }
  }

  return cycles
}

function detectShifts(maps: DimensionalMap[]): MultidimensionalPattern[] {
  const shifts: MultidimensionalPattern[] = []
  const changeThreshold = 0.5

  for (let i = 1; i < maps.length - 1; i++) {
    const prevDims = maps[i - 1]?.dimensions
    const currDims = maps[i]?.dimensions
    const nextDims = maps[i + 1]?.dimensions

    if (!prevDims || !currDims || !nextDims) {
      continue
    }

    const changeMagnitude = calculateDimensionalDistance(prevDims, currDims)
    const nextChangeMagnitude = calculateDimensionalDistance(currDims, nextDims)
    const isSustained = nextChangeMagnitude < changeMagnitude * 0.5

    if (changeMagnitude > changeThreshold && isSustained) {
      shifts.push({
        id: `shift-${i}-${Date.now()}`,
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

function detectStability(maps: DimensionalMap[]): MultidimensionalPattern[] {
  const stablePatterns: MultidimensionalPattern[] = []
  const stabilityThreshold = 0.2
  const minStabilityLength = 5

  let stableStart = 0
  let isStable = true

  for (let i = 1; i < maps.length; i++) {
    const prevDims = maps[i - 1]?.dimensions
    const currDims = maps[i]?.dimensions
    let change = Infinity

    if (prevDims && currDims) {
      change = calculateDimensionalDistance(prevDims, currDims)
    } else {
      if (isStable && i - stableStart >= minStabilityLength) {
        const stableSegment = maps.slice(stableStart, i).filter(m => m.dimensions)
        if (stableSegment.length >= minStabilityLength && stableSegment[0]?.dimensions) {
          stablePatterns.push({
            id: `stability-${stableStart}-missingData-${Date.now()}`,
            type: 'stability',
            timeRange: {
              start: stableSegment[0].timestamp,
              end: stableSegment[stableSegment.length - 1]?.timestamp ?? '',
            },
            description: 'Stable emotional state period (ended due to missing data point)',
            dimensions: stableSegment.map((w) => w.dimensions!),
            confidence: calculateStabilityConfidence(stableSegment),
            significance: stableSegment.length,
          })
        }
      }
      stableStart = i
      isStable = false
      continue
    }

    if (change > stabilityThreshold) {
      if (isStable && i - stableStart >= minStabilityLength) {
        const stableSegment = maps.slice(stableStart, i).filter(m => m.dimensions)
        if (stableSegment.length >= minStabilityLength && stableSegment[0]?.dimensions) {
          stablePatterns.push({
            id: `stability-${stableStart}-change-${Date.now()}`,
            type: 'stability',
            timeRange: {
              start: stableSegment[0].timestamp,
              end: stableSegment[stableSegment.length - 1]?.timestamp ?? '',
            },
            description: 'Stable emotional state period',
            dimensions: stableSegment.map((w) => w.dimensions!),
            confidence: calculateStabilityConfidence(stableSegment),
            significance: stableSegment.length,
          })
        }
      }
      stableStart = i
      isStable = false
    } else {
      if (!isStable) {
        stableStart = i - 1
      }
      isStable = true
    }
  }

  if (isStable && maps.length - stableStart >= minStabilityLength) {
    const stableSegment = maps.slice(stableStart).filter(m => m.dimensions)
    if (stableSegment.length >= minStabilityLength && stableSegment[0]?.dimensions) {
      stablePatterns.push({
        id: `stability-${stableStart}-end-${Date.now()}`,
        type: 'stability',
        timeRange: {
          start: stableSegment[0].timestamp,
          end: stableSegment[stableSegment.length - 1]?.timestamp ?? '',
        },
        description: 'Stable emotional state period',
        dimensions: stableSegment.map((w) => w.dimensions!),
        confidence: calculateStabilityConfidence(stableSegment),
        significance: stableSegment.length,
      })
    }
  }

  return stablePatterns
}

function calculateTrendSlope(
  window: DimensionalMap[],
  dimension: keyof EmotionDimensions,
): number {
  if (window.length < 2) {
    return 0
  }

  const values = window
    .map((w) => w.dimensions?.[dimension])
    .filter((v): v is number => typeof v === 'number')

  if (values.length < 2) {
    return 0
  }
  const n = values.length

  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((sum, val) => sum + val, 0)
  const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
}

function calculateAutocorrelation(maps: DimensionalMap[], lag: number): number {
  if (maps.length <= lag) {
    return 0
  }

  const values = maps
    .map((m) => {
      if (!m.dimensions) {
        return undefined
      }
      return (m.dimensions.valence + m.dimensions.arousal + m.dimensions.dominance) / 3
    })
    .filter((v): v is number => typeof v === 'number')

  if (values.length <= lag) {
    return 0
  }
  const n = values.length - lag
  let correlation = 0

  for (let i = 0; i < n; i++) {
    if (typeof values[i] === 'number' && typeof values[i + lag] === 'number') {
      correlation += values[i]! * values[i + lag]!
    }
  }

  return correlation / n
}

function calculateDimensionalDistance(
  dim1: EmotionDimensions,
  dim2: EmotionDimensions,
): number {
  const valenceDiff = dim1.valence - dim2.valence
  const arousalDiff = dim1.arousal - dim2.arousal
  const dominanceDiff = dim1.dominance - dim2.dominance

  return Math.sqrt(valenceDiff ** 2 + arousalDiff ** 2 + dominanceDiff ** 2)
}

function calculateTrendConfidence(window: DimensionalMap[]): number {
  const values = window
    .map((w) => {
      if (!w.dimensions) {
        return undefined
      }
      return (w.dimensions.valence + w.dimensions.arousal + w.dimensions.dominance) / 3
    })
    .filter((v): v is number => typeof v === 'number')

  if (values.length < 2) {
    return 0
  }
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const totalVariance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0)

  if (totalVariance === 0) {
    return 0
  }

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

function calculateStabilityConfidence(window: DimensionalMap[]): number {
  if (window.length < 2) {
    return 0
  }

  const changes = []
  for (let i = 1; i < window.length; i++) {
    const prevDims = window[i - 1]?.dimensions
    const currDims = window[i]?.dimensions
    if (prevDims && currDims) {
      changes.push(calculateDimensionalDistance(prevDims, currDims))
    }
  }
  if (changes.length === 0) {
    return 1
  }

  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length
  return Math.max(0, 1 - avgChange * 2)
}

function describeTrend(
  valenceTrend: number,
  arousalTrend: number,
  dominanceTrend: number,
): string {
  const descriptions = []

  if (Math.abs(valenceTrend) > 0.1) {
    descriptions.push(
      `${valenceTrend > 0 ? 'Improving' : 'Declining'} emotional valence`,
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

function describeShift(from: EmotionDimensions, to: EmotionDimensions): string {
  const valenceDiff = to.valence - from.valence
  const arousalDiff = to.arousal - from.arousal
  const dominanceDiff = to.dominance - from.dominance

  const changes = []

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

export function calculateEmotionStatistics(
  emotionData: EmotionAnalysis[],
): EmotionStatistics {
  if (emotionData.length === 0) {
    throw new Error('Cannot calculate statistics for empty emotion data')
  }

  const dimensions = emotionData
    .map((e) => e.dimensions)
    .filter((d): d is EmotionDimensions => d !== undefined)

  if (dimensions.length === 0) {
    logger.warn('No valid dimensions found in emotionData for statistics calculation')
    throw new Error('No valid dimensions available for statistics calculation after filtering')
  }

  const mean: EmotionDimensions = {
    valence: dimensions.reduce((sum, d) => sum + d.valence, 0) / dimensions.length,
    arousal: dimensions.reduce((sum, d) => sum + d.arousal, 0) / dimensions.length,
    dominance: dimensions.reduce((sum, d) => sum + d.dominance, 0) / dimensions.length,
  }

  const variance: EmotionDimensions = {
    valence:
      dimensions.reduce((sum, d) => sum + (d.valence - mean.valence) ** 2, 0) /
      dimensions.length,
    arousal:
      dimensions.reduce((sum, d) => sum + (d.arousal - mean.arousal) ** 2, 0) /
      dimensions.length,
    dominance:
      dimensions.reduce((sum, d) => sum + (d.dominance - mean.dominance) ** 2, 0) /
      dimensions.length,
  }

  const quarterSize = Math.floor(dimensions.length / 4)
  let firstMean: EmotionDimensions = { valence: 0, arousal: 0, dominance: 0 }
  let lastMean: EmotionDimensions = { valence: 0, arousal: 0, dominance: 0 }

  if (quarterSize > 0) {
    const firstQuarter = dimensions.slice(0, quarterSize)
    const lastQuarter = dimensions.slice(-quarterSize)

    if (firstQuarter.length > 0) {
      firstMean = {
        valence: firstQuarter.reduce((sum, d) => sum + d.valence, 0) / firstQuarter.length,
        arousal: firstQuarter.reduce((sum, d) => sum + d.arousal, 0) / firstQuarter.length,
        dominance: firstQuarter.reduce((sum, d) => sum + d.dominance, 0) / firstQuarter.length,
      }
    }
    if (lastQuarter.length > 0) {
      lastMean = {
        valence: lastQuarter.reduce((sum, d) => sum + d.valence, 0) / lastQuarter.length,
        arousal: lastQuarter.reduce((sum, d) => sum + d.arousal, 0) / lastQuarter.length,
        dominance: lastQuarter.reduce((sum, d) => sum + d.dominance, 0) / lastQuarter.length,
      }
    }
  }

  const trend: EmotionDimensions = {
    valence: lastMean.valence - firstMean.valence,
    arousal: lastMean.arousal - firstMean.arousal,
    dominance: lastMean.dominance - firstMean.dominance,
  }

  const stability =
    1 / (1 + (variance.valence + variance.arousal + variance.dominance) / 3)

  let totalChange = 0
  if (dimensions.length > 1) {
    for (let i = 1; i < dimensions.length; i++) {
      const prev = dimensions[i - 1]
      const curr = dimensions[i]
      if (prev && curr) {
        totalChange += calculateDimensionalDistance(prev, curr)
      }
    }
  }
  const volatility = dimensions.length > 1 ? totalChange / (dimensions.length - 1) : 0

  return {
    mean,
    variance,
    trend,
    stability,
    volatility,
  }
}

// For backward compatibility, export a class-like object
export const TemporalAnalysisAlgorithm = {
  analyzeMultidimensionalPatterns,
  calculateEmotionStatistics,
}