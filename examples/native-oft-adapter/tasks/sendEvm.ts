import path from 'path'

import { BigNumber, Contract, ContractTransaction } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { OmniPointHardhat, createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger, promptToContinue } from '@layerzerolabs/io-devtools'
import { ChainType, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import { SendResult } from './types'
import { DebugLogger, KnownErrors, MSG_TYPE, getLayerZeroScanLink, isEmptyOptionsEvm } from './utils'

const logger = createLogger()

export interface EvmArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    oappConfig: string
    minAmount?: string
    extraLzReceiveOptions?: string[]
    extraLzComposeOptions?: string[]
    extraNativeDropOptions?: string[]
    composeMsg?: string
    oftAddress?: string
}

/**
 * Get OApp contract address by EID from LayerZero config
 */
async function getOAppAddressByEid(
    eid: number,
    oappConfig: string,
    hre: HardhatRuntimeEnvironment,
    overrideAddress?: string
): Promise<string> {
    if (overrideAddress) {
        return overrideAddress
    }

    const layerZeroConfig = (await import(path.resolve('./', oappConfig))).default
    const { contracts } = typeof layerZeroConfig === 'function' ? await layerZeroConfig() : layerZeroConfig
    const wrapper = contracts.find((c: { contract: OmniPointHardhat }) => c.contract.eid === eid)
    if (!wrapper) throw new Error(`No config for EID ${eid}`)

    return wrapper.contract.contractName
        ? (await hre.deployments.get(wrapper.contract.contractName)).address
        : wrapper.contract.address || ''
}

