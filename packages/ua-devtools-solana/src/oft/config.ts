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

export const initConfig: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(async ({ vector: { to } }, sdk) => {
        if (typeof sdk.initConfig !== 'function') {
            return createOFTLogger().warn(`Could not find initConfig() method on OFT SDK, skipping`), undefined
        }
        return sdk.initConfig(to.eid)
    })
)

export const addRemote: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(async ({ vector: { to } }, sdk: OFT) => {
        const logger = createOFTLogger()

        if (typeof sdk.addRemote !== 'function') {
            return logger.warn(`Could not find addRemote() method on OFT SDK, skipping`), undefined
        }

        return sdk.addRemote(to.eid)
    })
)

export const setPeer: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(async ({ vector: { to } }, sdk: OFT) => {
        const logger = createOFTLogger()

        if (typeof sdk.initPeer !== 'function') {
            return logger.warn(`Could not find setPeer() method on OFT SDK, skipping`), undefined
        }

        return sdk.initPeer(to.eid, to.address)
    })
)

export const initOFTAccounts = createConfigureMultiple(initConfig, addRemote, setPeer)
