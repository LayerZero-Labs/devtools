import basex from 'base-x'
import { ethers } from 'ethers'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function basexToBytes32(basexAddress: string, eid: string): string {
    const chainType = endpointIdToChainType(Number(eid))

    if (chainType === ChainType.EVM) {
        const addressBytes = ethers.utils.zeroPad(basexAddress, 32)
        return `0x${Buffer.from(addressBytes).toString('hex')}`
    } else if (chainType === ChainType.APTOS) {
        return basexAddress
    } else if (chainType === ChainType.SOLANA) {
        return decodeSolanaAddress(basexAddress)
    } else if (chainType === ChainType.INITIA) {
        return basexAddress
    } else {
        throw new Error('Invalid chain type')
    }
}

export function decodeSolanaAddress(address: string): string {
    const addressBytes = basex(BASE58).decode(address)
    return '0x' + Buffer.from(addressBytes).toString('hex')
}
