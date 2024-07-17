import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { resolve } from 'path'

export const setupTypescript = (tsConfigPath?: string): void => {
    const logger = createModuleLogger('TypeScript support')

    try {
        require.resolve('typescript')
    } catch {
        return logger.debug(`typescript module not available`), undefined
    }

    try {
        require.resolve('ts-node')
    } catch {
        return logger.debug(`ts-node module not available`), undefined
    }

    // In case a custom tsconfig is required, we specify it using an env variable
    if (tsConfigPath !== undefined) {
        logger.debug(`Using tsconfig from ${tsConfigPath} (${resolve(tsConfigPath)})`)

        process.env.TS_NODE_PROJECT = resolve(tsConfigPath)
    }

    if (process.env.TS_NODE_FILES === undefined) {
        process.env.TS_NODE_FILES = 'true'
    }

    try {
        // tsup will optimize requires if string lterals are used directly in require()
        //
        // So require('ts-node/register') would result in ts-node being bundled with the module
        const tsNode = 'ts-node/register/transpile-only'

        require(tsNode)
    } catch (error) {
        console.error(error)
        return logger.debug(`Failed to register ts-node: ${error}`), undefined
    }
}
