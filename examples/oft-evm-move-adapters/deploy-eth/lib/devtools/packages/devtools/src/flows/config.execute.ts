import { createLogger, type Logger, printJson } from '@layerzerolabs/io-devtools'
import { OmniGraphBuilder, type Configurator, type IOmniSDK, type OmniGraph, type OmniSDKFactory } from '@/omnigraph'
import type { OmniTransaction } from '@/transactions'

export interface CreateConfigExecuteFlowArgs<TOmniGraph extends OmniGraph = OmniGraph, TSDK = IOmniSDK> {
    configurator: Configurator<TOmniGraph, TSDK>
    sdkFactory: OmniSDKFactory<TSDK>
    logger?: Logger
}

export interface ConfigExecuteFlowArgs<TOmniGraph extends OmniGraph = OmniGraph> {
    graph: TOmniGraph
}

export type ConfigExecuteFlow<TOmniGraph extends OmniGraph = OmniGraph> = (
    args: ConfigExecuteFlowArgs<TOmniGraph>
) => Promise<OmniTransaction[]>

export const createConfigExecuteFlow =
    <TOmniGraph extends OmniGraph = OmniGraph, TSDK = IOmniSDK>({
        logger = createLogger(),
        configurator,
        sdkFactory,
    }: CreateConfigExecuteFlowArgs<TOmniGraph, TSDK>): ConfigExecuteFlow<TOmniGraph> =>
    async ({ graph }: ConfigExecuteFlowArgs<TOmniGraph>): Promise<OmniTransaction[]> => {
        logger.verbose(`Executing graph:\n\n${printJson(graph)}`)

        // As an additional step, even though this task is getting called
        // from controlled and type-safe environments (for now),
        // we pass the graph through a builder
        //
        // We can discard the output, this step is only here to ensure that the graph is valid
        // (this) call would throw if the graph was not valid
        try {
            logger.verbose(`Validating graph`)

            OmniGraphBuilder.fromGraph(graph)
        } catch (error) {
            logger.verbose(`Provided graph does not look valid: ${error}`)

            throw new Error(`An error occurred while validating OmniGraph configuration: ${error}`)
        }

        // The only thing this task does is it uses the provided arguments
        // to compile a list of OmniTransactions
        try {
            return await configurator(graph, sdkFactory)
        } catch (error) {
            logger.verbose(`Encountered an error: ${error}`)

            throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
        }
    }
