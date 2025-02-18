import {
    type OmniVector,
    type CreateTransactionsFromOmniEdges,
    formatOmniVector,
    createConfigureEdges,
    createConfigureMultiple,
    OmniSDKFactory,
    OmniPoint,
} from '@layerzerolabs/devtools'
import { createModuleLogger, createWithAsyncLogger } from '@layerzerolabs/io-devtools'
import { isOmniPointOnSolana } from '@layerzerolabs/devtools-solana'
import type { IOApp, OAppConfigurator, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { OFT } from './sdk'

const createOFTLogger = () => createModuleLogger('OFT')
const withOFTLogger = createWithAsyncLogger(createOFTLogger)

/**
 * Helper function that checks whether a vector originates from a Solana network
 *
 * @param {OmniVector} vector
 * @returns {boolean}
 */
const isVectorFromSolana = (vector: OmniVector): boolean => isOmniPointOnSolana(vector.from)

/**
 * Helper function that wraps a edge configuration function,
 * only executing it for edges that originate in Solana
 *
 * @param {CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp>} createTransactions
 * @returns {CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp>}
 */
const onlyEdgesFromSolana = (
    createTransactions: CreateTransactionsFromOmniEdges<OAppOmniGraph, OFT>
): CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp> => {
    const logger = createOFTLogger()

    return (edge, sdk, graph, createSdk) => {
        if (!isVectorFromSolana(edge.vector)) {
            return logger.verbose(`Ignoring connection ${formatOmniVector(edge.vector)}`), undefined
        }

        return createTransactions(edge, sdk as OFT, graph, createSdk as OmniSDKFactory<OFT, OmniPoint>)
    }
}

export const initConfig: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(
        withOFTLogger(async ({ vector: { to } }, sdk) => {
            const logger = createOFTLogger()
            if (typeof sdk.sendConfigIsInitialized !== 'function') {
                return logger.warn(`Could not find sendConfigIsInitialized() method on OFT SDK, skipping`), undefined
            }
            if (typeof sdk.initConfig !== 'function') {
                return logger.warn(`Could not find initConfig() method on OFT SDK, skipping`), undefined
            }

            logger.verbose(`Checking if the sendConfig for ${to.eid} ${to.address} is initialized`)

            const isInitialized = await sdk.sendConfigIsInitialized(to.eid)
            if (isInitialized) {
                return logger.verbose(`sendConfig for ${to.eid} ${to.address} is already initialized`), undefined
            }
            logger.verbose(`Initializing sendConfig for ${to.eid} ${to.address}`)
            return sdk.initConfig(to.eid)
        })
    )
)

export const initOFTAccounts = createConfigureMultiple(initConfig)
