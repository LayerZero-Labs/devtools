/**
 * Contract collector for documentation generation
 */

import * as fs from 'fs'
import * as path from 'path'
import { detectContractPackages, ContractPackage } from './package-detector'

export interface ContractInfo {
    package: string
    packageName: string
    path: string
    fullPath: string
}

export interface ContractInventory {
    contracts: Record<string, ContractInfo>
    interfaces: Record<string, ContractInfo>
    libraries: Record<string, ContractInfo>
}

/**
 * Scan a directory for Solidity contracts and categorize them
 */
function scanContractsDirectory(
    contractsPath: string,
    pkg: ContractPackage,
    inventory: ContractInventory,
    rootDir: string
): void {
    const scanDir = (dir: string, baseDir: string = ''): void => {
        const files = fs.readdirSync(dir)

        files.forEach((file) => {
            const fullPath = path.join(dir, file)
            const stat = fs.statSync(fullPath)

            if (stat.isDirectory() && !file.includes('test') && !file.includes('mock')) {
                scanDir(fullPath, path.join(baseDir, file))
            } else if (file.endsWith('.sol') && !file.includes('Mock') && !file.includes('Test')) {
                const relativePath = path.join(baseDir, file)
                const content = fs.readFileSync(fullPath, 'utf8')

                // Categorize the contract
                let category: keyof ContractInventory = 'contracts'
                if (file.startsWith('I') && content.includes('interface')) {
                    category = 'interfaces'
                } else if (content.includes('library ')) {
                    category = 'libraries'
                }

                const contractName = file.replace('.sol', '')
                inventory[category][contractName] = {
                    package: pkg.name,
                    packageName: pkg.packageName,
                    path: relativePath,
                    fullPath: path.relative(rootDir, fullPath),
                }
            }
        })
    }

    scanDir(contractsPath)
}

/**
 * Collect all contracts from detected packages
 */
export function collectContracts(rootDir: string = process.cwd()): {
    inventory: ContractInventory
    packages: ContractPackage[]
} {
    const contractPackages = detectContractPackages(rootDir)

    if (contractPackages.length === 0) {
        throw new Error('No EVM contract packages detected')
    }

    const inventory: ContractInventory = {
        contracts: {},
        interfaces: {},
        libraries: {},
    }

    // Collect all contract files from detected packages
    contractPackages.forEach((pkg) => {
        if (fs.existsSync(pkg.contractsPath)) {
            scanContractsDirectory(pkg.contractsPath, pkg, inventory, rootDir)
        }
    })

    return { inventory, packages: contractPackages }
}

/**
 * Generate documentation README content
 */
export function generateDocumentationReadme(inventory: ContractInventory, packages: ContractPackage[]): string {
    const docReadme = `# LayerZero Protocol Contracts

This documentation provides a comprehensive reference for all LayerZero protocol contracts.

## Detected Packages

The following EVM contract packages were automatically detected and documented:

${packages.map((pkg) => `- **${pkg.name}** - ${pkg.description}`).join('\n')}

## Contract Categories

### Core Interfaces
${
    Object.entries(inventory.interfaces)
        .filter(([name]) => !name.includes('OApp') && !name.includes('OFT') && !name.includes('ONFT'))
        .map(([name, info]) => `- **${name}** (${info.package})`)
        .join('\n') || '_None found_'
}

### OApp Standard
${
    Object.entries(inventory.interfaces)
        .filter(([name]) => name.includes('OApp'))
        .map(([name, info]) => `- **${name}** (${info.package})`)
        .join('\n') || '_None found_'
}

### Token Standards (OFT/ONFT)
${
    Object.entries(inventory.interfaces)
        .filter(([name]) => name.includes('OFT') || name.includes('ONFT'))
        .map(([name, info]) => `- **${name}** (${info.package})`)
        .join('\n') || '_None found_'
}

### Implementations
${
    Object.entries(inventory.contracts)
        .map(([name, info]) => `- **${name}** (${info.package})`)
        .join('\n') || '_None found_'
}

### Libraries
${
    Object.entries(inventory.libraries)
        .map(([name, info]) => `- **${name}** (${info.package})`)
        .join('\n') || '_None found_'
}

## Package Statistics

${packages
    .map((pkg) => {
        const contracts = Object.values(inventory.contracts).filter((c) => c.package === pkg.name).length
        const interfaces = Object.values(inventory.interfaces).filter((c) => c.package === pkg.name).length
        const libraries = Object.values(inventory.libraries).filter((c) => c.package === pkg.name).length
        const total = contracts + interfaces + libraries

        return `- **${pkg.name}**: ${total} total (${interfaces} interfaces, ${contracts} contracts, ${libraries} libraries)`
    })
    .join('\n')}

---

*Generated on ${new Date().toISOString()}*
`

    return docReadme
}
