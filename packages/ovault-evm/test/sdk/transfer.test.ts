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

const hubChain = 'ethereum'

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

const walletAddress = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`).address as `0x${string}`

const generateInput = (
    srcChain: (typeof chainInputs)['base-sepolia'],
    dstChain: (typeof chainInputs)['base-sepolia'],
    operation: OVaultSyncOperations
) => {
    return {
        srcEid: srcChain.eid,
        hubEid: chainInputs[hubChain]!.eid,
        dstEid: dstChain.eid,
        walletAddress: walletAddress as `0x${string}`,
        vaultAddress: chainInputs[hubChain]!.vault as `0x${string}`,
        composerAddress: chainInputs[hubChain]!.composer as `0x${string}`,
        hubChain: chainInputs[hubChain]!.chain,
        sourceChain: srcChain.chain,
        operation: operation,
        hubLzComposeGasLimit: BigInt(800_000),
        amount: BigInt('10000000000000000'),
        slippage: 0.01, // 1% slippage
        oftAddress: operation === OVaultSyncOperations.DEPOSIT ? srcChain.asset : srcChain.share,
        tokenAddress: operation === OVaultSyncOperations.DEPOSIT ? srcChain.assetErc20 : srcChain.shareErc20,
    }
}

describe.skip('generateOVaultInputs', function () {
    // Increase timeout due to the time it takes to execute the transactions
    this.timeout(10_000)

    async function executeTransaction(
        srcChain: (typeof chainInputs)['arbitrum-sepolia'],
        dstChain: (typeof chainInputs)['arbitrum-sepolia'],
        operation: OVaultSyncOperations
    ) {
        const input = await generateInput(srcChain, dstChain, operation)

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

        const tx = await walletClient.writeContract({
            address: inputs.contractAddress,
            abi: inputs.abi,
            value: inputs.messageFee.nativeFee,
            functionName: inputs.contractFunctionName,
            args: inputs.txArgs as any,
        })

        console.log('Transaction Submitted. Hash: ', tx)
    }

    /**
     * Deposit
     */
    it.skip('Deposit B->B->B', async () => {
        const srcChain = chainInputs[hubChain]!
        const dstChain = chainInputs[hubChain]!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    it.skip('Deposit A->B->A', async () => {
        const srcChain = chainInputs['arbitrum']!
        const dstChain = chainInputs['arbitrum']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    it.skip('Deposit B->B->A', async () => {
        const srcChain = chainInputs[hubChain]!
        const dstChain = chainInputs['arbitrum']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    it.skip('Deposit A->B->B', async () => {
        const srcChain = chainInputs['arbitrum']!
        const dstChain = chainInputs[hubChain]!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    /**
     * Redeem
     */

    it.skip('Redeem B->B->B', async () => {
        const srcChain = chainInputs[hubChain]!
        const dstChain = chainInputs[hubChain]!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })

    it.only('Redeem A->B->A', async () => {
        const srcChain = chainInputs['arbitrum']!
        const dstChain = chainInputs['arbitrum']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })

    it('Redeem B->B->A', async () => {
        const srcChain = chainInputs[hubChain]!
        const dstChain = chainInputs['arbitrum']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })

    it.skip('Redeem A->B->B', async () => {
        const srcChain = chainInputs['arbitrum']!
        const dstChain = chainInputs[hubChain]!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })
})
