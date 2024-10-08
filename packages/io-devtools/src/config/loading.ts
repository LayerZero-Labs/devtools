import { importDefault, isFile, isReadable } from '@/filesystem/filesystem'
import { createModuleLogger } from '@/stdio/logger'
import { printZodErrors } from '@/stdio/printer'
import { resolve } from 'path'
import { z } from 'zod'

/**
 * @deprecated Please use `createConfigLoadFlow` from `@layerzerolabs/devtools`
 */
export const createConfigLoader =
    <TConfig>(schema: z.ZodSchema<TConfig, z.ZodTypeDef, unknown>, logger = createModuleLogger('config loader')) =>
    async (path: string): Promise<TConfig> => {
        const absolutePath = resolve(path)
        logger.verbose(`Resolved config file location for '${path}': '${absolutePath}'`)

        // First we check that the config file is indeed there and we can read it
        logger.verbose(`Checking config file '${absolutePath}' for existence & readability`)
        const isConfigReadable = isFile(absolutePath) && isReadable(absolutePath)
        if (!isConfigReadable) {
            throw new Error(
                `Unable to read config file '${path}'. Check that the file exists and is readable to your terminal user`
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
            throw new Error(`Unable to read config file '${path}': ${error}`)
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
                throw new Error(`Got an exception while executing config funtion from file '${path}': ${error}`)
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

        const configParseResult = await schema.safeParseAsync(rawConfigMaterialized)
        if (configParseResult.success === false) {
            const userFriendlyErrors = printZodErrors(configParseResult.error)

            throw new Error(
                `Config from file '${path}' is malformed. Please fix the following errors:\n\n${userFriendlyErrors}`
            )
        }

        return configParseResult.data
    }
