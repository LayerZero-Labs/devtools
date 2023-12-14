import { importDefault, isFile, isReadable } from '@/filesystem/filesystem'
import { createModuleLogger } from '@/stdio/logger'
import { printZodErrors } from '@/stdio/printer'
import { z } from 'zod'

export const createConfigLoader =
    <TConfig>(schema: z.ZodSchema<TConfig>, logger = createModuleLogger('config loader')) =>
    async (path: string): Promise<TConfig> => {
        // First we check that the config file is indeed there and we can read it
        logger.verbose(`Checking config file '${path}' for existence & readability`)
        const isConfigReadable = isFile(path) && isReadable(path)
        if (!isConfigReadable) {
            throw new Error(
                `Unable to read config file '${path}'. Check that the file exists and is readable to your terminal user`
            )
        }

        // Keep talking to the user
        logger.verbose(`Config file '${path}' exists & is readable`)

        // Now let's see if we can load the config file
        let rawConfig: unknown
        try {
            logger.verbose(`Loading config file '${path}'`)

            rawConfig = await importDefault(path)
        } catch (error) {
            throw new Error(`Unable to read config file '${path}': ${error}`)
        }

        logger.verbose(`Loaded config file '${path}'`)

        // It's time to make sure that the config is not malformed
        //
        // At this stage we are only interested in the shape of the data,
        // we are not checking whether the information makes sense (e.g.
        // whether there are no missing nodes etc)
        logger.verbose(`Validating the structure of config file '${path}'`)
        const configParseResult = schema.safeParse(rawConfig)
        if (configParseResult.success === false) {
            const userFriendlyErrors = printZodErrors(configParseResult.error)

            throw new Error(
                `Config from file '${path}' is malformed. Please fix the following errors:\n\n${userFriendlyErrors}`
            )
        }

        return configParseResult.data
    }
