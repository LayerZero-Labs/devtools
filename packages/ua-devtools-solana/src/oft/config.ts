import {
    type OmniVector,
    type CreateTransactionsFromOmniEdges,
    formatOmniVector,
    createConfigureEdges,
    createConfigureMultiple,
} from '@layerzerolabs/devtools'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { endpointIdToChainType, ChainType } from '@layerzerolabs/lz-definitions'
import type { IOApp, OAppConfigurator, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { OFT } from './sdk'

const createOFTLogger = () => createModuleLogger('OFT')

/**
 * Helper function that checks whether a vector originates from a Solana network
 *
 * @param {OmniVector} vector
 * @returns {boolean}
 */
const isVectorFromSolana = (vector: OmniVector): boolean => endpointIdToChainType(vector.from.eid) === ChainType.SOLANA

/**
 * Helper function that wraps a edge configuration function,
 * only executing it for edges that originate in Solana
 *
 * @param {CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp>} createTransactions
 * @returns {CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp>}
 */
const onlyEdgesFromSolana = (
    createTransactions: CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp>
): CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp> => {
    const logger = createOFTLogger()

    return (edge, sdk, graph, createSdk) => {
        if (!isVectorFromSolana(edge.vector)) {
            return logger.verbose(`Ignoring connection ${formatOmniVector(edge.vector)}`), undefined
        }

        return createTransactions(edge, sdk, graph, createSdk)
    }
}

export const initNonce: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(({ vector }, sdk) => {
        const logger = createOFTLogger()

        if (typeof (sdk as OFT).initializeNonce !== 'function') {
            return logger.warn(`Could not find initializeNonce() method on OFT SDK, skipping`), undefined
        }

        return (sdk as OFT).initializeNonce(vector.to.eid, vector.to.address)
    })
)

export const initSendLibrary: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(({ vector }, sdk) => {
        const logger = createOFTLogger()

        if (typeof (sdk as OFT).initializeSendLibrary !== 'function') {
            return logger.warn(`Could not find initializeSendLibrary() method on OFT SDK, skipping`), undefined
        }

        return (sdk as OFT).initializeSendLibrary(vector.to.eid)
    })
)

export const initReceiveLibrary: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(({ vector }, sdk) => {
        const logger = createOFTLogger()

        if (typeof (sdk as OFT).initializeReceiveLibrary !== 'function') {
            return logger.warn(`Could not find initializeReceiveLibrary() method on OFT SDK, skipping`), undefined
        }

        return (sdk as OFT).initializeReceiveLibrary(vector.to.eid)
    })
)

export const initOFTConfig: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(({ vector, config }, sdk) => {
        const logger = createOFTLogger()

        if (typeof (sdk as OFT).initializeOAppConfig !== 'function') {
            return logger.warn(`Could not find initializeOAppConfig() method on OFT SDK, skipping`), undefined
        }

        return (sdk as OFT).initializeOAppConfig(vector.to.eid, config?.sendLibrary)
    })
)

export const initOFTAccounts = createConfigureMultiple(initNonce, initSendLibrary, initReceiveLibrary, initOFTConfig)
