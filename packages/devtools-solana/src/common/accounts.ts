import { Factory, mapError, OmniAddress } from '@layerzerolabs/devtools'
import { createModuleLogger, Logger, printJson } from '@layerzerolabs/io-devtools'
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'

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
