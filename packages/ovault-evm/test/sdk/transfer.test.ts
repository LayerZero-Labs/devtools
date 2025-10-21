import { describe, it } from 'mocha'
import { Chain, createWalletClient, http, publicActions } from 'viem'
import { arbitrum, mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import { ERC20Abi } from '../../src/contracts/ERC20'

import { OVaultSyncOperations } from '../../src/types'

import { OVaultSyncMessageBuilder } from '../../src/oVaultSync'

import 'dotenv/config'

interface ChainConfig {
    eid: number
    chain: Chain
    asset: `0x${string}`
    assetErc20?: `0x${string}`
    share: `0x${string}`
    shareErc20?: `0x${string}`
    composer?: `0x${string}`
    vault?: `0x${string}`
}

const hubChainKey = 'ethereum'

// This is for the Resolve mainnet deployment
const chainInputs: Record<string, ChainConfig> = {
    ethereum: {
        eid: 30101,
        chain: mainnet,
        asset: '0xD2eE2776F34Ef4E7325745b06E6d464b08D4be0E',
        assetErc20: '0x66a1E37c9b0eAddca17d3662D6c05F4DECf3e110',
        share: '0xab17c1fE647c37ceb9b96d1c27DD189bf8451978',
        shareErc20: '0x1202F5C7b4B9E47a1A484E8B270be34dbbC75055',
        composer: '0x4ad165d7902b292d46b442ce2a4a25d5a891dd9d',
        vault: '0x1202F5C7b4B9E47a1A484E8B270be34dbbC75055',
    },
    arbitrum: {
        eid: 30110,
        chain: arbitrum,
        asset: '0x2492d0006411af6c8bbb1c8afc1b0197350a79e9',
        assetErc20: '0x2492d0006411af6c8bbb1c8afc1b0197350a79e9',
        share: '0x66cfbd79257dc5217903a36293120282548e2254',
        shareErc20: '0x66cfbd79257dc5217903a36293120282548e2254',
    },
} as const

// Native Wallet test
const nativeChainInputs: Record<string, ChainConfig> = {
    ethereum: {
        eid: 30101,
        chain: mainnet,
        asset: '0x0',
        assetErc20: '0x0',
        share: '0x5610118dA36A56c86390282D5E2b8Ac2FD9B7C6f',
        shareErc20: '0x76e1908646F3Bf45862972072484548Dff22472d',
        composer: '0x9A3b4Ab009B65A0713Cf0E6EC216161F3a0a7694',
        vault: '0x76e1908646F3Bf45862972072484548Dff22472d',
    },
    arbitrum: {
        eid: 30110,
        chain: arbitrum,
        asset: '0xa45b5130f36cdca45667738e2a258ab09f4a5f7f', // Stargate vault. Implements the OFT interface
        assetErc20: '0x0', // Use native token
        share: '0x3a40507905600e9b4a9127A7889eBadE1339282c',
        shareErc20: '0x3a40507905600e9b4a9127A7889eBadE1339282c',
    },
} as const

const walletAddress = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`).address as `0x${string}`

const generateInput = (
    srcChain: ChainConfig,
    dstChain: ChainConfig,
    hubChain: ChainConfig,
    operation: OVaultSyncOperations
) => {
    return {
        srcEid: srcChain.eid,
        hubEid: hubChain.eid,
        dstEid: dstChain.eid,
        walletAddress: walletAddress as `0x${string}`,
        vaultAddress: hubChain.vault as `0x${string}`,
        composerAddress: hubChain.composer as `0x${string}`,
        hubChain: hubChain.chain,
        sourceChain: srcChain.chain,
        operation: operation,
        hubLzComposeGasLimit: BigInt(800_000),
        amount: BigInt('10000000000000'),
        slippage: 0.01, // 1% slippage
        oftAddress: operation === OVaultSyncOperations.DEPOSIT ? srcChain.asset : srcChain.share,
        tokenAddress: operation === OVaultSyncOperations.DEPOSIT ? srcChain.assetErc20 : srcChain.shareErc20,
    }
}

describe('generateOVaultInputs', function () {
    // Increase timeout due to the time it takes to execute the transactions
    this.timeout(10_000)

    async function executeTransaction(
        srcChain: ChainConfig,
        dstChain: ChainConfig,
        hubChain: ChainConfig,
        operation: OVaultSyncOperations
    ) {
        const input = await generateInput(srcChain, dstChain, hubChain, operation)

        const inputs = await OVaultSyncMessageBuilder.generateOVaultInputs(input)
        const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)

        const walletClient = createWalletClient({
            account,
            chain: srcChain.chain,
            transport: http(),
        }).extend(publicActions)

        if (inputs.approval) {
            console.log('Approval Required. Approving...')
            const approvalTx = await walletClient.writeContract({
                address: inputs.approval.tokenAddress,
                abi: ERC20Abi,
                functionName: 'approve',
                args: [inputs.approval.spender, inputs.approval.amount],
            })
            await walletClient.waitForTransactionReceipt({ hash: approvalTx })
            console.log('Approval Completed. Hash: ', approvalTx)
        }

        console.log({
            dstAmount: inputs.dstAmount,
        })
        const tx = await walletClient.writeContract({
            address: inputs.contractAddress,
            abi: inputs.abi,
            value: inputs.messageValue,
            functionName: inputs.contractFunctionName,
            args: inputs.txArgs as any,
        })

        console.log('Transaction Submitted. Hash: ', tx)
    }

    describe('Native Vaulting', () => {
        const hubChain = nativeChainInputs[hubChainKey]!
        /**
         * Deposit
         */
        it('Deposit B->B->B', async () => {
            const srcChain = hubChain
            const dstChain = hubChain

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        it('Deposit A->B->B', async () => {
            const srcChain = nativeChainInputs['arbitrum']!
            const dstChain = hubChain

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        it('Deposit B->B->A', async () => {
            const srcChain = hubChain
            const dstChain = nativeChainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        it('Deposit A->B->A', async () => {
            const srcChain = nativeChainInputs['arbitrum']!
            const dstChain = nativeChainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        it.only('Redeem A->B->A', async () => {
            const srcChain = nativeChainInputs['arbitrum']!
            const dstChain = nativeChainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })

        it('Redeem B->B->A', async () => {
            const srcChain = hubChain
            const dstChain = nativeChainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })

        it('Redeem A->B->B', async () => {
            const srcChain = nativeChainInputs['arbitrum']!
            const dstChain = hubChain

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })

        it('Redeem B->B->B', async () => {
            const srcChain = hubChain
            const dstChain = hubChain

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })
    })

    describe.skip('OFT Vaulting', () => {
        const hubChain = chainInputs[hubChainKey]!
        /**
         * Deposit
         */
        it('Deposit B->B->B', async () => {
            const srcChain = chainInputs[hubChainKey]!
            const dstChain = chainInputs[hubChainKey]!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        it('Deposit A->B->A', async () => {
            const srcChain = chainInputs['arbitrum']!
            const dstChain = chainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        it('Deposit B->B->A', async () => {
            const srcChain = chainInputs[hubChainKey]!
            const dstChain = chainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        it('Deposit A->B->B', async () => {
            const srcChain = chainInputs['arbitrum']!
            const dstChain = chainInputs[hubChainKey]!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.DEPOSIT)
        })

        /**
         * Redeem
         */

        it('Redeem B->B->B', async () => {
            const srcChain = chainInputs[hubChainKey]!
            const dstChain = chainInputs[hubChainKey]!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })

        it('Redeem A->B->A', async () => {
            const srcChain = chainInputs['arbitrum']!
            const dstChain = chainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })

        it('Redeem B->B->A', async () => {
            const srcChain = chainInputs[hubChainKey]!
            const dstChain = chainInputs['arbitrum']!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })

        it('Redeem A->B->B', async () => {
            const srcChain = chainInputs['arbitrum']!
            const dstChain = chainInputs[hubChainKey]!

            await executeTransaction(srcChain, dstChain, hubChain, OVaultSyncOperations.REDEEM)
        })
    })
})
