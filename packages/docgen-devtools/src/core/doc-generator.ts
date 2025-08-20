/**
 * Documentation generator for LayerZero contracts
 */

import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { ContractPackage } from './package-detector'
import { extractPackageAbis } from './abi-extractor'

export interface DocGeneratorOptions {
    rootDir: string
    outputDir: string
    templatesDir: string
    package?: string
}

/**
 * Generate Hardhat configuration for a specific package
 */
function generateHardhatConfig(pkg: ContractPackage, options: DocGeneratorOptions): string {
    // Read foundry.toml if it exists to get remappings
    let remappings = ''
    const foundryTomlPath = path.join(pkg.path, 'foundry.toml')
    if (fs.existsSync(foundryTomlPath)) {
        try {
            const foundryConfig = fs.readFileSync(foundryTomlPath, 'utf8')
            const remappingMatch = foundryConfig.match(/remappings\s*=\s*\[([\s\S]*?)\]/m)
            if (remappingMatch && remappingMatch[1]) {
                // Extract remappings and convert to Hardhat format
                const foundryRemappings = remappingMatch[1]
                    .split(',')
                    .map((r) => r.trim())
                    .filter((r) => r && r.includes('='))
                    .map((r) => r.replace(/['"]/g, ''))

                // Convert foundry remappings to object format for Hardhat
                const remappingObj: Record<string, string> = {}
                foundryRemappings.forEach((remap) => {
                    const parts = remap.split('=')
                    if (parts.length === 2 && parts[0] && parts[1]) {
                        const from = parts[0]
                        const to = parts[1]
                        // Handle toolbox-foundry special case and solidity-bytes-utils
                        if (to.includes('toolbox-foundry')) {
                            // Special handling for solidity-bytes-utils
                            if (from.includes('solidity-bytes-utils')) {
                                // Hardhat needs the exact path without trailing slash for imports
                                remappingObj['solidity-bytes-utils/contracts'] =
                                    './node_modules/@layerzerolabs/toolbox-foundry/lib/solidity-bytes-utils'
                            } else {
                                remappingObj[from] = to.replace(
                                    'node_modules/@layerzerolabs/toolbox-foundry/',
                                    './node_modules/@layerzerolabs/toolbox-foundry/'
                                )
                            }
                        } else if (to.startsWith('node_modules/')) {
                            remappingObj[from] = `./${to}`
                        } else {
                            remappingObj[from] = to
                        }
                    }
                })

                remappings = `
    // Auto-imported from foundry.toml
    remappings: ${JSON.stringify(remappingObj, null, 8).split('\n').join('\n    ')},`
            }
        } catch (e) {
            const logger = createModuleLogger('docgen')
            logger.warn('  ⚠️  Could not parse foundry.toml remappings:', e instanceof Error ? e.message : String(e))
        }
    }

    return `
require('@bonadocs/docgen');

module.exports = {
    paths: {
        sources: './contracts',
        cache: 'cache/hardhat-docs',
        artifacts: 'artifacts',
    },${remappings}
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: '0.8.20',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
    },
    docgen: {
        projectName: '${pkg.name} Documentation',
        projectDescription: 'Contract reference for ${pkg.name}',
        outputDir: '${path.relative(pkg.path, path.join(options.outputDir, pkg.name))}',
        pages: 'files',
        templates: '${path.relative(pkg.path, options.templatesDir)}',
        exclude: ['Mock', 'Test', 'Harness', 'mocks'],
        theme: 'markdown',
        collapseOverloads: true,
    },
};
`.trim()
}

/**
 * Run command in directory and return promise
 */
function runCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { cwd, shell: true })
        let stdout = ''
        let stderr = ''

        proc.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        proc.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr })
            } else {
                reject(new Error(`Command failed with code ${code}:\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`))
            }
        })
    })
}

/**
 * Generate documentation for a single package
 */
export async function generatePackageDocs(pkg: ContractPackage, options: DocGeneratorOptions): Promise<void> {
    const logger = createModuleLogger('docgen')
    logger.info(`📦 Processing ${pkg.name}...`)

    if (!fs.existsSync(pkg.path)) {
        throw new Error(`Package ${pkg.name} not found at ${pkg.path}`)
    }

    if (!fs.existsSync(pkg.contractsPath)) {
        logger.warn(`  ⚠️  No contracts directory in ${pkg.name}, skipping...`)
        return
    }

    // Create package output directory
    const packageOutputDir = path.join(options.outputDir, pkg.name)
    fs.mkdirSync(packageOutputDir, { recursive: true })

    // Check if package uses ESM
    const packageJsonPath = path.join(pkg.path, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const isESM = packageJson.type === 'module'

    // Create temporary hardhat config with appropriate extension
    const configFileName = `hardhat-docs.config.${isESM ? 'cjs' : 'js'}`
    const configPath = path.join(pkg.path, configFileName)
    const configContent = generateHardhatConfig(pkg, options)
    fs.writeFileSync(configPath, configContent)

    try {
        // Check if required dependencies are installed
        const localHardhatPath = path.join(pkg.path, 'node_modules', '.bin', 'hardhat')
        const localBonadocsPath = path.join(pkg.path, 'node_modules', '@bonadocs', 'docgen')

        if (!fs.existsSync(localHardhatPath) || !fs.existsSync(localBonadocsPath)) {
            logger.info('  📦 Installing required dependencies...')
            // Install core dependencies including solidity-bytes-utils package
            await runCommand(
                'pnpm',
                [
                    'add',
                    '-D',
                    'hardhat@^2.22.2',
                    '@nomiclabs/hardhat-ethers@^2.2.3',
                    '@bonadocs/docgen@^1.0.0',
                    'ethers@^5.7.2',
                    '@layerzerolabs/toolbox-foundry@^0.1.12',
                    'solidity-bytes-utils@^0.8.0',
                ],
                pkg.path
            )

            // Also ensure the package has all its dependencies installed
            logger.info('  📦 Installing package dependencies...')
            await runCommand('pnpm', ['install'], pkg.path)
        }

        // Generate documentation
        logger.info('  📝 Generating documentation...')
        await runCommand('npx', ['hardhat', 'docgen', '--config', configFileName], pkg.path)

        // Extract ABIs after successful documentation generation
        await extractPackageAbis(pkg, options.outputDir)

        logger.info(`  ✅ Documentation and ABIs generated for ${pkg.name}`)
    } catch (error) {
        logger.error(`  ❌ Failed to generate docs for ${pkg.name}:`, error)
        throw error
    } finally {
        // Clean up
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath)
        }
    }
}

/**
 * Generate documentation for all packages
 */
export async function generateAllDocs(packages: ContractPackage[], options: DocGeneratorOptions): Promise<void> {
    // Create output directory
    fs.mkdirSync(options.outputDir, { recursive: true })

    // Process each package
    for (const pkg of packages) {
        try {
            await generatePackageDocs(pkg, options)
        } catch (error) {
            const logger = createModuleLogger('docgen')
            logger.error(`Failed to process ${pkg.name}:`, error)
            // Continue with other packages
        }
    }
}
