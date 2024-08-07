import type { Example, PackageManager } from '@/types'
import { isPackageManagerAvailable } from './utilities/installation'

/**
 * To enable example development in a custom repository
 * we open the repository URL field to be taken from the environment
 */
const repository = process.env['LAYERZERO_EXAMPLES_REPOSITORY_URL'] || 'https://github.com/LayerZero-Labs/devtools.git'

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
    {
        id: 'onft721',
        label: 'ONFT721',
        repository,
        directory: 'examples/onft721',
        ref,
    },
    {
        id: 'oft-adapter',
        label: 'OFTAdapter',
        repository,
        directory: 'examples/oft-adapter',
        ref,
    },
    // The Solana OFT example is feature flagged for the time being
    ...(process.env.LZ_ENABLE_EXPERIMENTAL_SOLANA_OFT_EXAMPLE
        ? [
              {
                  id: 'oft-solana',
                  label: 'OFT (Solana)',
                  repository,
                  directory: 'examples/oft-solana',
                  ref,
              },
          ]
        : []),
]

export const PACKAGE_MANAGERS: PackageManager[] = [
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
        id: 'yarn',
        executable: 'yarn',
        args: ['install'],
        label: 'yarn',
    },
    {
        id: 'bun',
        executable: 'bun',
        args: ['install'],
        label: 'bun',
    },
]

export const AVAILABLE_PACKAGE_MANAGERS = PACKAGE_MANAGERS.filter(isPackageManagerAvailable)
