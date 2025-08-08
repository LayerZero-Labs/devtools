import { describe, it } from 'mocha'
import { Chain, createWalletClient, http, publicActions } from 'viem'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import { ERC20Abi } from '../../src/contracts/ERC20'

import { OVaultSyncOperations } from '../../src/types'

import { OVaultSyncMessageBuilder } from '../../src/oVaultSync'

import 'dotenv/config'

interface ChainConfig {
    eid: number
    chain: Chain
    asset: `0x${string}`
    share: `0x${string}`
    shareErc20?: `0x${string}`
    composer?: `0x${string}`
    vault?: `0x${string}`
}

const chainInputs: Record<string, ChainConfig> = {
    'base-sepolia': {
        eid: 40245,
        chain: baseSepolia,
        asset: '0x14253aC703071965Df2f211E706ec89dab034Ea4',
        share: '0x9843622e2D6941896C1c41019857ca332Cac2e79',
    },
    'arbitrum-sepolia': {
        eid: 40231,
        chain: arbitrumSepolia,
        asset: '0x79C3E533cec4Be2d91a9301967948969b1dBE14A',
        share: '0x4DecE3D89e74589efC8e23432459C95C1Ad0D864',
        shareErc20: '0xCf9434De1d9E57e46D6118386dB3A38Cf61088de',
        composer: '0x40dcBD0c323D166EC09815ae19aAF4BeC62FEC8E',
        vault: '0xCf9434De1d9E57e46D6118386dB3A38Cf61088de',
    },
} as const

const walletAddress = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`).address as `0x${string}`

const generateInput = async (
    srcChain: (typeof chainInputs)['base-sepolia'],
    dstChain: (typeof chainInputs)['base-sepolia'],
    operation: OVaultSyncOperations
) => {
    return {
        srcEid: srcChain.eid,
        hubEid: chainInputs['arbitrum-sepolia']!.eid,
        dstEid: dstChain.eid,
        walletAddress: walletAddress as `0x${string}`,
        vaultAddress: chainInputs['arbitrum-sepolia']!.vault as `0x${string}`,
        composerAddress: chainInputs['arbitrum-sepolia']!.composer as `0x${string}`,
        hubChain: arbitrumSepolia,
        sourceChain: srcChain.chain,
        operation: operation,
        amount: BigInt('100000000000000000'),
        slippage: 0.01, // 1% slippage
        oftAddress: operation === OVaultSyncOperations.DEPOSIT ? srcChain.asset : srcChain.share,
        tokenAddress: operation === OVaultSyncOperations.DEPOSIT ? srcChain.asset : srcChain.shareErc20,
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
    it('Deposit B->B->B', async () => {
        const srcChain = chainInputs['arbitrum-sepolia']!
        const dstChain = chainInputs['arbitrum-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    it('Deposit A->B->A', async () => {
        const srcChain = chainInputs['base-sepolia']!
        const dstChain = chainInputs['base-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    it('Deposit B->B->A', async () => {
        const srcChain = chainInputs['arbitrum-sepolia']!
        const dstChain = chainInputs['base-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    it('Deposit A->B->B', async () => {
        const srcChain = chainInputs['base-sepolia']!
        const dstChain = chainInputs['arbitrum-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.DEPOSIT)
    })

    /**
     * Redeem
     */

    it('Redeem B->B->B', async () => {
        const srcChain = chainInputs['arbitrum-sepolia']!
        const dstChain = chainInputs['arbitrum-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })

    it('Redeem A->B->A', async () => {
        const srcChain = chainInputs['base-sepolia']!
        const dstChain = chainInputs['base-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })

    it('Redeem B->B->A', async () => {
        const srcChain = chainInputs['arbitrum-sepolia']!
        const dstChain = chainInputs['base-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })

    it('Redeem A->B->B', async () => {
        const srcChain = chainInputs['base-sepolia']!
        const dstChain = chainInputs['arbitrum-sepolia']!

        await executeTransaction(srcChain, dstChain, OVaultSyncOperations.REDEEM)
    })
})
