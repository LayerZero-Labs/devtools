import { Command, InvalidOptionArgumentError, Option } from 'commander'
import { verifyTarget, verifyNonTarget } from './hardhat-deploy/verify'
import { COLORS } from './common/logger'
import { type LogLevel, createLogger } from '@layerzerolabs/io-devtools'
import { type VerifyHardhatNonTargetConfig, type VerifyHardhatTargetConfig } from './hardhat-deploy/types'
import { version } from '../package.json'

interface CommonArgs {
    apiKey?: string
    apiUrl?: string
    chainId?: number
    deployments?: string
    dryRun?: boolean
    logLevel: LogLevel
    network: string
}

interface NonTargetArgs extends CommonArgs {
    address: string
    arguments?: string[] | string
    deployment: string
    name: string
}

const logLevelOption = new Option('-l,--log-level <level>', 'Log level')
    .choices(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info')

const deploymentsPathOption = new Option('-d,--deployments <path>', 'Path to the deployments folder')

const dryRunOption = new Option(
    '--dry-run',
    'Do not verify anything, just output the verifications that would be performed'
)

const networkOption = new Option('-n,--network <network name>', 'Network to verify').makeOptionMandatory()

const apiUrlOption = new Option('-u,--api-url <url>', 'Scan API URL (fully qualified, with protocol and path)')

const apiKeyOption = new Option('-k,--api-key <key>', 'Scan API Key')

const chainIdOption = new Option(
    '--chain-id <id>',
    'Chain ID for Etherscan API v2 (automatically set for well-known networks)'
).argParser((value: string) => parseInt(value, 10))

const verifyNonTargetCommand = new Command('non-target')
    .description(
        'Verifies a contract that does not have its own deployment file, i.e. has not been a target of a deployment'
    )
    .addOption(logLevelOption)
    .addOption(dryRunOption)
    .addOption(deploymentsPathOption)
    .addOption(networkOption)
    .addOption(apiUrlOption)
    .addOption(apiKeyOption)
    .addOption(chainIdOption)
    .requiredOption('--address <address>', 'Contract address to verify')
    .requiredOption('--name <contract name>', 'Fully qualified contract name to verify, e.g. contracts/MyToken.sol')
    .requiredOption('--deployment <deployment file name>', 'Deployment file name, e.g. MyOtherToken.json')
    .option(
        '--arguments <constructor arguments>',
        'JSON encoded array of constructor arguments, e.g. [1234, "0x0"]',
        (value: string) => {
            if (value.startsWith('0x')) {
                // If encoded parameters were passed in, we remove the leading 0x
                return value.slice(2)
            }

            try {
                const decoded = JSON.parse(value)
                if (!Array.isArray(decoded)) {
                    throw new Error(`Constructor arguments must be an array, got ${decoded}`)
                }

                return decoded
            } catch (error) {
                throw new InvalidOptionArgumentError(`Malformed constructor arguments specified: ${error}`)
            }
        }
    )
    .action(async (args: NonTargetArgs) => {
        const logger = createLogger(args.logLevel)
        const config: VerifyHardhatNonTargetConfig = {
            dryRun: args.dryRun,
            paths: {
                deployments: args.deployments,
            },
            networks: {
                [args.network]: {
                    apiUrl: args.apiUrl,
                    apiKey: args.apiKey,
                    chainId: args.chainId,
                },
            },
            contracts: [
                {
                    network: args.network,
                    address: args.address,
                    contractName: args.name,
                    deployment: args.deployment,
                    constructorArguments: args.arguments,
                },
            ],
        }

        try {
            await verifyNonTarget(config, logger)
        } catch (error) {
            logger.error(COLORS.error`The verification script exited with an error: ${error}`)

            process.exit(1)
        }
    })

interface TargetArgs extends CommonArgs {
    contracts?: string[]
}

const verifyTargetCommand = new Command('target')
    .description('Verifies contracts that have been a part of a deployment, i.e. have their own deployment files')
    .addOption(logLevelOption)
    .addOption(dryRunOption)
    .addOption(deploymentsPathOption)
    .addOption(networkOption)
    .addOption(apiUrlOption)
    .addOption(apiKeyOption)
    .addOption(chainIdOption)
    .option(
        '-c,--contracts <contract names>',
        'Comma-separated list of case-sensitive contract names to verify',
        (value: string | null | undefined) => {
            return value?.trim() ? value.split(',').map((c: string) => c.trim()) : undefined
        }
    )
    .action(async (args: TargetArgs) => {
        const logger = createLogger(args.logLevel)
        const config: VerifyHardhatTargetConfig = {
            dryRun: args.dryRun,
            paths: {
                deployments: args.deployments,
            },
            networks: {
                [args.network]: {
                    apiUrl: args.apiUrl,
                    apiKey: args.apiKey,
                    chainId: args.chainId,
                },
            },
            filter: args.contracts,
        }

        try {
            await verifyTarget(config, logger)
        } catch (error) {
            logger.error(COLORS.error`The verification script exited with an error: ${error}`)

            process.exit(1)
        }
    })

new Command('@layerzerolabs/verify-contract')
    .version(version)
    .description('Verify a set of contracts based on hardhat-deploy outputs')
    .addCommand(verifyNonTargetCommand)
    .addCommand(verifyTargetCommand, { isDefault: true })
    .parseAsync()
