import { EndpointId } from '@layerzerolabs/lz-definitions'
import { expect } from 'chai'
import { basexToBytes32 } from '../tasks/shared/basexToBytes32'

describe('should convert base-x addresses (eth, aptos, solana, etc) to bytes32', () => {
    it('should convert solana base-x address to bytes32', () => {
        const basexAddress = 'Efvf2QfcPAJc8XCd1MV1MN1JLNDZRKj2ZbJ3xg6pAf7'
        const eid = EndpointId.SOLANA_V2_MAINNET.toString()
        const bytes32 = basexToBytes32(basexAddress, eid)
        expect(bytes32).to.equal('0x038090321ef8b2bbe6d072ded5e3e9ad8d5608e1b04db7d2e9777e39231af2ae')
    })

    it('should convert aptos base-x address to bytes32', () => {
        const basexAddress = '0x000000000000000000000000177b58ddda0c81424227ee473e4132044a0dc871'
        const eid = EndpointId.APTOS_V2_MAINNET.toString()
        const bytes32 = basexToBytes32(basexAddress, eid)
        expect(bytes32).to.equal('0x000000000000000000000000177b58ddda0c81424227ee473e4132044a0dc871')
    })

    it('should convert ethereum base-x address to bytes32', () => {
        const basexAddress = '0x177B58Ddda0C81424227Ee473e4132044a0DC871'
        const eid = EndpointId.ETHEREUM_V2_MAINNET.toString()
        const bytes32 = basexToBytes32(basexAddress, eid)
        expect(bytes32).to.equal('0x000000000000000000000000177b58ddda0c81424227ee473e4132044a0dc871')
    })
})
