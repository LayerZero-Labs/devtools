// TODO: create this in devtools/packages/ua-devtools-solana/src/counter/config.ts

import {
    type CreateTransactionsFromOmniEdges,
    OmniPoint,
    OmniSDKFactory,
    type OmniVector,
    createConfigureEdges,
    createConfigureMultiple,
    formatOmniVector,
} from '@layerzerolabs/devtools'
import { isOmniPointOnSolana } from '@layerzerolabs/devtools-solana'
import { createModuleLogger, createWithAsyncLogger } from '@layerzerolabs/io-devtools'

import { CustomOAppSDK } from './sdk'

import type { IOApp, OAppConfigurator, OAppOmniGraph } from '@layerzerolabs/ua-devtools'

const createCounterLogger = () => createModuleLogger('Counter')
const withCounterLogger = createWithAsyncLogger(createCounterLogger)

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
    createTransactions: CreateTransactionsFromOmniEdges<OAppOmniGraph, CustomOAppSDK>
): CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp> => {
    const logger = createCounterLogger()

    return (edge, sdk, graph, createSdk) => {
        if (!isVectorFromSolana(edge.vector)) {
            return logger.verbose(`Ignoring connection ${formatOmniVector(edge.vector)}`), undefined
        }

        return createTransactions(
            edge,
            sdk as CustomOAppSDK,
            graph,
            createSdk as OmniSDKFactory<CustomOAppSDK, OmniPoint>
        )
    }
}

export const initConfig: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromSolana(
        withCounterLogger(async ({ vector: { to } }, sdk) => {
            const logger = createCounterLogger()
            if (typeof sdk.sendConfigIsInitialized !== 'function') {
                return (
                    logger.warn(`Could not find sendConfigIsInitialized() method on OAppWrapperSDK SDK, skipping`),
                    undefined
                )
            }
            if (typeof sdk.initConfig !== 'function') {
                return logger.warn(`Could not find initConfig() method on OAppWrapperSDK SDK, skipping`), undefined
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

export const initOAppAccounts = createConfigureMultiple(initConfig)
