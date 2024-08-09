import fs from 'fs'
import path from 'path'
import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_SEED, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

import getFee from '../utils/getFee'

task('lz:solana:oft:rate-limit', "Sets the Solana and EVM rate limits from './scripts/solana/utils/constants.ts'")
    .addParam('mint', 'The OFT token mint public key')
    .addParam('program', 'The OFT Program id')
    .addParam('staging', 'Solana mainnet or testnet')
    .addParam('oappConfig', 'The LayerZero Solana config')
    .setAction(async (taskArgs: TaskArguments) => {
        const configPath = path.resolve(taskArgs.oappConfig)

        type SolanaRateLimitConfig = {
            rateLimitConfig: {
                rateLimitCapacity: bigint
                rateLimitRefillRatePerSecond: bigint
            }
        }

        const solanaRateLimits: SolanaRateLimitConfig = {
            rateLimitConfig: {
                rateLimitCapacity: BigInt('10000000000000000'),
                rateLimitRefillRatePerSecond: BigInt('2777777777778'),
            },
        }

        if (!fs.existsSync(configPath)) {
            console.error(`Config file not found: ${configPath}`)
            return
        }

        const solanaConfig: OAppOmniGraphHardhat = (await import(configPath)).default
        let RPC_URL_SOLANA: string
        let solanaEid: EndpointId

        // Determine the RPC URL from env based on the specified network (mainnet or testnet)
        if (taskArgs.staging == 'mainnet') {
            RPC_URL_SOLANA = env.RPC_URL_SOLANA?.toString() ?? 'default_url'
            solanaEid = EndpointId.SOLANA_V2_MAINNET
        } else {
            throw new Error("Invalid network specified. Use 'mainnet' or 'testnet'.")
        }

        // Initialize UMI framework with the Solana connection
        const umi = createUmi(RPC_URL_SOLANA).use(mplToolbox())
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.SOLANA_PRIVATE_KEY!))
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        const mintPublicKey = new PublicKey(taskArgs.mint)
        const OFT_PROGRAM_ID = new PublicKey(taskArgs.program)

        // Derive the OFT Config's PDA
        const [oftConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), mintPublicKey.toBuffer()],
            OFT_PROGRAM_ID
        )

        for (const peer of solanaConfig.connections.filter((connection) => connection.from.eid === solanaEid)) {
            try {
                const setRateLimitIx = await OftTools.createSetRateLimitIx(
                    web3WalletKeyPair.publicKey,
                    oftConfig,
                    peer.to.eid,
                    solanaRateLimits.rateLimitConfig.rateLimitCapacity,
                    solanaRateLimits.rateLimitConfig.rateLimitRefillRatePerSecond,
                    true,
                    OFT_PROGRAM_ID
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
                const { averageFeeExcludingZeros } = await getFee()
                const avgComputeUnitPrice = Math.round(averageFeeExcludingZeros)
                const computeUnitPrice = BigInt(avgComputeUnitPrice * 1.1)

                // Send and confirm the transaction
                const transactionSignature = await transactionBuilder
                    .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice }))
                    .sendAndConfirm(umi)
                const setRateLimitSignature = bs58.encode(transactionSignature.signature)
                const setRateLimitLink = getExplorerLink('tx', setRateLimitSignature.toString(), 'mainnet-beta')
                console.log(
                    `✅ You set ${solanaRateLimits.rateLimitConfig.rateLimitCapacity} with a refill of ${solanaRateLimits.rateLimitConfig.rateLimitRefillRatePerSecond} per second for dstEid ${peer.to.eid}! View the transaction here: ${setRateLimitLink}`
                )
            } catch (error) {
                console.error(`Error processing LayerZero peer with from EID ${peer.from.eid}:`, error)
            }
        }
    })
