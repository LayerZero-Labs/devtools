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
import { isOmniPointOnStarknet } from '@layerzerolabs/devtools-starknet'
import type { IOApp, OAppConfigurator, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { OFT } from './sdk'

const createOFTLogger = () => createModuleLogger('OFT')
const withOFTLogger = createWithAsyncLogger(createOFTLogger)

const isVectorFromStarknet = (vector: OmniVector): boolean => isOmniPointOnStarknet(vector.from)

const onlyEdgesFromStarknet = (
    createTransactions: CreateTransactionsFromOmniEdges<OAppOmniGraph, OFT>
): CreateTransactionsFromOmniEdges<OAppOmniGraph, IOApp> => {
    const logger = createOFTLogger()

    return (edge, sdk, graph, createSdk) => {
        if (!isVectorFromStarknet(edge.vector)) {
            return logger.verbose(`Ignoring connection ${formatOmniVector(edge.vector)}`), undefined
        }

        return createTransactions(edge, sdk as OFT, graph, createSdk as OmniSDKFactory<OFT, OmniPoint>)
    }
}

export const initConfig: OAppConfigurator = createConfigureEdges(
    onlyEdgesFromStarknet(
        withOFTLogger(async () => {
            const logger = createOFTLogger()
            logger.warn('Starknet OFT initConfig is not implemented yet')
            return undefined
        })
    )
)

export const initOFTAccounts = createConfigureMultiple(initConfig)
