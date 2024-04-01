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
                // We'll reserve 10 accounts per every test project
                //
                // When adding new E2E test projects, bumpt this number
                // and set the initialIndex in your project's network config
                // so that the accounts the projects uses do not overlap with other projects
                //
                // This will ensure that there are no nonce race conditions when running the tests in parallel
                count: 100,
            },
        },
    },
}

export default config
