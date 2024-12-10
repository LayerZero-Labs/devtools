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

const TIMEOUT = 1000 // 1 second

const logger = createLogger()

interface TaskArguments {
    timeout: number
    networks?: string[]
    stage?: Stage
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

    const eidByNetworkName = getEidsByNetworkName(hre)

    logger.info(
        `========== Validating RPC URLs for networks: ${taskArgs.networks?.join(', ') || Object.keys(eidByNetworkName).join(', ')}`
    )

    const networksWithInvalidRPCs: string[] = []

    await Promise.all(
        Object.entries(eidByNetworkName).map(async ([networkName, eid]) => {
            if (!eid) {
                logger.info(`No eid found for network ${networkName}, skipping`)
                return
            }
            const rpcUrl = networks[networkName]?.[RPC_URL_KEY]
            if (!rpcUrl) {
                logger.info(`No RPC URL found for network ${networkName}, skipping`)
                return
            }

            const provider: BaseProvider = await getProvider(rpcUrl, networkName)
            if (!provider) {
                networksWithInvalidRPCs.push(networkName)
                logger.error(`Error fetching provider for network: ${networkName}`)
                return
            }

            return Promise.race([
                provider.getBlockNumber(),
                new Promise<void>((_, reject) => setTimeout(reject, taskArgs.timeout)),
            ]).then(
                (block) => {
                    return !!block
                },
                () => {
                    networksWithInvalidRPCs.push(networkName)
                }
            )
        })
    )

    if (networksWithInvalidRPCs.length !== 0) {
        logger.error(
            `${printBoolean(false)} ========== RPC URL validation failed for network(s): ${networksWithInvalidRPCs.join(', ')}`
        )
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
    .addParam('networks', 'Comma-separated list of networks to simulate', undefined, cliTypes.csv, true)
    .addParam('stage', 'Chain stage. One of: mainnet, testnet, sandbox', undefined, cliTypes.stage, true)
