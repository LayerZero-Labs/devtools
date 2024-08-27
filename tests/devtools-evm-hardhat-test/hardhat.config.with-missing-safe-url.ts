import 'hardhat-deploy'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import '@layerzerolabs/toolbox-hardhat'
import { createTestNetworkConfigV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import type { HardhatUserConfig } from 'hardhat/types'

const MNEMONIC = process.env.MNEMONIC ?? ''

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.22',
    },
    networks: {
        ...createTestNetworkConfigV2({ mnemonic: MNEMONIC, initialIndex: 0 }),
        ethereum: {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            url: 'no:///way',
            accounts: {
                mnemonic: MNEMONIC,
                initialIndex: 0,
            },
            safeConfig: {
                safeAddress: '0xCDa8e3ADD00c95E5035617F970096118Ca2F4C92',
                safeUrl: '',
            },
        },
    },
}

export default config
