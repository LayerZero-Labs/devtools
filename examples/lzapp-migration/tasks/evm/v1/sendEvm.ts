import assert from 'assert'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { BigNumber } from 'ethers'
import { BytesLike, parseUnits } from 'ethers/lib/utils'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { ChainType, EndpointId, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import layerzeroConfig from '../../../layerzero.config'
import { SendResult } from '../../common/types'
import { DebugLogger, KnownErrors } from '../../common/utils'
import { getLayerZeroScanLink } from '../../solana'

export interface EvmArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    oftAddress?: string
}

const PT_SEND = 0
const GAS_LIMIT_SOLANA = 200_000 // Gas limit for the executor when sending to Solana
const MSG_VALUE_SOLANA = 2_500_000 // For why this is necessary, see: https://docs.layerzero.network/v2/developers/solana/oft/account#setting-enforced-options-inbound-to-solana

const GAS_LIMIT_DEFAULT = 80_000 // Gas limit for the executor when sending to EVM / Aptos
const MSG_VALUE_DEFAULT = 0 // No msg.value needed for EVM / Aptos

export async function sendEvm(
    { srcEid, dstEid, amount, to, oftAddress }: EvmArgs,
    hre: HardhatRuntimeEnvironment
): Promise<SendResult> {
    if (endpointIdToChainType(srcEid) !== ChainType.EVM) {
        throw new Error(`non-EVM srcEid (${srcEid}) not supported here`)
    }

    const getHreByEid = createGetHreByEid(hre)
    let srcEidHre: HardhatRuntimeEnvironment
    try {
        srcEidHre = await getHreByEid(srcEid)
    } catch (error) {
        DebugLogger.printErrorAndFixSuggestion(
            KnownErrors.ERROR_GETTING_HRE,
            `For network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`
        )
        throw error
    }

    const { deployer } = await srcEidHre.getNamedAccounts()
    const signer = await srcEidHre.ethers.getSigner(deployer) // getNamedSigner is not available in v1, so we use getSigner with deployer account

    // 1️⃣ resolve the OFT wrapper address
    let wrapperAddress: string
    if (oftAddress) {
        wrapperAddress = oftAddress
    } else {
        const { contracts } = layerzeroConfig // not using simple config generator, so no need to check if type is function
        const wrapper = contracts.find((c) => c.contract.eid === srcEid)
        if (!wrapper) throw new Error(`No config for EID ${srcEid}`)
        wrapperAddress = wrapper.contract.contractName
            ? (await srcEidHre.deployments.get(wrapper.contract.contractName)).address
            : wrapper.contract.address!
    }

    // 2️⃣ load MyEndpointV1OFTV2Mock ABI, extend it with token()
    const ioftArtifact = await srcEidHre.artifacts.readArtifact('MyEndpointV1OFTV2Mock')

    // now attach
    const oft = await srcEidHre.ethers.getContractAt(ioftArtifact.abi, wrapperAddress, signer)

    // 3️⃣ fetch the underlying ERC-20
    const underlying = await oft.token()

    // 4️⃣ fetch decimals from the underlying token
    const erc20 = await srcEidHre.ethers.getContractAt('ERC20', underlying, signer)
    const decimals: number = await erc20.decimals()

    // 5️⃣ normalize the user-supplied amount
    const amountUnits: BigNumber = parseUnits(amount, decimals)

    const minDstGas: BigNumber = await oft.minDstGasLookup(dstEid, PT_SEND) // 0 = send, 1 = send_and_call

    assert(
        minDstGas.gt(0),
        "minDstGas must be a non-0 value to bypass gas assertion part of EndpointV1. Ensure you have called 'npx hardhat lz:epv1:set-min-dst-gas' for the destination eid"
    )

    // Decide how to configure chain-specific values and encode `to`
    const dstChain = endpointIdToChainType(dstEid)
    let toBytes: string
    let MSG_VALUE: number
    let GAS_LIMIT: number

    if (dstChain === ChainType.SOLANA) {
        // 1️⃣ Validate & encode Base58 → 32-byte buffer
        try {
            toBytes = makeBytes32(bs58.decode(to))
        } catch {
            throw new Error(`Invalid Solana address: not valid Base58`)
        }
        // 2️⃣ Solana-specific fee settings
        MSG_VALUE = MSG_VALUE_SOLANA
        GAS_LIMIT = GAS_LIMIT_SOLANA
    } else {
        // 1️⃣ Validate & encode hex (EVM, Move, Hyperliquid, etc.) → 32-byte buffer
        if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
            throw new Error(`Invalid address: expected 0x-prefixed 40 hex chars`)
        }
        toBytes = makeBytes32(to)
        // 2️⃣ Non-Solana fee settings
        MSG_VALUE = MSG_VALUE_DEFAULT
        GAS_LIMIT = GAS_LIMIT_DEFAULT
    }

    // 6️⃣ send
    const _options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE)
    const adapterParams: BytesLike = _options.toBytes()

    const fees = await oft.estimateSendFee(dstEid, toBytes, amount, false, adapterParams)
    console.log(`fees[0] (wei): ${fees[0]} / (eth): ${hre.ethers.utils.formatEther(fees[0])}`)
    const tx = await oft.sendFrom(
        signer.address, // 'from' address to send tokens
        dstEid, // remote LayerZero chainId
        toBytes, // 'to' address to send tokens
        amountUnits, // amount of tokens to send (in wei)
        {
            refundAddress: signer.address,
            zroPaymentAddress: hre.ethers.constants.AddressZero,
            adapterParams: _options.toBytes(), // as workaround for EndpointV1 OFT -> OFT202, we specify options type 3 instead of adapter params
        },
        { value: fees[0] }
    )
    const receipt = await tx.wait()
    const scanLink = getLayerZeroScanLink(receipt.transactionHash, srcEid === EndpointId.SOLANA_V2_TESTNET)

    return {
        txHash: receipt.transactionHash,
        scanLink,
    }
}
