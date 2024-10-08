import { createLogger, importDefault, isFile, isReadable, Logger, printZodErrors } from '@layerzerolabs/io-devtools'
import type { SafeParseReturnType, ZodType, ZodTypeDef } from 'zod'
import type { OmniGraph } from '@/omnigraph'
import { resolve } from 'path'

export interface CreateConfigLoadFlowArgs<TOmniGraph = OmniGraph> {
    configSchema: ZodType<TOmniGraph, ZodTypeDef, unknown>
    logger?: Logger
}

export interface ConfigLoadFlowArgs {
    configPath: string
}

export type ConfigLoadFlow<TOmniGraph = OmniGraph> = (args: ConfigLoadFlowArgs) => Promise<TOmniGraph>

/**
 * A flow that loads a configuration file from `configPath` and validates it against a `configSchema`.
 *
 * The schema is responsible for any transformations that need to be done to turn the raw config into an `OmniGraph`
 * (e.g. transforming from hardhat-specific format).
 *
 * The config file can be in one of the supoorted formats:
 *
 * - JS
 * - TS
 * - JSON
 *
 * For the JS and TS versions, the config file can either export the config object directly
 * or can export a function that returns the config object (or a promise of the config object)
 *
 * @template TOmniGraph
 * @param ConfigLoadFlowArgs
 * @returns {Promise<TOmniGraph>}
 */
export const createConfigLoadFlow =
    <TOmniGraph = OmniGraph>({
        configSchema,
        logger = createLogger(),
    }: CreateConfigLoadFlowArgs<TOmniGraph>): ConfigLoadFlow<TOmniGraph> =>
    async ({ configPath }): Promise<TOmniGraph> => {
        logger.verbose(`Loading config from ${configPath}`)

        const absolutePath = resolve(configPath)
        logger.verbose(`Resolved config file location for '${configPath}': '${absolutePath}'`)

        // First we check that the config file is indeed there and we can read it
        logger.verbose(`Checking config file '${absolutePath}' for existence & readability`)
        const isConfigReadable = isFile(absolutePath) && isReadable(absolutePath)
        if (!isConfigReadable) {
            throw new Error(
                `Unable to read config file '${configPath}'. Check that the file exists and is readable to your terminal user`
            )
        }

        // Keep talking to the user
        logger.verbose(`Config file '${absolutePath}' exists & is readable`)

        // Now let's see if we can load the config file
        let rawConfig: unknown
        try {
            logger.verbose(`Loading config file '${absolutePath}'`)

            rawConfig = await importDefault(absolutePath)
        } catch (error) {
            throw new Error(`Unable to read config file '${configPath}': ${error}`)
        }

        logger.verbose(`Loaded config file '${absolutePath}'`)

        // Now let's check whether the config file contains a function
        //
        // If so, we'll execute this function and will expect a config as a result
        let rawConfigMaterialized: unknown
        if (typeof rawConfig === 'function') {
            logger.verbose(`Executing configuration function from config file '${absolutePath}'`)

            try {
                rawConfigMaterialized = await rawConfig()
            } catch (error) {
                throw new Error(`Got an exception while executing config funtion from file '${configPath}': ${error}`)
            }
        } else {
            logger.verbose(`Using exported value from config file '${absolutePath}'`)
            rawConfigMaterialized = rawConfig
        }

        // It's time to make sure that the config is not malformed
        //
        // At this stage we are only interested in the shape of the data,
        // we are not checking whether the information makes sense (e.g.
        // whether there are no missing nodes etc)
        logger.verbose(`Validating the structure of config file '${absolutePath}'`)

        // We'll try/catch the schema validation (even though we are using the "safe" version,
        // zod will just throw if any of the schema transformations throw)
        //
        // We do this so that we can prepend the error message with a more meaningful one
        let configParseResult: SafeParseReturnType<unknown, TOmniGraph>
        try {
            configParseResult = await configSchema.safeParseAsync(rawConfigMaterialized)
        } catch (error) {
            throw new Error(`Config from file '${configPath}' is invalid: ${error}`)
        }

        if (configParseResult.success === false) {
            const userFriendlyErrors = printZodErrors(configParseResult.error)

            throw new Error(
                `Config from file '${configPath}' is malformed. Please fix the following errors:\n\n${userFriendlyErrors}`
            )
        }

        return configParseResult.data
    }
