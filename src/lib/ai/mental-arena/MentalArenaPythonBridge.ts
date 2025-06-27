/**
 * Production-Grade Mental Arena Python Bridge
 * 
 * This bridge enables seamless integration with Python-based MentalArena libraries
 * for advanced therapeutic conversation generation and analysis.
 * 
 * Features:
 * - Secure Python process management
 * - Bidirectional data serialization
 * - Error handling and recovery
 * - Performance monitoring
 * - Resource management
 * 
 * @author MentalArena Integration Team
 * @since 2025-06-27
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getLogger } from '@/lib/utils/logger'

const logger = getLogger('MentalArenaPythonBridge')

export interface PythonBridgeConfig {
  mentalArenaPath: string
  pythonPath: string
  virtualEnvPath?: string
  timeout?: number
  maxRetries?: number
  enableLogging?: boolean
  securityMode?: 'strict' | 'standard' | 'development'
}

export interface PythonExecutionResult {
  success: boolean
  output: unknown
  error?: string | undefined
  exitCode?: number | undefined
  executionTime: number
  metadata: {
    command: string
    timestamp: string
    processId: number
  }
}

export interface GenerateDataOptions {
  baseModel: string
  outputFile: string
  numSessions: number
  disorders?: string[]
  maxTurns?: number
  temperature?: number
  qualityThreshold?: number
  useEncryption?: boolean
}

export interface ModelEvaluationOptions {
  modelPath: string
  testDataPath: string
  outputPath: string
  metrics?: string[]
  batchSize?: number
}

export interface SymptomAnalysisOptions {
  text: string
  analysisType: 'encoding' | 'decoding' | 'validation'
  context?: Record<string, unknown>
}

/**
 * Production-grade Python bridge for MentalArena integration
 */
export class MentalArenaPythonBridge {
  private config: Required<PythonBridgeConfig>
  private pythonProcess?: ChildProcess
  private isInitialized: boolean = false
  private processQueue: Array<{
    id: string
    command: string
    args: string[]
    resolve: (result: PythonExecutionResult) => void
    reject: (error: Error) => void
    timestamp: number
  }> = []
  private isProcessing: boolean = false
  private performanceMetrics: BridgePerformanceMetrics

  constructor(config: PythonBridgeConfig) {
    this.config = {
      timeout: 300000, // 5 minutes default
      maxRetries: 3,
      enableLogging: true,
      securityMode: 'standard',
      ...config,
    } as Required<PythonBridgeConfig>

    this.performanceMetrics = new BridgePerformanceMetrics()

    logger.info('MentalArenaPythonBridge initialized', {
      mentalArenaPath: this.config.mentalArenaPath,
      pythonPath: this.config.pythonPath,
      securityMode: this.config.securityMode,
    })
  }

  /**
   * Initialize the Python bridge and MentalArena environment
   */
  async initialize(): Promise<void> {
    const startTime = Date.now()
    logger.info('Initializing MentalArena Python environment')

    try {
      // Validate security settings
      await this.validateSecurityConstraints()

      // Ensure MentalArena repository exists
      await this.ensureMentalArenaRepository()

      // Set up Python environment
      await this.setupPythonEnvironment()

      // Validate Python installation and dependencies
      await this.validatePythonEnvironment()

      // Test basic functionality
      await this.runBasicValidation()

      this.isInitialized = true
      const initTime = Date.now() - startTime

      this.performanceMetrics.recordInitialization(initTime)
      logger.info('MentalArena Python bridge initialized successfully', {
        initializationTime: initTime,
      })
    } catch (error) {
      logger.error('Failed to initialize MentalArena Python bridge', error)
      throw new Error(`Python bridge initialization failed: ${error}`)
    }
  }

  /**
   * Generate synthetic therapeutic data using Python MentalArena
   */
  async generateData(options: GenerateDataOptions): Promise<PythonExecutionResult> {
    this.ensureInitialized()

    const command = 'python'
    const args = [
      path.join(this.config.mentalArenaPath, 'scripts', 'arena_med.py'),
      '--base-model', options.baseModel,
      '--output-file', options.outputFile,
      '--num-sessions', options.numSessions.toString(),
    ]

    // Add optional parameters
    if (options.disorders) {
      args.push('--disorders', options.disorders.join(','))
    }
    if (options.maxTurns) {
      args.push('--max-turns', options.maxTurns.toString())
    }
    if (options.temperature) {
      args.push('--temperature', options.temperature.toString())
    }
    if (options.qualityThreshold) {
      args.push('--quality-threshold', options.qualityThreshold.toString())
    }
    if (options.useEncryption) {
      args.push('--use-encryption')
    }

    logger.info('Generating synthetic data via Python', { options })

    return this.executeSecure(command, args, {
      description: 'Generate synthetic therapeutic conversations',
      timeout: this.config.timeout,
    })
  }

