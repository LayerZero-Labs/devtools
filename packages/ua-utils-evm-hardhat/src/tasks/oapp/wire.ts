import { task, types } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_WIRE_OAPP } from '@/constants/tasks'
import { isFile, isReadable, promptToContinue } from '@layerzerolabs/io-utils'
import { OAppOmniGraphHardhat, OAppOmniGraphHardhatSchema } from '@/oapp'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

const action: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const logger = createLogger()

    // First we check that the config file is indeed there and we can read it
    logger.debug(`Checking config file '${oappConfigPath}' for existence & readability`)
    const isConfigReadable = isFile(oappConfigPath) && isReadable(oappConfigPath)
    if (!isConfigReadable) {
        throw new Error(
            `Unable to read config file '${oappConfigPath}'. Check that the file exists and is readable to your terminal user`
        )
    }

    // Keep talking to the user
    logger.debug(`Config file '${oappConfigPath}' exists & is readable`)

    // Now let's see if we can load the config file
    let rawConfig: unknown
    try {
        logger.debug(`Loading config file '${oappConfigPath}'`)

        rawConfig = require(oappConfigPath)
    } catch (error) {
        throw new Error(`Unable to read config file '${oappConfigPath}': ${error}`)
    }

    logger.debug(`Loaded config file '${oappConfigPath}'`)

    // It's time to make sure that the config is not malformed
    //
    // At this stage we are only interested in the shape of the data,
    // we are not checking whether the information makes sense (e.g.
    // whether there are no missing nodes etc)
    logger.debug(`Validating the structure of config file '${oappConfigPath}'`)
    const configParseResult = OAppOmniGraphHardhatSchema.safeParse(rawConfig)
    if (configParseResult.success === false) {
        // FIXME Error formatting
        const errors = configParseResult.error.flatten(
            (issue) => `Property '${issue.path.join('.') ?? '[root]'}': ${issue.message}`
        )
        const formErrors = errors.formErrors.map((error) => `- ${error}`).join(`\n`)
        const fieldErrors = Object.entries(errors.fieldErrors).map(
            ([field, errors]) => `\n${field}:\n${errors.map((error) => `- ${error}`).join(`\n`)}`
        )
        const allErrors = [...formErrors, fieldErrors]

        throw new Error(
            `Config from file '${oappConfigPath}' is malformed. Please fix the following errors:\n\n${allErrors}`
        )
    }

    // At this point we have a correctly typed config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const config: OAppOmniGraphHardhat = configParseResult.data

    const go = await promptToContinue()
    if (!go) {
        return undefined
    }

    return []
}
task(TASK_LZ_WIRE_OAPP, 'Wire LayerZero OApp')
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.string)
    .setAction(action)
