import { Account, Contract, RpcProvider } from 'starknet'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

// Load OFT ABI
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('@layerzerolabs/oft-mint-burn-starknet')
const OFT_ABI = pkg.abi?.oFTMintBurnAdapter

// Load deployment
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deployment = require('../starknet/deploy.json')

async function main() {
    const rpcUrl = process.env.RPC_URL_STARKNET
    const privateKey = process.env.STARKNET_PRIVATE_KEY
    const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS

    if (!rpcUrl || !privateKey || !accountAddress) {
        throw new Error('Missing STARKNET env vars')
    }

    const provider = new RpcProvider({ nodeUrl: rpcUrl })
    const account = new Account({ provider, address: accountAddress, signer: privateKey })

    const oftContract = new Contract({ abi: OFT_ABI, address: deployment.oftAddress, providerOrAccount: account })

    // Build enforced options for EVM destinations (Arbitrum)
    // lzReceive with 80000 gas
    const evmOptions = Options.newOptions().addExecutorLzReceiveOption(80000, 0).toBytes()
    console.log('EVM options (hex):', Buffer.from(evmOptions).toString('hex'))

    // Build enforced options for Sui
    // lzReceive with 5000 gas
    const suiOptions = Options.newOptions().addExecutorLzReceiveOption(5000, 0).toBytes()
    console.log('Sui options (hex):', Buffer.from(suiOptions).toString('hex'))

    // Convert hex to latin1 string for Cairo ByteArray
    const hexToString = (bytes: Uint8Array): string => {
        return Buffer.from(bytes).toString('latin1')
    }

    const enforcedOptionsParams = [
        {
            eid: EndpointId.ARBITRUM_V2_MAINNET, // 30110
            msg_type: 1, // SEND
            options: hexToString(evmOptions),
        },
        {
            eid: EndpointId.SUI_V2_MAINNET, // 30378
            msg_type: 1, // SEND
            options: hexToString(suiOptions),
        },
    ]

    console.log('Setting enforced options for Starknet OFT...')
    console.log('OFT address:', deployment.oftAddress)
    console.log(
        'Params:',
        JSON.stringify(
            enforcedOptionsParams.map((p) => ({ eid: p.eid, msg_type: p.msg_type, options_length: p.options.length })),
            null,
            2
        )
    )

    try {
        // Use populateTransaction to get the call, then execute
        const call = oftContract.populateTransaction.set_enforced_options(enforcedOptionsParams)
        console.log('Call data:', JSON.stringify(call, null, 2))

        const response = await account.execute([call])
        console.log('Transaction submitted:', response.transaction_hash)

        console.log('Waiting for confirmation...')
        await provider.waitForTransaction(response.transaction_hash)
        console.log('Transaction confirmed!')
    } catch (error) {
        console.error('Failed to set enforced options:', error)
        throw error
    }
}

main().catch(console.error)
