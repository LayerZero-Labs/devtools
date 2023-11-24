import type { Example, PackageManager } from '@/types.js'

/**
 * To enable example development in a custom repository
 * we open the repository URL field to be taken from the environment
 */
const repository = process.env['LAYERZERO_EXAMPLES_REPOSITORY_URL'] || 'git@github.com:LayerZero-Labs/lz-utils'

/**
 * To enable example development in a custom branch,
 * we open up the ref field to be taken from the environment
 *
 * `LAYERZERO_EXAMPLES_REPOSITORY_REF` can then be set to something like `#develop` or `#my-custom-branch`
 * to take the examples from a tag, a branch or a commit hash
 */
const ref = process.env['LAYERZERO_EXAMPLES_REPOSITORY_REF'] || ''

export const EXAMPLES: Example[] = [
    {
        id: 'oft',
        label: 'OFT',
        repository,
        directory: 'examples/oft',
        ref,
    },
    {
        id: 'oapp',
        label: 'OApp',
        repository,
        directory: 'examples/oapp',
        ref,
    },
]

export const PACKAGE_MANAGERS: PackageManager[] = [
    {
        command: 'npm',
        label: 'npm',
    },
    {
        command: 'yarn',
        label: 'yarn',
    },
    {
        command: 'pnpm',
        label: 'pnpm',
    },
    {
        command: 'bun',
        label: 'bun',
    },
]
