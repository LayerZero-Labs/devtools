#!/usr/bin/env node

/**
 * CLI for LayerZero contract documentation generation
 */

import * as fs from 'fs'
import * as path from 'path'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { detectContractPackages, collectContracts, generateAllDocs, generateDocumentationReadme } from './index'

async function main() {
    const args = process.argv.slice(2)
    const specificPackage = args[0]
    const logger = createModuleLogger('docgen')

    logger.info('🚀 LayerZero Contract Documentation Generator')
    logger.info('============================================')
    logger.info('')

    const rootDir = process.cwd()

    // Ensure we're in the root directory
    if (!fs.existsSync(path.join(rootDir, 'package.json')) || !fs.existsSync(path.join(rootDir, 'packages'))) {
        logger.error('❌ Error: This script must be run from the devtools root directory')
        process.exit(1)
    }

    try {
        // Detect packages
        logger.info('🔍 Detecting EVM contract packages...')
        let packages = detectContractPackages(rootDir)

        if (packages.length === 0) {
            logger.error('❌ No contract packages detected')
            process.exit(1)
        }

        // Filter to specific package if requested
        if (specificPackage) {
            const found = packages.find((p) => p.name === specificPackage)
            if (!found) {
                logger.error(`❌ Package '${specificPackage}' not found in detected contract packages`)
                logger.error('Available packages:')
                packages.forEach((p) => logger.error(`  - ${p.name}`))
                process.exit(1)
            }
            packages = [found]
            logger.info(`📦 Processing only: ${specificPackage}`)
        } else {
            logger.info(`📦 Processing all ${packages.length} detected packages`)
        }

        // Set up paths
        const outputDir = path.join(rootDir, 'docgen-out')
        const templatesDir = path.resolve(__dirname, '..', 'templates')

        // Check if templates exist
        if (!fs.existsSync(templatesDir)) {
            logger.error(`❌ Templates directory not found at ${templatesDir}`)
            logger.error('Please ensure documentation templates are set up first.')
            process.exit(1)
        }

        // Generate documentation
        await generateAllDocs(packages, {
            rootDir,
            outputDir,
            templatesDir,
        })

        // Generate inventory and summary
        logger.info('')
        logger.info('📊 Generating contract inventory...')
        const { inventory, packages: allPackages } = collectContracts(rootDir)

        // Write inventory
        fs.writeFileSync(path.join(outputDir, 'contract-inventory.json'), JSON.stringify(inventory, null, 2))

        // Write README
        const readmeContent = generateDocumentationReadme(inventory, allPackages)
        fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent)

        logger.info('')
        logger.info('✅ Documentation generation complete!')
        logger.info('')
        logger.info(`📁 Output location: ${outputDir}`)
        logger.info('')
        logger.info('📦 Packages documented:')
        packages.forEach((p) => logger.info(`  - ${p.name}`))
        logger.info('')
        logger.info('Next steps:')
        logger.info(`1. Review the generated documentation in ${outputDir}`)
        logger.info('2. Copy docgen-out/ to your Docusaurus docs repository')
        logger.info('3. Add the contract reference section to your Docusaurus sidebar')
        logger.info('')
    } catch (error) {
        logger.error('❌ Error:', error)
        process.exit(1)
    }
}

// Run the CLI
main().catch((error) => {
    const logger = createModuleLogger('docgen')
    logger.error('Fatal error:', error)
    process.exit(1)
})
