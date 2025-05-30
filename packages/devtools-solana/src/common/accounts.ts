import { Factory, mapError, OmniAddress } from '@layerzerolabs/devtools'
import { createModuleLogger, Logger, printJson } from '@layerzerolabs/io-devtools'
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import { backOff } from 'exponential-backoff'

export type GetAccountInfo = Factory<[OmniAddress], AccountInfo<Buffer> | undefined>

export const createGetAccountInfo =
    (connection: Connection, logger: Logger = createModuleLogger('Solana account info')): GetAccountInfo =>
    async (account: OmniAddress): Promise<AccountInfo<Buffer> | undefined> => {
        logger.debug(`Getting account info for ${account}`)

        const accountInfo = await mapError(
            async () => connection.getAccountInfo(new PublicKey(account)),
            (error) => new Error(`Failed to get account info for ${account}: ${error}`)
        )

        return logger.debug(`Got account info for ${account}:\n\n${printJson(accountInfo)}`), accountInfo ?? undefined
    }

/**
 * Ensures a Solana account exists by retrying the lookup a few times.
 *
 * This is useful right after creating an account where propagation may be slow.
 */
export const assertAccountInitialized = async (connection: Connection, publicKey: PublicKey) =>
    backOff(
        async () => {
            const accountInfo = await connection.getAccountInfo(publicKey)
            if (!accountInfo) {
                throw new Error('Account not found')
            }
            return accountInfo
        },
        { maxDelay: 30000, numOfAttempts: 10, startingDelay: 5000 }
    )
