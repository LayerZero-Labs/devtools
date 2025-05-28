import bs58 from 'bs58'
import { BigNumber, ContractTransaction } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger } from '@layerzerolabs/io-devtools'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

import { SendResult } from '../common/types'
import layerzeroConfig from '../layerzero.config'

const logger = createLogger()

export interface EvmArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    oftAddress?: string
}

export async function sendEvm(args: EvmArgs, hre: HardhatRuntimeEnvironment): Promise<SendResult> {
    const { srcEid, dstEid, amount, to, oftAddress } = args
    if (endpointIdToChainType(srcEid) !== ChainType.EVM) throw new Error('srcEid must be EVM')

    const getHreByEid = createGetHreByEid(hre)
    const srcHre = await getHreByEid(srcEid)
    const signer = await srcHre.ethers.getNamedSigner('deployer')

    let wrapperAddress: string
    if (oftAddress) {
        wrapperAddress = oftAddress
    } else {
        const { contracts } = typeof layerzeroConfig === 'function' ? await layerzeroConfig() : layerzeroConfig
        const wrapper = contracts.find((c) => c.contract.eid === srcEid)
        if (!wrapper) throw new Error(`No config for EID ${srcEid}`)
        wrapperAddress = wrapper.contract.contractName
            ? (await srcHre.deployments.get(wrapper.contract.contractName)).address
            : wrapper.contract.address!
    }

    const ioftArtifact = await srcHre.artifacts.readArtifact('IOFT')
    const oft = await srcHre.ethers.getContractAt(ioftArtifact.abi, wrapperAddress, signer)
    const underlying = await oft.token()
    const erc20 = await srcHre.ethers.getContractAt('ERC20', underlying, signer)
    const decimals: number = await erc20.decimals()
    const amountUnits: BigNumber = parseUnits(amount, decimals)

    const toBytes = endpointIdToChainType(dstEid) === ChainType.SOLANA ? makeBytes32(bs58.decode(to)) : makeBytes32(to)
    const sendParam = {
        dstEid,
        to: toBytes,
        amountLD: amountUnits.toString(),
        minAmountLD: amountUnits.toString(),
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x',
    }

    logger.info('Sending the transaction...')
    const tx: ContractTransaction = await oft.send(sendParam, { nativeFee: 0, lzTokenFee: 0 }, signer.address)
    const receipt = await tx.wait()
    return { txHash: receipt.transactionHash, scanLink: '' }
}
