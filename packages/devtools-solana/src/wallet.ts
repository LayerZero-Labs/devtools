import { Keypair } from '@solana/web3.js'
import { getKeypairFromEnvironment, getKeypairFromFile } from '@solana-developers/helpers'
import { createLogger, promptToContinue } from '@layerzerolabs/io-devtools'

async function safeGetKeypairDefaultPath(filePath?: string) {
    try {
        return await getKeypairFromFile(filePath)
    } catch (error) {
        if (error instanceof Error && error.message.includes('Could not read keypair')) {
            return undefined
        }
        throw error
    }
}

/**
 * Loads a Solana {@link Keypair} from the environment or default locations.
 *
 * The function checks `SOLANA_PRIVATE_KEY`, `SOLANA_KEYPAIR_PATH`, and
 * finally `~/.config/solana/id.json` (if present). When `readOnly` is true,
 * a random ephemeral keypair is generated instead.
 */
export const getSolanaKeypair = async (readOnly = false): Promise<Keypair> => {
    const logger = createLogger()

    if (readOnly) {
        logger.info('Read-only mode: Using ephemeral keypair.')
        return Keypair.generate()
    }

    const keypairEnvPrivate = process.env.SOLANA_PRIVATE_KEY
        ? getKeypairFromEnvironment('SOLANA_PRIVATE_KEY')
        : undefined
    const keypairEnvPath = process.env.SOLANA_KEYPAIR_PATH
        ? await getKeypairFromFile(process.env.SOLANA_KEYPAIR_PATH)
        : undefined
    const keypairDefaultPath = await safeGetKeypairDefaultPath()

    if (!keypairEnvPrivate && !keypairEnvPath && !keypairDefaultPath) {
        throw new Error(
            'No Solana keypair found. Provide SOLANA_PRIVATE_KEY, SOLANA_KEYPAIR_PATH, or place a valid keypair at ~/.config/solana/id.json.'
        )
    }

    if (keypairEnvPrivate && keypairEnvPath) {
        if (keypairEnvPrivate.publicKey.equals(keypairEnvPath.publicKey)) {
            logger.info('Both SOLANA_PRIVATE_KEY and SOLANA_KEYPAIR_PATH match. Using environment-based keypair.')
            return keypairEnvPrivate
        }
        throw new Error(`Conflict: SOLANA_PRIVATE_KEY and SOLANA_KEYPAIR_PATH are different keypairs.`)
    }

    if (keypairEnvPrivate) {
        logger.info(`Using Solana keypair from SOLANA_PRIVATE_KEY => ${keypairEnvPrivate.publicKey.toBase58()}`)
        return keypairEnvPrivate
    }

    if (keypairEnvPath) {
        logger.info(
            `Using Solana keypair from SOLANA_KEYPAIR_PATH (${process.env.SOLANA_KEYPAIR_PATH}) => ${keypairEnvPath.publicKey.toBase58()}`
        )
        return keypairEnvPath
    }

    logger.info(
        `No environment-based keypair found. Found keypair at default path => ${keypairDefaultPath!.publicKey.toBase58()}`
    )
    const doContinue = await promptToContinue(
        `Defaulting to ~/.config/solana/id.json with address ${keypairDefaultPath!.publicKey.toBase58()}. Use this keypair?`
    )
    if (!doContinue) {
        process.exit(1)
    }

    return keypairDefaultPath!
}
