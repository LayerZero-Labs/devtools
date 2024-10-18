import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { EddsaInterface, createSignerFromKeypair, publicKey, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'
import bs58 from 'bs58'

import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { OftPDA } from '@layerzerolabs/oft-v2-solana-sdk'

import { createSolanaConnectionFactory } from '../common/utils'

const getFromEnv = (key: string): string => {
    const value = process.env[key]
    if (!value) {
        throw new Error(`${key} is not defined in the environment variables.`)
    }
    return value
}

/**
 * Extracts the SOLANA_PRIVATE_KEY from the environment.  This is purposely not exported for encapsulation purposes.
 */
const getSolanaPrivateKeyFromEnv = () => getFromEnv('SOLANA_PRIVATE_KEY')

/**
 * Derive common connection and UMI objects for a given endpoint ID.
 * @param eid {EndpointId}
 */
export const deriveConnection = async (eid: EndpointId) => {
    const privateKey = getSolanaPrivateKeyFromEnv()
    const connectionFactory = createSolanaConnectionFactory()
    const connection = await connectionFactory(eid)
    const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
    const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))
    const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
    umi.use(signerIdentity(umiWalletSigner))
    return {
        connection,
        umi,
        umiWalletKeyPair,
        umiWalletSigner,
    }
}

/**
 * Derive the keys needed for the OFT program.
 * @param programIdStr {string}
 */
export const deriveKeys = (programIdStr: string) => {
    const programId = publicKey(programIdStr)
    const eddsa: EddsaInterface = createWeb3JsEddsa()
    const oftDeriver = new OftPDA(programId)
    const lockBox = eddsa.generateKeypair()
    const escrowPK = lockBox.publicKey
    const [oftStorePda] = oftDeriver.oftStore(escrowPK)
    return {
        programId,
        lockBox,
        escrowPK,
        oftStorePda,
        eddsa,
    }
}

/**
 * Outputs the OFT accounts to a JSON file.
 * @param eid {EndpointId}
 * @param programId {string}
 * @param mint {string}
 * @param mintAuthority {string}
 * @param escrow {string}
 * @param oftStore {string}
 */
export const output = (
    eid: EndpointId,
    programId: string,
    mint: string,
    mintAuthority: string,
    escrow: string,
    oftStore: string
) => {
    const outputDir = `./deployments/${endpointIdToNetwork(eid)}`
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
    }
    writeFileSync(
        `${outputDir}/OFT.json`,
        JSON.stringify(
            {
                programId,
                mint,
                mintAuthority,
                escrow,
                oftStore,
            },
            null,
            4
        )
    )
    console.log(`Accounts have been saved to ${outputDir}/OFT.json`)
}

export const getLayerZeroScanLink = (hash: string, isTestnet = false) =>
    isTestnet ? `https://testnet.layerzeroscan.com/tx/${hash}` : `https://layerzeroscan.com/tx/${hash}`

export const getExplorerTxLink = (hash: string, isTestnet = false) =>
    `https://explorer.solana.com/tx/${hash}?cluster=${isTestnet ? 'devnet' : 'mainnet-beta'}`
