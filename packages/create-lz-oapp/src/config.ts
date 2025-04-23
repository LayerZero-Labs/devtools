import type { Example, PackageManager } from '@/types'
import { isPackageManagerAvailable } from './utilities/installation'

export const getExamples = (): Example[] => {
    /**
     * To enable example development in a custom repository
     * we open the repository URL field to be taken from the environment
     */
    const repository = process.env.LAYERZERO_EXAMPLES_REPOSITORY_URL || 'https://github.com/LayerZero-Labs/devtools.git'

    /**
     * To enable example development in a custom branch,
     * we open up the ref field to be taken from the environment
     *
     * `LAYERZERO_EXAMPLES_REPOSITORY_REF` can then be set to something like `#develop` or `#my-custom-branch`
     * to take the examples from a tag, a branch or a commit hash
     */
    const ref = process.env.LAYERZERO_EXAMPLES_REPOSITORY_REF || ''

    return [
        {
            id: 'oapp',
            label: 'OApp',
            repository,
            directory: 'examples/oapp',
            ref,
        },
        {
            id: 'oft',
            label: 'OFT',
            repository,
            directory: 'examples/oft',
            ref,
        },
        {
            id: 'oft-adapter',
            label: 'OFTAdapter',
            repository,
            directory: 'examples/oft-adapter',
            ref,
        },
        {
            id: 'onft721',
            label: 'ONFT721',
            repository,
            directory: 'examples/onft721',
            ref,
        },
        // ZK-Solc examples are feature flagged for the time being
        ...(process.env.LZ_ENABLE_MIGRATION_EXAMPLE
            ? [
                  {
                      id: 'lzapp-migration',
                      label: 'EndpointV1 Migration',
                      repository,
                      directory: 'examples/lzapp-migration',
                      ref,
                  },
              ]
            : []),
        // ZK-Solc examples are feature flagged for the time being
        ...(process.env.LZ_ENABLE_ZKSOLC_EXAMPLE
            ? [{ id: 'onft721-zksync', label: 'ONFT721 zksolc', repository, directory: 'examples/onft721-zksync', ref }]
            : []),
        // Upgradeable contract examples are feature flagged for the time being
        ...(process.env.LZ_ENABLE_UPGRADEABLE_EXAMPLE
            ? [
                  {
                      id: 'oft-upgradeable',
                      label: 'UpgradeableOFT',
                      repository,
                      directory: 'examples/oft-upgradeable',
                      ref,
                  },
              ]
            : []),
        // Native OFT Adapter example is feature flagged for the time being
        ...(process.env.LZ_ENABLE_NATIVE_EXAMPLE
            ? [
                  {
                      id: 'native-oft-adapter',
                      label: 'NativeOFTAdapter',
                      repository,
                      directory: 'examples/native-oft-adapter',
                      ref,
                  },
              ]
            : []),
        // Mint Burn OFT Adapter example is feature flagged for the time being
        ...(process.env.LZ_ENABLE_MINTBURN_EXAMPLE
            ? [
                  {
                      id: 'mint-burn-oft-adapter',
                      label: 'MintBurnOFTAdapter',
                      repository,
                      directory: 'examples/mint-burn-oft-adapter',
                      ref,
                  },
              ]
            : []),
        // OApp Read examples are feature flagged for the time being
        ...(process.env.LZ_ENABLE_READ_EXAMPLE
            ? [
                  { id: 'oapp-read', label: 'OAppRead', repository, directory: 'examples/oapp-read', ref },
                  {
                      id: 'uniswap-read',
                      label: 'UniswapV3 Quote',
                      repository,
                      directory: 'examples/uniswap-read',
                      ref,
                  },
              ]
            : []),
        // The Solana OFT example is feature flagged for the time being
        ...(process.env.LZ_ENABLE_SOLANA_OFT_EXAMPLE
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
        ...(process.env.LZ_ENABLE_EXPERIMENTAL_INITIA_EXAMPLES
            ? [
                  {
                      id: 'oft-initia',
                      label: 'OFT (Initia)',
                      repository,
                      directory: 'examples/oft-initia',
                      ref,
                  },
                  {
                      id: 'oft-adapter-initia',
                      label: 'OFT Adapter (Initia)',
                      repository,
                      directory: 'examples/oft-adapter-initia',
                      ref,
                  },
              ]
            : []),
        // Move OFT examples are feature flagged for the time being
        ...(process.env.LZ_ENABLE_EXPERIMENTAL_MOVE_VM_EXAMPLES
            ? [
                  {
                      id: 'oft-aptos-move',
                      label: 'OFT (Aptos Move)',
                      repository,
                      directory: 'examples/oft-aptos-move',
                      ref,
                  },
                  {
                      id: 'oft-adapter-aptos-move',
                      label: 'OFT Adapter (Aptos Move)',
                      repository,
                      directory: 'examples/oft-adapter-aptos-move',
                      ref,
                  },
                  {
                      id: 'oapp-aptos-move',
                      label: 'OApp (Aptos Move)',
                      repository,
                      directory: 'examples/oapp-aptos-move',
                      ref,
                  },
              ]
            : []),
        ...(process.env.LZ_ENABLE_EXPERIMENTAL_HYPERLIQUID_EXAMPLE
            ? [
                  {
                      id: 'oft-hyperliquid',
                      label: 'OFT + Composer (Hyperliquid)',
                      repository,
                      directory: 'examples/oft-hyperliquid',
                      ref,
                  },
              ]
            : []),
    ]
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
