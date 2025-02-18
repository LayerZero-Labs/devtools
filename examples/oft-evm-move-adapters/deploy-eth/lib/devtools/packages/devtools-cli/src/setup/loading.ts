import { createModuleLogger, importDefault, isFile, isReadable, printZodErrors } from '@layerzerolabs/io-devtools'
import { resolve } from 'path'
import { CLISetup } from '@/types'
import { CLISetupSchema } from './schema'

export const createSetupLoader =
    (logger = createModuleLogger('setup loader')) =>
    async (path: string): Promise<CLISetup> => {
        const absolutePath = resolve(path)
        logger.verbose(`Resolved setup file location for '${path}': '${absolutePath}'`)

        // First we check that the config file is indeed there and we can read it
        logger.verbose(`Checking setup file '${absolutePath}' for existence & readability`)
        const isConfigReadable = isFile(absolutePath) && isReadable(absolutePath)
        if (!isConfigReadable) {
            throw new Error(
                `Unable to read setup file '${path}'. Check that the file exists and is readable to your terminal user`
            )
        }

        // Keep talking to the user
        logger.verbose(`Setup file '${absolutePath}' exists & is readable`)

        // Now let's see if we can load the config file
        let rawSetup: unknown
        try {
            logger.verbose(`Loading setup file '${absolutePath}'`)

            rawSetup = await importDefault(absolutePath)
        } catch (error) {
            throw new Error(`Unable to read setup file '${path}': ${error}`)
        }

        logger.verbose(`Loaded setup file '${absolutePath}'`)

        // Now let's check whether the setup file contains a function
        //
        // If so, we'll execute this function and will expect a setup as a result
        let rawSetupMaterialized: unknown
        if (typeof rawSetup === 'function') {
            logger.verbose(`Executing setup function from setup file '${absolutePath}'`)

            try {
                rawSetupMaterialized = await rawSetup()
            } catch (error) {
                throw new Error(`Got an exception while executing setup funtion from file '${path}': ${error}`)
            }
        } else {
            logger.verbose(`Using exported value from setup file '${absolutePath}'`)
            rawSetupMaterialized = rawSetup
        }

        // It's time to make sure that the setup file is not malformed
        //
        // At this stage we are only interested in the shape of the data,
        // we are not checking whether the information makes sense (e.g.
        // whether the functions return sensible values)
        logger.verbose(`Validating the structure of setup file '${absolutePath}'`)

        const setupParseResult = CLISetupSchema.safeParse(rawSetupMaterialized)
        if (setupParseResult.success === false) {
            const userFriendlyErrors = printZodErrors(setupParseResult.error)

            throw new Error(
                `Setup from file '${path}' is malformed. Please fix the following errors:\n\n${userFriendlyErrors}`
            )
        }

        return setupParseResult.data
    }
