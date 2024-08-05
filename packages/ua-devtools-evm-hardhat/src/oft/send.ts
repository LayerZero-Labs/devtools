import { task } from 'hardhat/config'
import { ActionType } from 'hardhat/types'

import {
    createConnectedContractFactory,
    createSignerFactory,
    getEidForNetworkName,
    types,
} from '@layerzerolabs/devtools-evm-hardhat'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SubtaskLoadConfigTaskArgs,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

import { createOFTFactory } from '@layerzerolabs/oft-devtools-evm'
const TASK_LZ_OFT_SEND = 'lz:oft:send'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
    from: string
    to: string
    amount?: string
}

const action: ActionType<TaskArgs> = async (
    { oappConfig: oappConfigPath, logLevel = 'info', from, to, amount = '1' },
    hre
) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // Now we load the graph
    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfigPath,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OFT_SEND,
    } satisfies SubtaskLoadConfigTaskArgs)

    const connection = graph.connections.find((connection) => {
        const fromEid = getEidForNetworkName(from)
        const toEid = getEidForNetworkName(to)

        return connection.vector.from.eid === fromEid && connection.vector.to.eid === toEid
    })

    if (!connection) {
        throw new Error(`Connection between ${from} and ${to} not found`)
    }

    const contractFactory = createConnectedContractFactory()
    const signerFactory = createSignerFactory()

    const oftFactory = createOFTFactory(contractFactory)

    const oftSdk = await oftFactory(connection.vector.from)
    const signer = await signerFactory(connection.vector.from.eid)

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()
    const tokensToSend = hre.ethers.utils.parseEther(amount)

    const sendParam = {
        dstEid: connection.vector.to.eid,
        to: await signer.signer.getAddress(),
        amountLD: tokensToSend,
        minAmountLD: tokensToSend,
        extraOptions: options,
        composeMsg: '0x',
        oftCmd: '0x',
    }

    const msgFee = await oftSdk.quoteSend(sendParam, false)
    const tx = await oftSdk.send(sendParam, msgFee, await signer.signer.getAddress())

    console.log(`Sent ${amount} tokens from ${from} to ${to} created. Waiting for confirmation...`)

    const txResponse = await signer.signAndSend({ ...tx, value: msgFee.nativeFee })
    await txResponse.wait()

    console.log(
        `Sent ${amount} tokens from ${from} to ${to} success. Check transaction: https://testnet.layerzeroscan.com/tx/${txResponse.transactionHash}`
    )
}

task(TASK_LZ_OFT_SEND, 'Outputs OApp peer connections', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam('from', 'From network to use', undefined, types.string)
    .addParam('to', 'To network to use', undefined, types.string)
    .addParam('amount', 'Amount tokens to send', '1', types.string)