  /**
   * Evaluate model performance using Python evaluation scripts
   */
  async evaluateModel(options: ModelEvaluationOptions): Promise<PythonExecutionResult> {
    this.ensureInitialized()

    const command = 'python'
    const args = [
      path.join(this.config.mentalArenaPath, 'scripts', 'evaluate_model.py'),
      '--model-path', options.modelPath,
      '--test-data', options.testDataPath,
      '--output-path', options.outputPath,
    ]

    if (options.metrics) {
      args.push('--metrics', options.metrics.join(','))
    }
    if (options.batchSize) {
      args.push('--batch-size', options.batchSize.toString())
    }

    logger.info('Evaluating model via Python', { options })

    return this.executeSecure(command, args, {
      description: 'Evaluate model performance',
      timeout: this.config.timeout * 2, // Extended timeout for evaluation
    })
  }

  /**
   * Analyze symptoms using Python NLP tools
   */
  async analyzeSymptoms(options: SymptomAnalysisOptions): Promise<PythonExecutionResult> {
    this.ensureInitialized()

    // Create temporary input file for text analysis
    const tempDir = path.join(this.config.mentalArenaPath, 'temp')
    await fs.mkdir(tempDir, { recursive: true })

    const inputFile = path.join(tempDir, `analysis_${crypto.randomUUID()}.json`)
    const outputFile = path.join(tempDir, `result_${crypto.randomUUID()}.json`)

    try {
      // Write input data
      await fs.writeFile(inputFile, JSON.stringify({
        text: options.text,
        analysisType: options.analysisType,
        context: options.context || {},
      }), 'utf-8')

      const command = 'python'
      const args = [
        path.join(this.config.mentalArenaPath, 'scripts', 'analyze_symptoms.py'),
        '--input-file', inputFile,
        '--output-file', outputFile,
        '--analysis-type', options.analysisType,
      ]

      logger.info('Analyzing symptoms via Python', { 
        analysisType: options.analysisType,
        textLength: options.text.length 
      })

      const result = await this.executeSecure(command, args, {
        description: `Symptom analysis: ${options.analysisType}`,
        timeout: 60000, // 1 minute for analysis
      })

      // Read and parse result if successful
      if (result.success && await this.fileExists(outputFile)) {
        const resultData = await fs.readFile(outputFile, 'utf-8')
        result.output = JSON.parse(resultData)
      }

      return result
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles([inputFile, outputFile])
    }
  }

  /**
   * Execute arbitrary Python script with security constraints
   */
  async executeScript(scriptPath: string, args: string[] = []): Promise<PythonExecutionResult> {
    this.ensureInitialized()

    // Validate script path for security
    await this.validateScriptPath(scriptPath)

    const command = this.config.pythonPath
    const fullArgs = [scriptPath, ...args]

    logger.info('Executing Python script', { scriptPath, argsCount: args.length })

    return this.executeSecure(command, fullArgs, {
      description: `Execute script: ${path.basename(scriptPath)}`,
      timeout: this.config.timeout,
    })
  }

  /**
   * Check if the bridge is available and functional
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false
      }

      // Test basic Python execution
      const result = await this.executeSecure('python', ['--version'], {
        description: 'Check Python availability',
        timeout: 5000,
      })

      return result.success
    } catch (error) {
      logger.warn('Python bridge availability check failed', error)
      return false
    }
  }

  /**
   * Get version information for the Python environment and MentalArena
   */
  async getVersion(): Promise<string> {
    this.ensureInitialized()

    try {
      const pythonVersion = await this.executeSecure('python', ['--version'], {
        description: 'Get Python version',
        timeout: 5000,
      })

      const mentalArenaInfo = await this.executeSecure('python', [
        path.join(this.config.mentalArenaPath, 'scripts', 'version_info.py')
      ], {
        description: 'Get MentalArena version',
        timeout: 10000,
      })

      return `Python: ${pythonVersion.output}, MentalArena: ${mentalArenaInfo.output}`
    } catch (error) {
      logger.error('Failed to get version information', error)
      return 'Version information unavailable'
    }
  }

