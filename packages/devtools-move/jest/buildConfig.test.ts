import { expect } from 'chai'
import { utils } from 'ethers'
import { buildConfig } from '../tasks/evm/utils/libraryConfigUtils'
import type { Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'

const DVN = '0x0000000000000000000000000000000000000001'
const ULN_TUPLE = [
    'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
]

const decodeRequiredDVNCount = (ulnConfigBytes: string): number =>
    Number(utils.defaultAbiCoder.decode(ULN_TUPLE, ulnConfigBytes)[0].requiredDVNCount)

describe('buildConfig requiredDVNs handling', () => {
    it('throws when requiredDVNs is omitted (this path cannot inherit the default)', () => {
        const config = { confirmations: BigInt(0), optionalDVNs: [], optionalDVNThreshold: 0 } as Uln302UlnUserConfig
        expect(() => buildConfig(config)).to.throw('requiredDVNs must be specified')
    })

    it('encodes an explicitly-empty requiredDVNs as the NIL sentinel (255)', () => {
        const { ulnConfigBytes } = buildConfig({
            confirmations: BigInt(0),
            requiredDVNs: [],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        })
        expect(decodeRequiredDVNCount(ulnConfigBytes)).to.equal(255)
    })

    it('encodes a concrete requiredDVNs by its length', () => {
        const { ulnConfigBytes } = buildConfig({
            confirmations: BigInt(0),
            requiredDVNs: [DVN],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        })
        expect(decodeRequiredDVNCount(ulnConfigBytes)).to.equal(1)
    })
})
