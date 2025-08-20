/**
 * ABI extractor for LayerZero contracts
 */

import * as fs from 'fs'
import * as path from 'path'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { ContractPackage } from './package-detector'

const logger = createModuleLogger('docgen/abi')

export interface AbiInfo {
    contractName: string
    abi: any
    bytecode?: string
    sourcePath: string
}

/**
 * Extract ABI from a Foundry artifact
 */
function extractAbiFromArtifact(artifactPath: string): AbiInfo | null {
    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

        // Skip if no ABI
        if (!artifact.abi || artifact.abi.length === 0) {
            return null
        }

        // Get contract name from directory name
        const contractName = path.basename(path.dirname(artifactPath))

        return {
            contractName,
            abi: artifact.abi,
            bytecode: artifact.bytecode?.object,
            sourcePath: artifactPath,
        }
    } catch (error) {
        logger.warn(`Failed to extract ABI from ${artifactPath}:`, error)
        return null
    }
}

/**
 * Extract ABIs for a package
 */
export async function extractPackageAbis(pkg: ContractPackage, outputDir: string): Promise<void> {
    logger.info(`  📋 Extracting ABIs...`)

    const artifactsDir = path.join(pkg.path, 'artifacts')
    const abisOutputDir = path.join(outputDir, pkg.name, 'abis')

    if (!fs.existsSync(artifactsDir)) {
        logger.warn(`  ⚠️  No artifacts directory found for ${pkg.name}`)
        return
    }

    // Create ABIs output directory
    fs.mkdirSync(abisOutputDir, { recursive: true })

    // Categories for organization
    const interfaces: AbiInfo[] = []
    const implementations: AbiInfo[] = []
    const libraries: AbiInfo[] = []

    // Find all artifact JSON files recursively
    const findArtifacts = (dir: string): string[] => {
        const files: string[] = []
        const entries = fs.readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)

            if (entry.isDirectory()) {
                // Skip build-info directories
                if (entry.name === 'build-info') {
                    continue
                }

                // Recursively search subdirectories
                files.push(...findArtifacts(fullPath))
            } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.dbg.json')) {
                // Add JSON files (but skip debug files)
                files.push(fullPath)
            }
        }

        return files
    }

    const artifactFiles = findArtifacts(artifactsDir)
    logger.info(`  📦 Found ${artifactFiles.length} artifact files`)

    // Process each artifact
    for (const artifactPath of artifactFiles) {
        const abiInfo = extractAbiFromArtifact(artifactPath)
        if (!abiInfo) {
            continue
        }

        // Categorize by contract name
        if (abiInfo.contractName.startsWith('I')) {
            interfaces.push(abiInfo)
        } else if (
            abiInfo.contractName.includes('Library') ||
            abiInfo.contractName.includes('Codec') ||
            abiInfo.contractName.includes('Builder')
        ) {
            libraries.push(abiInfo)
        } else {
            implementations.push(abiInfo)
        }

        // Save individual ABI file
        const abiFilePath = path.join(abisOutputDir, `${abiInfo.contractName}.json`)
        fs.writeFileSync(abiFilePath, JSON.stringify(abiInfo.abi, null, 2))
    }

    // Create organized subdirectories
    if (interfaces.length > 0) {
        const interfacesDir = path.join(abisOutputDir, 'interfaces')
        fs.mkdirSync(interfacesDir, { recursive: true })
        interfaces.forEach((info) => {
            fs.writeFileSync(path.join(interfacesDir, `${info.contractName}.json`), JSON.stringify(info.abi, null, 2))
        })
    }

    if (implementations.length > 0) {
        const implDir = path.join(abisOutputDir, 'implementations')
        fs.mkdirSync(implDir, { recursive: true })
        implementations.forEach((info) => {
            fs.writeFileSync(path.join(implDir, `${info.contractName}.json`), JSON.stringify(info.abi, null, 2))
        })
    }

    if (libraries.length > 0) {
        const libDir = path.join(abisOutputDir, 'libraries')
        fs.mkdirSync(libDir, { recursive: true })
        libraries.forEach((info) => {
            fs.writeFileSync(path.join(libDir, `${info.contractName}.json`), JSON.stringify(info.abi, null, 2))
        })
    }

    // Create ABI index
    const abiIndex = {
        package: pkg.name,
        totalContracts: interfaces.length + implementations.length + libraries.length,
        interfaces: interfaces.map((i) => i.contractName),
        implementations: implementations.map((i) => i.contractName),
        libraries: libraries.map((i) => i.contractName),
        generated: new Date().toISOString(),
    }

    fs.writeFileSync(path.join(abisOutputDir, 'index.json'), JSON.stringify(abiIndex, null, 2))

    // Create README for ABIs
    const abiReadme = `# ${pkg.name} ABIs

This directory contains the Application Binary Interfaces (ABIs) for all contracts in the ${pkg.name} package.

## Structure

\`\`\`
abis/
├── interfaces/          # Contract interfaces
├── implementations/     # Contract implementations  
├── libraries/          # Utility libraries
└── index.json          # ABI index file
\`\`\`

## Contract List

### Interfaces (${interfaces.length})
${interfaces.map((i) => `- ${i.contractName}`).join('\n') || '- None'}

### Implementations (${implementations.length})
${implementations.map((i) => `- ${i.contractName}`).join('\n') || '- None'}

### Libraries (${libraries.length})
${libraries.map((i) => `- ${i.contractName}`).join('\n') || '- None'}

## Usage

### JavaScript/TypeScript
\`\`\`javascript
import OftAbi from './OFT.json';
const contract = new ethers.Contract(address, OftAbi, signer);
\`\`\`

### Direct Import
\`\`\`javascript
const { abi } = require('./OFT.json');
\`\`\`
`

    fs.writeFileSync(path.join(abisOutputDir, 'README.md'), abiReadme)

    logger.info(`  ✅ Extracted ${interfaces.length + implementations.length + libraries.length} ABIs`)
}