  /**
   * Clean up resources and terminate processes
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up MentalArena Python bridge')

    if (this.pythonProcess && !this.pythonProcess.killed) {
      this.pythonProcess.kill('SIGTERM')
      
      // Wait for graceful shutdown, then force kill if needed
      setTimeout(() => {
        if (this.pythonProcess && !this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL')
        }
      }, 5000)
    }

    // Clear process queue
    this.processQueue.forEach(item => {
      item.reject(new Error('Bridge is being cleaned up'))
    })
    this.processQueue = []

    this.isInitialized = false
    logger.info('MentalArena Python bridge cleanup completed')
  }

  /**
   * Get performance metrics for the bridge
   */
  getPerformanceMetrics(): {
    totalExecutions: number
    averageExecutionTime: number
    successRate: number
    initializationTime: number
  } {
    return this.performanceMetrics.getMetrics()
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('MentalArena Python bridge not initialized. Call initialize() first.')
    }
  }

  private async validateSecurityConstraints(): Promise<void> {
    if (this.config.securityMode === 'strict') {
      // Validate paths are within expected directories
      const mentalArenaPath = path.resolve(this.config.mentalArenaPath)
      const cwd = process.cwd()
      
      if (!mentalArenaPath.startsWith(cwd)) {
        throw new Error('Security violation: MentalArena path must be within project directory')
      }
    }

    // Validate Python path
    if (!await this.fileExists(this.config.pythonPath)) {
      throw new Error(`Python executable not found: ${this.config.pythonPath}`)
    }
  }

  private async ensureMentalArenaRepository(): Promise<void> {
    if (!await this.fileExists(this.config.mentalArenaPath)) {
      logger.info('MentalArena repository not found, cloning...')
      
      const { spawn } = await import('node:child_process')
      const gitProcess = spawn('git', [
        'clone',
        'https://github.com/SondosB/MentalArena.git',
        this.config.mentalArenaPath
      ])

      await new Promise<void>((resolve, reject) => {
        gitProcess.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`Git clone failed with code ${code}`))
          }
        })
        gitProcess.on('error', reject)
      })

      logger.info('MentalArena repository cloned successfully')
    }
  }

  private async setupPythonEnvironment(): Promise<void> {
    const requirementsPath = path.join(this.config.mentalArenaPath, 'requirements.txt')
    
    if (await this.fileExists(requirementsPath)) {
      logger.info('Installing Python dependencies...')
      
      await this.executeSecure('pip', ['install', '-r', requirementsPath], {
        description: 'Install Python dependencies',
        timeout: 300000, // 5 minutes for pip install
      })
    }
  }

  private async validatePythonEnvironment(): Promise<void> {
    // Check required Python packages
    const requiredPackages = ['torch', 'transformers', 'datasets', 'numpy', 'pandas']
    
    for (const pkg of requiredPackages) {
      const result = await this.executeSecure('python', ['-c', `import ${pkg}; print("${pkg} OK")`], {
        description: `Validate package: ${pkg}`,
        timeout: 10000,
      })
      
      if (!result.success) {
        throw new Error(`Required Python package not available: ${pkg}`)
      }
    }
  }

  private async runBasicValidation(): Promise<void> {
    const validationScript = path.join(this.config.mentalArenaPath, 'scripts', 'validate_setup.py')
    
    if (await this.fileExists(validationScript)) {
      const result = await this.executeSecure('python', [validationScript], {
        description: 'Run basic validation',
        timeout: 30000,
      })
      
      if (!result.success) {
        throw new Error('MentalArena setup validation failed')
      }
    }
  }

  private async executeSecure(
    command: string,
    args: string[],
    options: {
      description: string
      timeout: number
    }
  ): Promise<PythonExecutionResult> {
    const startTime = Date.now()
    const executionId = crypto.randomUUID()

    if (this.config.enableLogging) {
      logger.debug('Executing Python command', {
        description: options.description,
        command,
        args: args.length,
        timeout: options.timeout,
      })
    }

    return new Promise((resolve, reject) => {
      // Add to queue for tracking
      this.processQueue.push({
        id: executionId,
        command,
        args,
        resolve,
        reject,
        timestamp: startTime,
      })

      // Set timeout for this specific execution
      const timeoutHandle = setTimeout(() => {
        // Remove from queue if still pending
        const queueIndex = this.processQueue.findIndex(item => item.id === executionId)
        if (queueIndex !== -1) {
          this.processQueue.splice(queueIndex, 1)
          reject(new Error(`Command "${options.description}" timed out after ${options.timeout}ms`))
        }
      }, options.timeout)

      // Override resolve to clear timeout
      const originalResolve = resolve
      const wrappedResolve = (result: PythonExecutionResult) => {
        clearTimeout(timeoutHandle)
        originalResolve(result)
      }

      // Override reject to clear timeout
      const originalReject = reject
      const wrappedReject = (error: Error) => {
        clearTimeout(timeoutHandle)
        originalReject(error)
      }

      // Update the queue item with wrapped functions
      const queueIndex = this.processQueue.findIndex(item => item.id === executionId)
      if (queueIndex !== -1) {
        const queueItem = this.processQueue[queueIndex]
        if (queueItem) {
          queueItem.resolve = wrappedResolve
          queueItem.reject = wrappedReject
        }
      }

      // Process the queue
      this.processExecutionQueue()
    })
  }

  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessing || this.processQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.processQueue.length > 0) {
      const item = this.processQueue.shift()!
      
      try {
        const result = await this.executeCommand(item.command, item.args, item.timestamp)
        this.performanceMetrics.recordExecution(Date.now() - item.timestamp, true)
        item.resolve(result)
      } catch (error) {
        this.performanceMetrics.recordExecution(Date.now() - item.timestamp, false)
        item.reject(error as Error)
      }
    }

    this.isProcessing = false
  }

  private async executeCommand(command: string, args: string[], startTime: number): Promise<PythonExecutionResult> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: this.config.mentalArenaPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      const timeout = setTimeout(() => {
        process.kill('SIGKILL')
        reject(new Error(`Process timed out after ${this.config.timeout}ms`))
      }, this.config.timeout)

      process.on('close', (code) => {
        clearTimeout(timeout)
        
        const executionTime = Date.now() - startTime
        const success = code === 0

        const result: PythonExecutionResult = {
          success,
          output: success ? stdout.trim() : undefined,
          error: success ? undefined : stderr.trim(),
          exitCode: code || undefined,
          executionTime,
          metadata: {
            command: `${command} ${args.join(' ')}`,
            timestamp: new Date(startTime).toISOString(),
            processId: process.pid || 0,
          },
        }

        if (this.config.enableLogging) {
          logger.debug('Python command executed', {
            command: result.metadata.command,
            success,
            executionTime,
            exitCode: code,
          })
        }

        resolve(result)
      })

      process.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  private async validateScriptPath(scriptPath: string): Promise<void> {
    const resolvedPath = path.resolve(scriptPath)
    
    if (this.config.securityMode === 'strict') {
      const allowedPaths = [
        path.resolve(this.config.mentalArenaPath),
        path.resolve(process.cwd()),
      ]
      
      const isAllowed = allowedPaths.some(allowedPath => 
        resolvedPath.startsWith(allowedPath)
      )
      
      if (!isAllowed) {
        throw new Error(`Security violation: Script path not allowed: ${scriptPath}`)
      }
    }

    if (!await this.fileExists(resolvedPath)) {
      throw new Error(`Script not found: ${scriptPath}`)
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    await Promise.allSettled(
      filePaths.map(async (filePath) => {
        try {
          if (await this.fileExists(filePath)) {
            await fs.unlink(filePath)
          }
        } catch (error) {
          logger.warn(`Failed to cleanup temp file: ${filePath}`, error)
        }
      })
    )
  }
}

