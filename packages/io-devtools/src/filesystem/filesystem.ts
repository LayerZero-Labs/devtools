import { createModuleLogger } from '@/stdio/logger'
import { accessSync, constants, lstatSync } from 'fs'

export const isDirectory = (path: string): boolean => {
    try {
        return lstatSync(path).isDirectory()
    } catch {
        return false
    }
}

export const isFile = (path: string): boolean => {
    try {
        return lstatSync(path).isFile()
    } catch {
        return false
    }
}

export const isReadable = (path: string): boolean => {
    try {
        return accessSync(path, constants.R_OK), true
    } catch {
        return false
    }
}

/**
 * CJS/ESM interoperable utility for importing JS/TS/JSON files
 *
 * This utility is not safe in a sense that it will not check for file existence
 * before trying to import it, consumers need to do that
 *
 * @param {string} path
 * @returns {unknown} imported module
 */
export const importDefault = async (path: string): Promise<unknown> => {
    const logger = createModuleLogger('filesystem')

    // Let's use a dynamic import first
    //
    // This will not work in new node versions without experimental ESM module support
    try {
        logger.debug(`Importing default from '${path}' using dynamic import`)
        const result = await import(path)

        if (result != null && 'default' in result) {
            return logger.debug(`Found default in '${path}' using dynamic import`), result.default
        }

        // If not let's just return the whole export
        return logger.debug(`Did not find default in '${path}' using dynamic import, returning the whole thing`), result
    } catch (error) {
        logger.debug(`Failed to import from '${path}' using dynamic import: ${error}`)
    }

    // If dynamic import fails, let's use good ol' require
    try {
        logger.debug(`Importing default from '${path}' using require`)
        const result = await require(path)

        if (result != null && result.__esModule) {
            return logger.debug(`Found default in '${path}' using require`), result.default
        }

        // If not let's just return the whole export
        return logger.debug(`Did not find default in '${path}' using require, returning the whole thing`), result
    } catch (error) {
        logger.debug(`Failed to import from '${path}' using require: ${error}`)

        // We'll just rethrow the second error
        throw error
    }
}
