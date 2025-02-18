import { AsyncRetriable, type OmniAddress, type OmniTransaction, tapError } from '@layerzerolabs/devtools'

import type { IERC20 } from './types'
import { Ownable } from '@/ownable/sdk'
import { z } from 'zod'
import { BigNumberishBigIntSchema, BigNumberishNumberSchema } from '@layerzerolabs/devtools-evm'

export class ERC20 extends Ownable implements IERC20 {
    @AsyncRetriable()
    async getDecimals(): Promise<number> {
        this.logger.verbose(`Getting token decimals`)

        const decimals = await tapError(
            () => this.contract.contract.decimals(),
            (error) => (this.logger.error(`Failed to get token decimals: ${error}`), undefined)
        )

        return BigNumberishNumberSchema.parse(decimals)
    }

    @AsyncRetriable()
    async getName(): Promise<string> {
        this.logger.verbose(`Getting token name`)

        const name = await tapError(
            () => this.contract.contract.name(),
            (error) => (this.logger.error(`Failed to get token name: ${error}`), undefined)
        )

        return NameSchema.parse(name)
    }

    @AsyncRetriable()
    async getSymbol(): Promise<string> {
        this.logger.verbose(`Getting token symbol`)

        const symbol = await tapError(
            () => this.contract.contract.symbol(),
            (error) => (this.logger.error(`Failed to get token symbol: ${error}`), undefined)
        )

        return SymbolSchema.parse(symbol)
    }

    @AsyncRetriable()
    async getBalanceOf(user: OmniAddress): Promise<bigint> {
        this.logger.verbose(`Getting balance of ${user}`)

        const allowance = await this.contract.contract.balanceOf(user)

        return BigNumberishBigIntSchema.parse(allowance)
    }

    @AsyncRetriable()
    async getAllowance(owner: OmniAddress, spender: OmniAddress): Promise<bigint> {
        this.logger.verbose(`Getting allowance of ${spender} allowed by ${owner}`)

        const allowance = await this.contract.contract.allowance(owner, spender)

        return BigNumberishBigIntSchema.parse(allowance)
    }

    async approve(spender: OmniAddress, amount: bigint): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('approve', [spender, amount])

        return {
            ...this.createTransaction(data),
            description: `Approving ${spender} to spend ${amount} tokens`,
        }
    }

    async mint(account: OmniAddress, amount: bigint): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('mint', [account, amount])

        return {
            ...this.createTransaction(data),
            description: `Minting ${amount} tokens to ${account}`,
        }
    }
}

const NameSchema = z.string()

const SymbolSchema = z.string()