/**
 * Performance metrics tracker for the Python bridge
 */
class BridgePerformanceMetrics {
  private executions: Array<{ timestamp: number; duration: number; success: boolean }> = []
  private initializationTime: number = 0

  recordExecution(duration: number, success: boolean): void {
    this.executions.push({
      timestamp: Date.now(),
      duration,
      success,
    })

    // Keep only last 1000 executions
    if (this.executions.length > 1000) {
      this.executions = this.executions.slice(-1000)
    }
  }

  recordInitialization(duration: number): void {
    this.initializationTime = duration
  }

  getMetrics(): {
    totalExecutions: number
    averageExecutionTime: number
    successRate: number
    initializationTime: number
  } {
    if (this.executions.length === 0) {
      return {
        totalExecutions: 0,
        averageExecutionTime: 0,
        successRate: 0,
        initializationTime: this.initializationTime,
      }
    }

    const totalDuration = this.executions.reduce((sum, exec) => sum + exec.duration, 0)
    const successfulExecutions = this.executions.filter(exec => exec.success).length

    return {
      totalExecutions: this.executions.length,
      averageExecutionTime: totalDuration / this.executions.length,
      successRate: (successfulExecutions / this.executions.length) * 100,
      initializationTime: this.initializationTime,
    }
  }
}
