import { Connection, PublicKey } from '@solana/web3.js'
import * as multisig from '@sqds/multisig'

async function checkMultisig() {
    const multisigAddress = process.argv[2]
    if (!multisigAddress) {
        console.error('Please provide a multisig address as argument')
        process.exit(1)
    }

    const connection = new Connection('https://api.mainnet-beta.solana.com')
    const multisigKey = new PublicKey(multisigAddress)

    try {
        const account = await connection.getAccountInfo(multisigKey)
        console.log('Account exists:', !!account)
        console.log('Owner:', account?.owner.toBase58())
        console.log('Data length:', account?.data.length)

        // Try to deserialize as Squads multisig
        const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigKey)
        console.log('Successfully loaded as Squads multisig')
        console.log('Transaction index:', multisigInfo.transactionIndex.toString())
    } catch (error: any) {
        console.error('Error:', error.message)

        // Check if it might be a different program owner
        const account = await connection.getAccountInfo(multisigKey)
        if (account) {
            console.log('\nAccount details:')
            console.log('Owner program:', account.owner.toBase58())
            console.log('Squads program ID:', multisig.PROGRAM_ID.toBase58())
            console.log('Is Squads account:', account.owner.equals(multisig.PROGRAM_ID))
        }
    }
}

checkMultisig()
