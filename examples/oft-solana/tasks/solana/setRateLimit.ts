import assert from 'assert'

import { mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair, PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { formatOmniVector } from '@layerzerolabs/devtools'
import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_SEED, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { OAppOmniGraphHardhatSchema, SUBTASK_LZ_OAPP_CONFIG_LOAD } from '@layerzerolabs/ua-devtools-evm-hardhat'

import { createSolanaConnectionFactory } from '../common/utils'
import getFee from '../utils/getFee'

interface Args {
    mint: string
    eid: EndpointId
    programId: string
    oappConfig: string
}

task('lz:oft:solana:rate-limit', "Sets the Solana and EVM rate limits from './scripts/solana/utils/constants.ts'")
    .addParam('mint', 'The OFT token mint public key')
    .addParam('programId', 'The OFT Program id')
    .addParam('eid', 'Solana mainnet or testnet', undefined, types.eid)
    .addParam('oappConfig', 'The LayerZero Solana config')
    .setAction(async (taskArgs: Args, hre) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')

        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey))
        const umiKeypair = fromWeb3JsKeypair(keypair)

        const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: taskArgs.oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: 'lz:oft:solana:rate-limit',
        })

        const solanaRateLimits = {
            rateLimitConfig: {
                rateLimitCapacity: BigInt('10000000000000000'),
                rateLimitRefillRatePerSecond: BigInt('2777777777778'),
            },
        }

        let solanaEid: EndpointId

        const connectionFactory = createSolanaConnectionFactory()
        const connection = await connectionFactory(taskArgs.eid)

        // Initialize UMI framework with the Solana connection
        const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
        const umiWalletSigner = createSignerFromKeypair(umi, umiKeypair)
        umi.use(signerIdentity(umiWalletSigner))

        const mintPublicKey = new PublicKey(taskArgs.mint)
        const OFT_PROGRAM_ID = new PublicKey(taskArgs.programId)

        // Derive the OFT Config's PDA
        const [oftConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), mintPublicKey.toBuffer()],
            OFT_PROGRAM_ID
        )

        for (const peer of graph.connections.filter((connection) => connection.vector.from.eid === solanaEid)) {
            try {
                const setRateLimitIx = await OftTools.createSetRateLimitIx(
                    OFT_PROGRAM_ID,
                    keypair.publicKey,
                    oftConfig,
                    peer.vector.to.eid,
                    solanaRateLimits.rateLimitConfig.rateLimitCapacity,
                    solanaRateLimits.rateLimitConfig.rateLimitRefillRatePerSecond,
                    true
                )

                // Convert the instruction and create the transaction builder
                const convertedInstruction = fromWeb3JsInstruction(setRateLimitIx)
                const transactionBuilder = new TransactionBuilder([
                    {
                        instruction: convertedInstruction,
                        signers: [umiWalletSigner],
                        bytesCreatedOnChain: 0,
                    },
                ])

                // Fetch simulation compute unit price
                const { averageFeeExcludingZeros } = await getFee(connection)
                const avgComputeUnitPrice = Math.round(averageFeeExcludingZeros)
                const computeUnitPrice = BigInt(avgComputeUnitPrice * 1.1)

                // Send and confirm the transaction
                const transactionSignature = await transactionBuilder
                    .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice }))
                    .sendAndConfirm(umi)
                const setRateLimitSignature = bs58.encode(transactionSignature.signature)
                const setRateLimitLink = getExplorerLink('tx', setRateLimitSignature.toString(), 'mainnet-beta')
                console.log(
                    `✅ You set ${solanaRateLimits.rateLimitConfig.rateLimitCapacity} with a refill of ${solanaRateLimits.rateLimitConfig.rateLimitRefillRatePerSecond} per second for ${formatOmniVector(peer.vector)}! View the transaction here: ${setRateLimitLink}`
                )
            } catch (error) {
                console.error(`Error processing LayerZero peer with from EID ${formatOmniVector(peer.vector)}:`, error)
            }
        }
    })
