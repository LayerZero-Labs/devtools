import '@/type-extensions'

import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { TASK_LZ_VALIDATE_RPCS } from '@/constants'
import { createLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { assertDefinedNetworks } from '@/internal/assertions'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { getEidsByNetworkName } from '@/runtime'
import { BaseProvider, JsonRpcProvider, WebSocketProvider } from '@ethersproject/providers'
import { types as cliTypes } from '@/cli'
import { EndpointId, Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'
import { pickNetworkConfigs } from '@/simulation'

const RPC_URL_KEY = 'url'

const HTTP_URL = 'http://'
const HTTPS_URL = 'https://'

const WS_URL = 'ws://'
const WSS_URL = 'wss://'

const TIMEOUT = 5000 // 5 seconds
const RETRIES = 5
const RETRY_DELAY = 500 // 500ms

const logger = createLogger()

interface TaskArguments {
    timeout: number
    networks?: string[]
    stage?: Stage
    retries?: number
    retryDelay?: number
    continue?: boolean
}

type RPCFailure = {
    networkName: string
    errorMessage: string
}

const getProvider = async (rpcUrl: string, networkName: string): Promise<BaseProvider> => {
    let provider
    if (rpcUrl.startsWith(HTTP_URL) || rpcUrl.startsWith(HTTPS_URL)) {
        provider = new JsonRpcProvider(rpcUrl)
    } else if (rpcUrl.startsWith(WS_URL) || rpcUrl.startsWith(WSS_URL)) {
        provider = new WebSocketProvider(rpcUrl)
    } else {
        logger.error(`Unsupported RPC protocol in network: ${networkName}`)
    }

    return provider
}

const checkRpcHealth = async (
    provider: BaseProvider,
    networkName: string,
    timeout: number,
    retries: number = RETRIES,
    retryDelay: number = RETRY_DELAY
): Promise<{ success: boolean; message: string }> => {
    let errorMessage = ''
    for (let attempt = 1; attempt <= retries; ++attempt) {
        try {
            const blockNumber = await Promise.race([
                provider.getBlockNumber(),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
            ])
            logger.info(`Network ${networkName}'s RPC is healthy. Latest block number: ${blockNumber}`)
            return { success: true, message: '' }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : String(error)
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay))
            }
        }
    }
    logger.error(`Network ${networkName} failed health check after ${retries} attempts.`)
    return { success: false, message: errorMessage }
}

const action: ActionType<TaskArguments> = async (taskArgs, hre) => {
    printLogo()

    // --stage cannot be used in conjunction with --networks
    if (taskArgs.networks != null && taskArgs.stage != null) {
        logger.error(
            `--stage ${taskArgs.stage} cannot be used in conjunction with --networks ${taskArgs.networks.join(',')}`
        )

        process.exit(1)
    }

    // And we create a filtering predicate for the stage argument
    const isOnStage =
        taskArgs.stage == null ? () => true : (eid: EndpointId) => endpointIdToStage(eid) === taskArgs.stage

    // Let's grab the networks that will be validated
    const networks = taskArgs.networks
        ? // Here we need to check whether the networks have been defined in hardhat config
          pickNetworkConfigs(assertDefinedNetworks(taskArgs.networks))(hre.config.networks)
        : taskArgs.stage //  But here we are taking them from hardhat config so no assertion is necessary
          ? pickNetworkConfigs(
                Object.entries(getEidsByNetworkName()).flatMap(([networkName, eid]) =>
                    eid != null && isOnStage(eid) ? [networkName] : []
                )
            )(hre.config.networks)
          : hre.config.networks

    const eidByNetworkName = getEidsByNetworkName()

    logger.info(
        `========== Validating RPC URLs for networks: ${taskArgs.networks?.join(', ') || Object.keys(networks).join(', ')}`
    )

    const networksWithInvalidRPCs: RPCFailure[] = []

    await Promise.all(
        Object.entries(networks).map(async ([networkName, networkConfig]) => {
            const eid = eidByNetworkName[networkName]
            if (!eid) {
                logger.info(`No eid found for network ${networkName}, skipping`)
                return
            }
            const rpcUrl = networkConfig?.[RPC_URL_KEY]
            if (!rpcUrl) {
                logger.error(`No RPC URL found for network ${networkName}, skipping`)
                networksWithInvalidRPCs.push({ networkName, errorMessage: 'No RPC URL found' })
                return
            }

            const provider: BaseProvider = await getProvider(rpcUrl, networkName)
            if (!provider) {
                logger.error(`Error fetching provider for network: ${networkName}`)
                networksWithInvalidRPCs.push({ networkName, errorMessage: 'Error fetching provider' })
                return
            }

            const { success, message } = await checkRpcHealth(
                provider,
                networkName,
                taskArgs.timeout,
                taskArgs.retries,
                taskArgs.retryDelay
            )
            if (!success) {
                networksWithInvalidRPCs.push({ networkName, errorMessage: message })
            }
        })
    )

    if (networksWithInvalidRPCs.length !== 0) {
        logger.error(
            `\n${printBoolean(false)} ========== RPC URL validation failed for ${networksWithInvalidRPCs.length} network(s):\n\n${networksWithInvalidRPCs
                .map((failure) => `${failure.networkName}: ${failure.errorMessage}`)
                .join('\n')} `
        )

        if (taskArgs.continue) {
            logger.warn('Continuing execution despite invalid RPC URLs due to --continue flag')
        } else {
            logger.error('Invalid RPCs: you can set --continue flag to continue anyway')
            process.exit(1)
        }
    } else {
        logger.info(`${printBoolean(true)} ========== All RPC URLs are valid!`)
    }
}
task(
    TASK_LZ_VALIDATE_RPCS,
    'Validate RPC URLs in hardhat.config.ts. RPCs are only considered valid if they use the https or wss protocol and respond within the specified timeout.',
    action
)
    .addParam(
        'timeout',
        `Maximum amount of time (in milliseconds) that the RPC URLs have to respond. If unspecified, default timeout of ${TIMEOUT}ms will be used.`,
        TIMEOUT,
        types.int,
        true
    )
    .addParam(
        'retries',
        `Maximum amount of attempts to validate the RPC URLs. If unspecified, default retries of ${RETRIES} will be used.`,
        RETRIES,
        types.int,
        true
    )
    .addParam(
        'retryDelay',
        `Delay between attempts (in milliseconds). If unspecified, default delay of ${RETRY_DELAY}ms will be used.`,
        RETRY_DELAY,
        types.int,
        true
    )
    .addFlag('continue', 'Continue even if some RPCs are invalid')
    .addParam('networks', 'Comma-separated list of networks to simulate', undefined, cliTypes.csv, true)
    .addParam('stage', 'Chain stage. One of: mainnet, testnet, sandbox', undefined, cliTypes.stage, true)
