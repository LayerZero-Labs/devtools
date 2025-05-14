import bs58 from 'bs58'
import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

import layerzeroConfig from '../../layerzero.config'
import { SendResult } from '../common/types'
import { getLayerZeroScanLink } from '../solana'

export interface EvmArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    oftAddress?: string
}

export async function sendEvm(
    { srcEid, dstEid, amount, to, oftAddress }: EvmArgs,
    hre: HardhatRuntimeEnvironment
): Promise<SendResult> {
    if (endpointIdToChainType(srcEid) !== ChainType.EVM) {
        throw new Error(`non-EVM srcEid (${srcEid}) not supported here`)
    }

    const getHreByEid = createGetHreByEid(hre)
    const srcEidHre = await getHreByEid(srcEid)

    const signer = await srcEidHre.ethers.getNamedSigner('deployer')

    // 1️⃣ resolve the OFT wrapper address
    let wrapperAddress: string
    if (oftAddress) {
        wrapperAddress = oftAddress
    } else {
        const { contracts } = typeof layerzeroConfig === 'function' ? await layerzeroConfig() : layerzeroConfig
        const wrapper = contracts.find((c) => c.contract.eid === srcEid)
        if (!wrapper) throw new Error(`No config for EID ${srcEid}`)
        wrapperAddress = wrapper.contract.contractName
            ? (await srcEidHre.deployments.get(wrapper.contract.contractName)).address
            : wrapper.contract.address!
    }

    // 2️⃣ load IOFT ABI, extend it with token()
    const ioftArtifact = await srcEidHre.artifacts.readArtifact('IOFT')

    // now attach
    const oft = await srcEidHre.ethers.getContractAt(ioftArtifact.abi, wrapperAddress, signer)

    // 3️⃣ fetch the underlying ERC-20
    const underlying = await oft.token()

    // 4️⃣ fetch decimals from the underlying token
    const erc20 = await srcEidHre.ethers.getContractAt('ERC20', underlying, signer)
    const decimals: number = await erc20.decimals()

    // 5️⃣ normalize the user-supplied amount
    const amountUnits: BigNumber = parseUnits(amount, decimals)

    // Decide how to encode `to` based on target chain:
    const dstChain = endpointIdToChainType(dstEid)
    let toBytes: string
    if (dstChain === ChainType.SOLANA) {
        // Base58→32-byte buffer
        toBytes = makeBytes32(bs58.decode(to))
    } else {
        // hex string → Uint8Array → zero-pad to 32 bytes
        toBytes = makeBytes32(to)
    }

    // 6️⃣ build sendParam and dispatch
    const sendParam = {
        dstEid,
        to: toBytes,
        amountLD: amountUnits.toString(),
        minAmountLD: amountUnits.mul(9_000).div(10_000).toString(),
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x',
    }

    // 6️⃣ Quote (MessagingFee = { nativeFee, lzTokenFee })
    const msgFee = await oft.quoteSend(sendParam, false)
    const tx = await oft.send(sendParam, msgFee, signer.address, {
        value: msgFee.nativeFee,
    })
    const receipt = await tx.wait()

    const txHash = receipt.transactionHash
    // pick your explorer; here I use LayerZeroScan
    const scanLink = getLayerZeroScanLink(txHash, dstEid === EndpointId.SOLANA_V2_TESTNET)

    return { txHash, scanLink }
}
