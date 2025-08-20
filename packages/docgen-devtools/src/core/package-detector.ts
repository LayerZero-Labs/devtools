/**
 * Automatically detect EVM contract packages in the monorepo
 */

import * as fs from 'fs'
import * as path from 'path'

export interface ContractPackage {
    name: string
    path: string
    packageName: string
    description: string
    hasFoundry: boolean
    contractsPath: string
}

/**
 * Check if a directory contains Solidity contracts
 */
function hasContracts(packagePath: string): boolean {
    const contractsDir = path.join(packagePath, 'contracts')
    if (!fs.existsSync(contractsDir)) {
        return false
    }

    // Check if there are any .sol files (recursively)
    function hasSolFiles(dir: string): boolean {
        const entries = fs.readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.sol')) {
                // Skip if it's only mocks or tests
                if (!entry.name.includes('Mock') && !entry.name.includes('Test')) {
                    return true
                }
            } else if (entry.isDirectory() && !entry.name.includes('test') && !entry.name.includes('mock')) {
                const subPath = path.join(dir, entry.name)
                if (hasSolFiles(subPath)) {
                    return true
                }
            }
        }
        return false
    }

    return hasSolFiles(contractsDir)
}

/**
 * Check if package is an EVM contract package
 */
function isEVMContractPackage(packagePath: string): boolean {
    // Check if package.json exists
    const packageJsonPath = path.join(packagePath, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
        return false
    }

    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    // Exclude test and devtools packages
    if (
        packageJson.name?.includes('test-devtools') ||
        packageJson.name?.includes('toolbox') ||
        packageJson.description?.toLowerCase().includes('test') ||
        packageJson.description?.toLowerCase().includes('helper')
    ) {
        return false
    }

    // Check indicators of EVM contract package
    const indicators = {
        hasContracts: hasContracts(packagePath),
        hasFoundryConfig: fs.existsSync(path.join(packagePath, 'foundry.toml')),
        hasEVMInName: packageJson.name?.includes('evm') || false,
        hasSolidityDeps: !!(
            packageJson.devDependencies?.['@openzeppelin/contracts'] ||
            packageJson.dependencies?.['@openzeppelin/contracts'] ||
            packageJson.peerDependencies?.['@openzeppelin/contracts']
        ),
        hasLayerZeroContracts: !!(
            packageJson.devDependencies?.['@layerzerolabs/lz-evm-protocol-v2'] ||
            packageJson.dependencies?.['@layerzerolabs/lz-evm-protocol-v2'] ||
            packageJson.peerDependencies?.['@layerzerolabs/lz-evm-protocol-v2'] ||
            packageJson.devDependencies?.['@layerzerolabs/oapp-evm'] ||
            packageJson.dependencies?.['@layerzerolabs/oapp-evm'] ||
            packageJson.peerDependencies?.['@layerzerolabs/oapp-evm']
        ),
        hasContractArtifacts: fs.existsSync(path.join(packagePath, 'artifacts')),
    }

    // Package must have contracts directory with .sol files
    if (!indicators.hasContracts) {
        return false
    }

    // Additional checks - at least one of these should be true
    const additionalChecks =
        indicators.hasFoundryConfig ||
        indicators.hasEVMInName ||
        indicators.hasSolidityDeps ||
        indicators.hasLayerZeroContracts ||
        indicators.hasContractArtifacts

    return additionalChecks
}

/**
 * Detect all EVM contract packages
 */
export function detectContractPackages(rootDir: string = process.cwd()): ContractPackage[] {
    const packagesDir = path.join(rootDir, 'packages')

    if (!fs.existsSync(packagesDir)) {
        throw new Error(`packages/ directory not found at ${packagesDir}`)
    }

    const packages: ContractPackage[] = []
    const entries = fs.readdirSync(packagesDir, { withFileTypes: true })

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const packagePath = path.join(packagesDir, entry.name)

            if (isEVMContractPackage(packagePath)) {
                const packageJsonPath = path.join(packagePath, 'package.json')
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

                packages.push({
                    name: entry.name,
                    path: packagePath,
                    packageName: packageJson.name,
                    description: packageJson.description || '',
                    hasFoundry: fs.existsSync(path.join(packagePath, 'foundry.toml')),
                    contractsPath: path.join(packagePath, 'contracts'),
                })
            }
        }
    }

    return packages
}
