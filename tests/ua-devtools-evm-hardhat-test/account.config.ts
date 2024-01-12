import type { HDAccountsUserConfig } from 'hardhat/types'

const MNEMONIC = process.env.MNEMONIC ?? ''

const account: HDAccountsUserConfig = {
    mnemonic: MNEMONIC,
    // We'll offset the initial index for the accounts by 10
    // for every test project so that the project can use 10 accounts
    // without getting any nonce race conditions with other test runs
    initialIndex: 10,
}

export default account