export async function sendEvm(
    {
        srcEid,
        dstEid,
        amount,
        to,
        oappConfig,
        minAmount,
        extraLzReceiveOptions,
        extraLzComposeOptions,
        extraNativeDropOptions,
        composeMsg,
        oftAddress,
    }: EvmArgs,
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
    const signer = (await srcEidHre.ethers.getSigners())[0]

    // 1️⃣ resolve the OFT wrapper address
    const wrapperAddress = await getOAppAddressByEid(srcEid, oappConfig, srcEidHre, oftAddress)

    // 2️⃣ load OFT ABI (enforcedOptions needed), extends token()
    const oftArtifact = await srcEidHre.artifacts.readArtifact('OFT')

    // now attach
    const oft = await srcEidHre.ethers.getContractAt(oftArtifact.abi, wrapperAddress, signer)

    // 🔗 Get LayerZero endpoint contract
    // This is used to read the outbound nonce prior to sending, so we can report it back to the user
    const endpointDep = await srcEidHre.deployments.get('EndpointV2')
    const _endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

    // Get destination OApp address for outboundNonce call
    const dstEidHre = await getHreByEid(dstEid)
    const dstWrapperAddress = await getOAppAddressByEid(dstEid, oappConfig, dstEidHre, oftAddress)
    const dstWrapperBytes32 = addressToBytes32(dstWrapperAddress)

    // 3️⃣ fetch the underlying ERC-20
    const underlying = await oft.token()

    // 4️⃣ Check if this is a NativeOFTAdapter (token() returns address(0))
    // NativeOFTAdapter adapts the chain's native token; it doesn't require ERC20 approvals, and msg.value must include
    // both the LayerZero fee and the amount being sent. We'll assume 18 decimals for native tokens.
    const isNativeOFT = underlying === '0x0000000000000000000000000000000000000000'

    let decimals: number
    let erc20: Contract | null = null

    if (isNativeOFT) {
        logger.info('NativeOFTAdapter detected - handling native token transfer')
        // Native tokens typically have 18 decimals
        decimals = 18
        // No ERC20 contract needed for native tokens
    } else {
        erc20 = await srcEidHre.ethers.getContractAt('ERC20', underlying, signer)
        decimals = await erc20.decimals()
    }

    // 5️⃣ normalize the user-supplied amount
    const amountUnits: BigNumber = parseUnits(amount, decimals)

    // 6️⃣ Check if approval is required (for OFT Adapters) and handle approval —
    // Skip approval check for NativeOFTAdapter since it doesn't need ERC20 approval.
    if (!isNativeOFT) {
        try {
            const approvalRequired = await oft.approvalRequired()
            if (approvalRequired) {
                logger.info('OFT Adapter detected - checking ERC20 allowance...')

                const currentAllowance = await erc20!.allowance(signer.address, wrapperAddress)
                logger.info(`Current allowance: ${currentAllowance.toString()}`)
                logger.info(`Required amount: ${amountUnits.toString()}`)

                if (currentAllowance.lt(amountUnits)) {
                    logger.info('Insufficient allowance - approving ERC20 tokens...')
                    const approveTx = await erc20!.approve(wrapperAddress, amountUnits)
                    logger.info(`Approval transaction hash: ${approveTx.hash}`)
                    await approveTx.wait()
                    logger.info('ERC20 approval confirmed')
                } else {
                    logger.info('Sufficient allowance already exists')
                }
            }
        } catch (error) {
            logger.info('No approval required (regular OFT detected)')
        }
    }

    // 7️⃣ hex string → Uint8Array → zero-pad to 32 bytes
    const toBytes = addressToBytes32(to)

    // 8️⃣ Build options dynamically using Options.newOptions()
    let options = Options.newOptions()

    if (extraLzReceiveOptions && extraLzReceiveOptions.length > 0) {
        if (extraLzReceiveOptions.length % 2 !== 0) {
            throw new Error(
                `Invalid lzReceive options: received ${extraLzReceiveOptions.length} values, but expected pairs of gas,value`
            )
        }

        for (let i = 0; i < extraLzReceiveOptions.length; i += 2) {
            const gas = Number(extraLzReceiveOptions[i])
            const value = Number(extraLzReceiveOptions[i + 1]) || 0
            options = options.addExecutorLzReceiveOption(gas, value)
            logger.info(`Added lzReceive option: ${gas} gas, ${value} value`)
        }
    }

    if (extraLzComposeOptions && extraLzComposeOptions.length > 0) {
        if (extraLzComposeOptions.length % 3 !== 0) {
            throw new Error(
                `Invalid lzCompose options: received ${extraLzComposeOptions.length} values, but expected triplets of index,gas,value`
            )
        }

        for (let i = 0; i < extraLzComposeOptions.length; i += 3) {
            const index = Number(extraLzComposeOptions[i])
            const gas = Number(extraLzComposeOptions[i + 1])
            const value = Number(extraLzComposeOptions[i + 2]) || 0
            options = options.addExecutorComposeOption(index, gas, value)
            logger.info(`Added lzCompose option: index ${index}, ${gas} gas, ${value} value`)
        }
    }

    if (extraNativeDropOptions && extraNativeDropOptions.length > 0) {
        if (extraNativeDropOptions.length % 2 !== 0) {
            throw new Error(
                `Invalid native drop options: received ${extraNativeDropOptions.length} values, but expected pairs of amount,recipient`
            )
        }

        for (let i = 0; i < extraNativeDropOptions.length; i += 2) {
            const amountStr = extraNativeDropOptions[i]
            const recipient = extraNativeDropOptions[i + 1]

            if (!amountStr || !recipient) {
                throw new Error(
                    `Invalid native drop option: Both amount and recipient must be provided. Got amount="${amountStr}", recipient="${recipient}"`
                )
            }

            try {
                options = options.addExecutorNativeDropOption(amountStr.trim(), recipient.trim())
                logger.info(`Added native drop option: ${amountStr.trim()} wei to ${recipient.trim()}`)
            } catch (error) {
                const maxUint128 = BigInt('340282366920938463463374607431768211455')
                const maxUint128Ether = Number(maxUint128) / 1e18

                throw new Error(
                    `Failed to add native drop option with amount ${amountStr.trim()} wei. ` +
                        `LayerZero protocol constrains native drop amounts to uint128 maximum ` +
                        `(${maxUint128.toString()} wei ≈ ${maxUint128Ether.toFixed(2)} ETH). ` +
                        `Original error: ${error instanceof Error ? error.message : String(error)}`
                )
            }
        }
    }

    const extraOptions = options.toHex()

    // Check whether there are extra options or enforced options. If not, warn the user.
    // Read about Message Options: https://docs.layerzero.network/v2/concepts/message-options
    if (isEmptyOptionsEvm(extraOptions)) {
        try {
            const enforcedOptions = composeMsg
                ? await oft.enforcedOptions(dstEid, MSG_TYPE.SEND_AND_CALL)
                : await oft.enforcedOptions(dstEid, MSG_TYPE.SEND)

            if (isEmptyOptionsEvm(enforcedOptions)) {
                const proceed = await promptToContinue(
                    'No extra options were included and OFT has no set enforced options. Your quote / send will most likely fail. Continue?'
                )
                if (!proceed) {
                    throw new Error('Aborted due to missing options')
                }
            }
        } catch (error) {
            logger.debug(`Failed to check enforced options: ${error}`)
        }
    }

    // 9️⃣ build sendParam and dispatch
    const sendParam = {
        dstEid,
        to: toBytes,
        amountLD: amountUnits.toString(),
        minAmountLD: minAmount ? parseUnits(minAmount, decimals).toString() : amountUnits.toString(),
        extraOptions: extraOptions,
        composeMsg: composeMsg ? composeMsg.toString() : '0x',
        oftCmd: '0x',
    }

    // 10️⃣ Quote
    logger.info('Quoting the native gas cost for the send transaction...')
    let msgFee: { nativeFee: BigNumber; lzTokenFee: BigNumber }
    try {
        msgFee = await oft.quoteSend(sendParam, false)
    } catch (error) {
        DebugLogger.printErrorAndFixSuggestion(
            KnownErrors.ERROR_QUOTING_NATIVE_GAS_COST,
            `For network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`
        )
        throw error
    }
    // Get the outbound nonce that will be used for this transaction (before sending)
    // This is helpful for correlating the eventual receive/compose processing on the destination.
    const outboundNonce = (await _endpointContract.outboundNonce(wrapperAddress, dstEid, dstWrapperBytes32)).add(1)

    logger.info('Sending the transaction...')
    let tx: ContractTransaction
    try {
        if (isNativeOFT) {
            const totalValue = msgFee.nativeFee.add(amountUnits)
            logger.info(
                `NativeOFTAdapter: sending with msg.value = ${totalValue.toString()} (fees: ${msgFee.nativeFee.toString()} + amount: ${amountUnits.toString()})`
            )
            tx = await oft.send(sendParam, msgFee, signer.address, {
                value: totalValue,
            })
        } else {
            tx = await oft.send(sendParam, msgFee, signer.address, {
                value: msgFee.nativeFee,
            })
        }
    } catch (error) {
        DebugLogger.printErrorAndFixSuggestion(
            KnownErrors.ERROR_SENDING_TRANSACTION,
            `For network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`
        )
        throw error
    }
    const receipt = await tx.wait()

    const txHash = receipt.transactionHash
    const scanLink = getLayerZeroScanLink(txHash, srcEid >= 40_000 && srcEid < 50_000)

    return { txHash, scanLink, outboundNonce: outboundNonce.toString(), extraOptions }
}
