import assert from 'assert'
import { HardhatUserConfig } from 'hardhat/types'

const MNEMONIC = process.env.MNEMONIC
assert(MNEMONIC, `Missing MNEMONIC environment variable`)

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    networks: {
        hardhat: {
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
    },
}

export default config
