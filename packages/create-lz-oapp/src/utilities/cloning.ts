import { Config } from '@/types'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { mkdtemp, rm } from 'fs/promises'
import { join, resolve } from 'path'
import { clone } from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import fs from 'fs/promises'

export const cloneExample = async ({ example, destination }: Config) => {
    const logger = createModuleLogger('cloning')
    logger.verbose(`Cloning example ${example.label} from ${example.repository} to ${destination}`)

    logger.verbose(`Creating temporary directory for cloning`)
    const dir = await mkdtemp('devtools-')
    logger.verbose(`Created temporary directory for cloning in ${dir}`)

    try {
        logger.verbose(`Cloning ${example.repository} to temporary directory ${dir}`)

        // First we clone the whole thing into a temporary directory
        await clone({
            url: example.repository,
            ref: example.ref,
            dir,
            fs,
            http,
            depth: 1,
        })

        const exampleDir = example.directory ? join(dir, example.directory) : dir
        logger.verbose(`Copying example code from ${exampleDir} to ${destination}`)

        // Then we copy the example subdirectory into the destination
        await fs.rename(exampleDir, resolve(destination))

        logger.verbose(`Copied example code from ${exampleDir} to ${destination}`)

        logger.verbose(`Cleaning up`)

        // Then we cleanup what we don't want to be included
        await cleanupExample(destination)
    } catch (error: unknown) {
        try {
            // Let's make sure to clean up after us
            await rm(destination, { recursive: true, force: true })
        } catch (error) {
            logger.warn(
                `Failed to clean up destination directory ${destination} after a failed cloning attempt: ${error}`
            )
        }

        if (error instanceof Error && 'code' in error) {
            switch (error.code) {
                case 'BAD_SRC':
                    throw new BadGitRefError()

                case 'DEST_NOT_EMPTY':
                    throw new DestinationNotEmptyError()

                case 'ENOENT':
                case 'MISSING_REF':
                    throw new MissingGitRefError()

                case 'COULD_NOT_DOWNLOAD':
                    throw new DownloadError()
            }
        }

        if (error instanceof Error) {
            if (/fatal: couldn't find remote ref/.test(error.message ?? '')) {
                throw new MissingGitRefError()
            }
        }

        throw new CloningError(`Unknown error: ${error}`)
    } finally {
        try {
            // We need to clean up the temporary directory
            rm(dir, { recursive: true, force: true })
        } catch (error) {
            logger.verbose(`Failed to clean up temporary directory ${dir}: ${error}`)
        }
    }
}

// List of files to be removed after the cloning is done
const IGNORED_FILES = ['CHANGELOG.md', 'turbo.json']

/**
 * Helper utility that removes the files we don't want to include in the final project
 * after the cloning is done
 *
 * @param {string} destination The directory containing the cloned project
 */
const cleanupExample = async (destination: string) => {
    for (const fileName of IGNORED_FILES) {
        const filePath = resolve(destination, fileName)

        try {
            await rm(filePath, { force: true })
        } catch {
            // If the cleanup fails let's just do nothing for now
        }
    }
}

export class CloningError extends Error {
    constructor(message: string = 'Unknown error during example cloning') {
        super(message)
    }
}

export class DestinationNotEmptyError extends CloningError {
    constructor(message: string = 'Project destination directory is not empty') {
        super(message)
    }
}

export class MissingGitRefError extends CloningError {
    constructor(message: string = 'Could not find the example repository or branch') {
        super(message)
    }
}

export class BadGitRefError extends CloningError {
    constructor(message: string = 'Malformed repository URL') {
        super(message)
    }
}

export class DownloadError extends CloningError {
    constructor(message: string = 'Could not download the example from repository') {
        super(message)
    }
}
