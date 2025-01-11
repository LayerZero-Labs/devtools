import basex from 'base-x'
import { ethers } from 'ethers'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function basexToBytes32(basexAddress: string, eid: string): string {
    const chainType = endpointIdToChainType(Number(eid))

    switch (chainType) {
        case ChainType.EVM: {
            const addressBytes = ethers.utils.zeroPad(basexAddress, 32)
            return `0x${Buffer.from(addressBytes).toString('hex')}`
        }
        case ChainType.APTOS: {
            return basexAddress
        }
        case ChainType.SOLANA: {
            const addressBytes = basex(BASE58).decode(basexAddress)
            return `0x${Buffer.from(addressBytes).toString('hex')}`
        }
        default: {
            throw new Error('Invalid chain type')
        }
    }
}
