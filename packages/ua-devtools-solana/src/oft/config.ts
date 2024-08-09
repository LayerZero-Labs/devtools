import {
    type OmniVector,
    type CreateTransactionsFromOmniEdges,
    formatOmniVector,
    createConfigureEdges,
    createConfigureMultiple,
    OmniSDKFactory,
    OmniPoint,
} from '@layerzerolabs/devtools'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { isOmniPointOnSolana } from '@layerzerolabs/devtools-solana'
import type { IOApp, OAppConfigurator, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { OFT } from './sdk'

const createOFTLogger = () => createModuleLogger('OFT')

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

export const initNonce: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(async ({ vector: { to } }, sdk: OFT) => {
        const logger = createOFTLogger()

        if (typeof sdk.initializeNonce !== 'function') {
            return logger.warn(`Could not find initializeNonce() method on OFT SDK, skipping`), undefined
        }

        if (typeof sdk.isNonceInitialized !== 'function') {
            return logger.warn(`Could not find isNonceInitialized() method on OFT SDK, skipping`), undefined
        }

        const isInitialized = await sdk.isNonceInitialized(to.eid, to.address)
        return isInitialized ? undefined : sdk.initializeNonce(to.eid, to.address)
    })
)

export const initSendLibrary: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(async ({ vector: { to } }, sdk) => {
        const logger = createOFTLogger()

        if (typeof sdk.initializeSendLibrary !== 'function') {
            return logger.warn(`Could not find initializeSendLibrary() method on OFT SDK, skipping`), undefined
        }

        if (typeof sdk.isSendLibraryInitialized !== 'function') {
            return logger.warn(`Could not find isSendLibraryInitialized() method on OFT SDK, skipping`), undefined
        }

        const isInitialized = await sdk.isSendLibraryInitialized(to.eid)
        return isInitialized ? undefined : sdk.initializeSendLibrary(to.eid)
    })
)

export const initReceiveLibrary: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(async ({ vector: { to } }, sdk) => {
        const logger = createOFTLogger()

        if (typeof sdk.initializeReceiveLibrary !== 'function') {
            return logger.warn(`Could not find initializeReceiveLibrary() method on OFT SDK, skipping`), undefined
        }

        if (typeof sdk.isReceiveLibraryInitialized !== 'function') {
            return logger.warn(`Could not find isReceiveLibraryInitialized() method on OFT SDK, skipping`), undefined
        }

        const isInitialized = await sdk.isReceiveLibraryInitialized(to.eid)
        return isInitialized ? undefined : sdk.initializeReceiveLibrary(to.eid)
    })
)

export const initOFTConfig: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(async ({ vector: { to }, config }, sdk) => {
        const logger = createOFTLogger()

        if (typeof sdk.initializeOAppConfig !== 'function') {
            return logger.warn(`Could not find initializeOAppConfig() method on OFT SDK, skipping`), undefined
        }

        if (typeof sdk.isOAppConfigInitialized !== 'function') {
            return logger.warn(`Could not find isOAppConfigInitialized() method on OFT SDK, skipping`), undefined
        }

        const isInitialized = await sdk.isOAppConfigInitialized(to.eid)
        return isInitialized ? undefined : sdk.initializeOAppConfig(to.eid, config?.sendLibrary)
    })
)

export const initOFTAccounts = createConfigureMultiple(initNonce, initSendLibrary, initReceiveLibrary, initOFTConfig)
