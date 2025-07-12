#!/usr/bin/env node

/**
 * Unified Deployment Script
 * 
 * Usage:
 *   node scripts/deploy-platform.js aws
 *   node scripts/deploy-platform.js vercel
 *   node scripts/deploy-platform.js vercel --preview
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import process from 'process'

const [,, platform, flag] = process.argv

function log(message) {
  console.log(`🚀 ${message}`)
}

function error(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function executeCommand(command, description) {
  log(description)
  try {
    execSync(command, { stdio: 'inherit' })
    log(`✅ ${description} completed`)
  } catch (err) {
    error(`Failed to ${description.toLowerCase()}: ${err.message}`)
  }
}

function validatePrerequisites(platform) {
  if (platform === 'aws') {
    // Check if azure remote exists
    try {
      execSync('git remote get-url azure', { stdio: 'pipe' })
      log('✅ Azure git remote found')
    } catch {
      error('Azure git remote not found. Please add it with: git remote add azure <your-azure-repo-url>')
    }
  } else if (platform === 'vercel') {
    // Check if vercel CLI is available
    try {
      execSync('which vercel', { stdio: 'pipe' })
      log('✅ Vercel CLI found')
    } catch {
      error('Vercel CLI not found. Please install it with: npm i -g vercel')
    }
  }

  // Check if pnpm is available
  try {
    execSync('which pnpm', { stdio: 'pipe' })
    log('✅ pnpm found')
  } catch {
    error('pnpm not found. This project requires pnpm for package management.')
  }

  // Check if required config files exist
  const configFile = platform === 'aws' ? 'astro.config.aws.mjs' : 'astro.config.vercel.mjs'
  if (!existsSync(configFile)) {
    error(`Configuration file ${configFile} not found`)
  }
  log(`✅ Configuration file ${configFile} found`)
}

function deployAWS() {
  log('Starting AWS deployment...')
  
  // Build for AWS
  executeCommand('pnpm run build:aws', 'Building for AWS')
  
  // Check git status
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' })
    if (status.trim()) {
      log('⚠️  Uncommitted changes detected. Committing before deployment...')
      executeCommand('git add .', 'Staging changes')
      executeCommand('git commit -m "Deploy to AWS - $(date)"', 'Committing changes')
    }
  } catch {
    log('ℹ️  No changes to commit')
  }
  
  // Deploy to Azure remote
  executeCommand('git push azure $(git branch --show-current)', 'Pushing to Azure DevOps')
  
  log('🎉 AWS deployment initiated! Check Azure DevOps pipeline for progress.')
}

function deployVercel(isPreview = false) {
  const deployType = isPreview ? 'preview' : 'production'
  log(`Starting Vercel ${deployType} deployment...`)
  
  // Build for Vercel
  executeCommand('pnpm run build:vercel', 'Building for Vercel')
  
  // Deploy to Vercel
  const vercelCommand = isPreview ? 'vercel' : 'vercel --prod'
  executeCommand(vercelCommand, `Deploying to Vercel (${deployType})`)
  
  log(`🎉 Vercel ${deployType} deployment completed!`)
}

function main() {
  if (!platform || !['aws', 'vercel'].includes(platform)) {
    error('Please specify a platform: aws or vercel')
  }

  log(`Preparing to deploy to ${platform.toUpperCase()}...`)
  
  // Validate prerequisites
  validatePrerequisites(platform)
  
  // Install dependencies if needed
  if (!existsSync('node_modules')) {
    executeCommand('pnpm install', 'Installing dependencies')
  }
  
  // Deploy based on platform
  if (platform === 'aws') {
    deployAWS()
  } else if (platform === 'vercel') {
    const isPreview = flag === '--preview'
    deployVercel(isPreview)
  }
}

main() 