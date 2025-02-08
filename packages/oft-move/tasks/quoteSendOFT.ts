import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'

import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'
import { hexAddrToAptosBytesAddr } from '@layerzerolabs/devtools-move/sdk/utils'

import { parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getContractNameFromLzConfig, getMoveVMOAppAddress } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { toAptosAddress } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getChain } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import {
    getLzConfig,
    getMoveVMContracts,
    promptUserContractSelection,
} from '@layerzerolabs/devtools-move/tasks/move/utils/config'

async function quoteSendOFT(
    amountLd: number,
    minAmountLd: number,
    toAddress: string,
    gasLimit: number,
    dstEid: EndpointId,
    configPath: string
) {
    const { account_address, private_key, network, fullnode } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const chain = getChain(fullnode)
    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const eid = selectedContract.contract.eid
    const lzNetworkStage = getNetworkForChainId(eid).env
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const aptosOftAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key, eid)

    // Pad EVM address to 64 chars and convert Solana address to Aptos address
    toAddress = toAptosAddress(toAddress, dstEid.toString())
    const toAddressBytes = hexAddrToAptosBytesAddr(toAddress)
    const options = Options.newOptions().addExecutorLzReceiveOption(BigInt(gasLimit))

    console.log(`Attempting to quote send ${amountLd} units`)
    console.log(`Using OFT at address: ${aptosOftAddress}`)
    console.log(`From account: ${account_address}`)
    console.log(`To account: ${toAddress}`)
    console.log(`dstEid: ${dstEid}`)

    const extra_options = options.toBytes()
    const compose_message = new Uint8Array([])
    const oft_cmd = new Uint8Array([])

    const [nativeFee, zroFee] = await oft.quoteSend(
        account_address,
        dstEid,
        toAddressBytes,
        amountLd,
        minAmountLd,
        extra_options,
        compose_message,
        oft_cmd,
        false // pay_in_zro: false to pay in native tokens
    )

    console.log('\nQuote received:')
    console.log('- Native fee:', nativeFee)
    console.log('- ZRO fee:', zroFee)
    console.log('If the above fees are acceptable, the wiring is confirmed to be successful.')
}

export { quoteSendOFT }
