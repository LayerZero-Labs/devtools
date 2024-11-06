import { RESTClient, MnemonicKey, Wallet } from '@initia/initia.js'
import 'dotenv/config'

async function checkBalance() {
    // Initialize REST Client
    const rest = new RESTClient('https://rest.testnet.initia.xyz', {
        chainId: 'initiation-2',
        gasPrices: '0.15uinit',
        gasAdjustment: '1.75',
    })

    // Use the same mnemonic setup from your config
    const DEPLOYER_PATH = process.env.DEPLOYER_PATH ?? 'm/44/118/0/0/0'
    const DEPLOYER_MNEMONIC =
        process.env.DEPLOYER_MNEMONIC ?? 'this melt eight ribbon mansion grant solar humor volume view corn street'

    const [, , COIN_TYPE, ACCOUNT, , INDEX] = DEPLOYER_PATH.split('/')
    const key = new MnemonicKey({
        mnemonic: DEPLOYER_MNEMONIC,
        account: parseInt(ACCOUNT!),
        index: parseInt(INDEX!),
        coinType: parseInt(COIN_TYPE!),
    })

    // Create wallet instance
    const wallet = new Wallet(rest, key)

    try {
        // Get wallet address
        const address = wallet.key.accAddress

        // Fetch balance
        const balances = await rest.bank.balance(address)

        console.log('Wallet Address:', address)
        console.log('Balances:', balances.toString())
    } catch (error) {
        console.error('Error fetching balance:', error)
    }
}

// Run the function
checkBalance()
