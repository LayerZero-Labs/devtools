import type { Example, PackageManager } from '@/types'
import { isPackageManagerAvailable } from './utilities/installation'
import { execSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { importDefault, createModuleLogger } from '@layerzerolabs/io-devtools'
import examples from './examples.json'

// Github URLs can start with either /tree/ or /blob/
// This function extracts the ref name from the URL
// Ex: https://github.com/LayerZero-Labs/devtools/tree/omni-call-example -> omni-call-example
const extractBranchFromUrl = (url: string): string => {
    if (url.includes('/tree/')) {
        const parts = url.split('/tree/')
        if (parts.length >= 2) {
            const ref = parts[1]
            if (ref) {
                return ref
            }
        }
    }

    if (url.includes('/blob/')) {
        const parts = url.split('/blob/')
        if (parts.length >= 2) {
            const ref = parts[1]
            if (ref) {
                return ref
            }
        }
    }

    return url
}

export const getExamples = async (branch?: string, baseRepository?: string, logLevel = 'info'): Promise<Example[]> => {
    const logger = createModuleLogger('create-lz-oapp', logLevel)
    /**
     * To enable example development in a custom repository
     * we open the repository URL field to be taken from the environment
     */
    const repository = baseRepository || 'LayerZero-Labs/devtools'
    logger.verbose(`Using base repository: ${repository}`)

    /**
     * To enable example development in a custom branch,
     * we open up the ref field to be taken from the environment or CLI args
     *
     * to take the examples from a tag, a branch or a commit hash, you can use the branch parameter
     * Ex: npx create-lz-oapp --branch 'your-branch-name'
     * or
     * Ex: EXPERIMENTAL_TAG=1 npx create-lz-oapp --branch 'your-branch-name'
     */
    const ref = branch ? extractBranchFromUrl(branch) : 'main'
    logger.verbose(`Using repository: ${repository} and ref: ${ref}`)

    let oapp_examples: Example[] = []

    // If we're using a specific branch, fetch the config from that branch
    if (ref !== 'main') {
        try {
            // Create a temporary directory
            const tempDir = join(tmpdir(), `lz-oapp-${Date.now()}`)
            logger.info(`Cloning repository: ${repository} and ref: ${ref}`)
            execSync(`git clone --depth 1 --branch ${ref} ${repository} ${tempDir}`)

            const configPath = join(tempDir, 'packages/create-lz-oapp/src/examples.json')

            const configData = (await importDefault(configPath)) as { examples: Example[] }
            oapp_examples = configData.examples.map((example) => ({
                ...example,
                ref: ref, // Override the ref with the one from the CLI args which is branch specific
            }))

            logger.info(`Cleaning up temporary directory: ${tempDir}`)

            execSync(`rm -rf ${tempDir}`)
        } catch (error) {
            logger.warn(`Failed to fetch config from branch ${ref}, falling back to local config:`, error)
        }
    } else {
        oapp_examples = examples.examples.map((example) => ({
            ...example,
            repository: example.repository || repository,
        }))
    }

    logger.debug(JSON.stringify(oapp_examples, null, 2))

    // Filter the examples based on the experimental keys
    // Acceptable flags are 'true', '1', or 'yes'
    const filteredExamples = oapp_examples.filter((example) => {
        if (!example.experimental) {
            return true
        }
        return example.experimental.some((key) => {
            const value = process.env[key]
            if (value === undefined) {
                return false
            }
            return value === 'true' || value === '1' || value === 'yes'
        })
    })

    logger.verbose(`Filtered examples: ${JSON.stringify(filteredExamples, null, 2)}`)

    return filteredExamples

}

const PACKAGE_MANAGERS: PackageManager[] = [
    {
        id: 'pnpm',
        executable: 'pnpm',
        args: ['install'],
        label: 'pnpm (recommended)',
    },
    {
        id: 'npm',
        executable: 'npm',
        args: ['install'],
        label: 'npm',
    },
    {
        id: 'bun',
        executable: 'bun',
        args: ['install'],
        label: 'bun',
    },
]

export const getAvailablePackageManagers = () => PACKAGE_MANAGERS.filter(isPackageManagerAvailable)
