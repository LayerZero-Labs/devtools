import { ethers } from 'ethers'
import { task } from 'hardhat/config'
import { ActionType } from 'hardhat/types'

import {
    createConnectedContractFactory,
    createSignerFactory,
    getNetworkNameForEid,
    types,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { OmniPoint } from '@layerzerolabs/toolbox-hardhat'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { ERC20Factory, createERC20Factory } from '@layerzerolabs/ua-devtools-evm'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SubtaskLoadConfigTaskArgs,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

const TASK_LZ_OFT_BALANCE_GET = 'lz:oft:balances:get'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

export interface OFTBalances {
    point: OmniPoint
    balance: string
}

export type OAppReadPeers = (points: OmniPoint[], createSdk: ERC20Factory) => Promise<OFTBalances[]>

export const checkOFTBalances: OAppReadPeers = async (points, createSdk): Promise<OFTBalances[]> => {
    const signerFactory = createSignerFactory()

    return await Promise.all(
        points.map(async (point): Promise<OFTBalances> => {
            const signer = await signerFactory(point.eid)

            const sdk = await createSdk(point)

            const balance = await sdk.getBalanceOf(await signer.signer.getAddress())

            return { point: point, balance: ethers.utils.formatEther(balance) }
        })
    )
}

const action: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }, hre) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // Now we load the graph
    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfigPath,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OFT_BALANCE_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    // need points for OApp Peer Matrix
    const points = graph.contracts
        .map(({ point }) => point)
        .map((point) => ({
            ...point,
        }))

    // At this point we are ready read data from the OApp
    logger.verbose(`Reading peers from OApps`)
    const contractFactory = createConnectedContractFactory()
    const erc20Factory = createERC20Factory(contractFactory)

    try {
        const balances = await checkOFTBalances(points, erc20Factory)

        balances.forEach((value) => {
            console.log(
                `Balance of signer in ${getNetworkNameForEid(value.point.eid)}: ${value.balance} ${value.point.contractName}`
            )
        })
    } catch (error) {
        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }
}

task(TASK_LZ_OFT_BALANCE_GET, 'Outputs OApp peer connections', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
