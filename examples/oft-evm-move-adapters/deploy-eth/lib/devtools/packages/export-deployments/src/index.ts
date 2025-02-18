import { isDirectorySafe, listEntriesSafe, mkdirSafe, writeFileSyncSafe } from './common/fs'
import { basename, resolve } from 'path'
import { generate as generatorTypeScript } from './generator/typescript'
import { flow, pipe } from 'fp-ts/lib/function'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { CodeGenerator, OutputFile } from './generator/types'
import { type Dirent } from 'fs'

export { OutputFile } from './generator/types'
export { generate as generatorTypeScript } from './generator/typescript'
export { generate as generatorMarkdown } from './generator/markdown'

export type IncludeDirent = (dir: Dirent) => boolean

export interface ExportDeploymentsOptions {
    deploymentsDir: string
    outDir: string
    includeDeploymentFile?: IncludeDirent
    includeNetworkDir?: IncludeDirent
    generator?: CodeGenerator
}

const alwaysTrue = () => true

/**
 * Generates TypeScript deployment summaries from hardhat-deploy deployments.
 *
 * This function is error-safe and will return a typed Either object,
 * for throwing version please use `generate`
 *
 * @returns Eitehr<Error, OutputFile[]>
 */
export const generateSafe = ({
    deploymentsDir,
    outDir,
    includeDeploymentFile = alwaysTrue,
    includeNetworkDir = alwaysTrue,
    generator = generatorTypeScript,
}: ExportDeploymentsOptions): E.Either<Error, OutputFile[]> =>
    pipe(
        // First we ensure that the output directory exists, easy
        ensureOutDir(outDir),
        // The next step is generating the individual TypeScript files
        E.flatMap((outDir) =>
            pipe(
                // Again, first we make sure the directory exists
                ensureDeploymentsDir(deploymentsDir),

                // The next step is to list all the individual deployment files
                E.flatMap(listDeploymentFiles(includeNetworkDir, includeDeploymentFile)),

                // After that we generate TypeScript representations of the deployments
                E.flatMap(generator),

                // The final step is to write the output files to the file system
                E.map(A.map(prependOutputFilePath(outDir))),
                E.tap(flow(A.map(writeFileSyncSafe), A.sequence(E.Applicative)))
            )
        )
    )

/**
 * Generates TypeScript deployment summaries from hardhat-deploy deployments.
 *
 * This function will throw an error if anything goes wrong - for stringly typed
 * version please use `generateSafe`
 *
 * @param options
 * @returns
 */
export const generate = (options: ExportDeploymentsOptions) => {
    const result = generateSafe(options)

    if (E.isLeft(result)) {
        throw result.left
    } else {
        return result.right
    }
}

/**
 * Helper utility that creates a Dirent filtering function
 * based on include/exclude lists.
 *
 * This function will handle .json file extensions internally
 * so filtering for `MyContract` and `MyContract.json` are equivalent
 *
 * @param include string[] a list of file names to include
 * @param exclude string[] a list of file names to exclude (has higher priority than include)
 *
 * @returns
 */
export const createIncludeDirent =
    (include?: string[], exclude?: string[]): IncludeDirent =>
    (dir) => {
        const nameW = dir.name
        const nameWo = basename(nameW, '.json')

        if (exclude?.includes(nameW) || exclude?.includes(nameWo)) {
            return false
        }
        if (include == null) {
            return true
        }

        return include.includes(nameW) || include.includes(nameWo)
    }

const prependOutputFilePath = (prefix: string) => (file: OutputFile) => ({
    ...file,
    path: resolve(prefix, file.path),
})

/**
 * Ensures that the output directory exists and creates one if it doesn't,
 * then returns its path
 *
 * @returns Either<Error, string>
 */
const ensureOutDir = (path: string) =>
    pipe(
        path,
        mkdirSafe,
        E.mapLeft((error) => new Error(`Unable to create output directory '${path}': ${error}`))
    )

/**
 * Ensures that the deployments directory is an existing directory
 * and returns its path
 *
 * @param path
 *
 * @returns Either<Error, string>
 */
const ensureDeploymentsDir = (path: string) =>
    pipe(
        E.right(path),
        E.tap(isDirectorySafe),
        // This might look a bit cryptic - the Boolean is just an identity
        // function for booleans, E.toError is a function that creates Error instances
        //
        // This line just means that if true is passed in, everything continues;
        // if false is passed in, everything stops with Error (that just says "false" but it's mapped later)
        E.filterOrElse(Boolean, E.toError),
        E.mapLeft(() => new Error(`Deployments path '${path}' is not a directory. Does it exist?`))
    )

/**
 * Curried function that accepts two filtering functions (for network directories
 * and deployment files) and returns a function that lists all the deployment file paths
 * for a specified deployments directory path
 *
 * @param includeNetworkDir
 * @param includeDeploymentFile
 *
 * @returns `(path: string) => Either<Error, string[]>`
 */
const listDeploymentFiles = (includeNetworkDir: IncludeDirent, includeDeploymentFile: IncludeDirent) =>
    flow(
        listEntriesSafe((dir) => dir.isDirectory() && includeNetworkDir(dir)),
        E.flatMap(
            flow(
                A.map(
                    listEntriesSafe((dir) => dir.isFile() && dir.name.endsWith('.json') && includeDeploymentFile(dir))
                ),
                A.sequence(E.Applicative),
                E.map(A.flatten)
            )
        )
    )
