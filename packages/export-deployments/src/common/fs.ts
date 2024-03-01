import { type Dirent, lstatSync, mkdirSync, opendirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import * as E from 'fp-ts/Either'
import { type Predicate } from 'fp-ts/lib/Predicate'
import { type OutputFile } from '../generator/types'

export const readFileSyncSafe = E.tryCatchK((path: string) => readFileSync(path, 'utf8'), E.toError)

export const isDirectorySafe = E.tryCatchK((path: string) => lstatSync(path).isDirectory(), E.toError)

export const mkdirSafe = E.tryCatchK((path: string): string => (mkdirSync(path, { recursive: true }), path), E.toError)

export const writeFileSyncSafe = E.tryCatchK(({ content, path }: OutputFile) => writeFileSync(path, content), E.toError)

/**
 * Lists all the directory entries that pass the predicate function. The returned array
 * will contain absolute paths of the directory entries.
 *
 * @param predicate `(dir: Dirent) => boolean`
 * @returns `(path: string) => Either<Error, string[]>`
 */
export const listEntriesSafe = (predicate: Predicate<Dirent>) =>
    E.tryCatchK((path: string) => {
        const dir = opendirSync(path)

        try {
            let subDirectory: Dirent | null
            const subDirectories: string[] = []

            while ((subDirectory = dir.readSync())) {
                if (predicate(subDirectory)) {
                    subDirectories.push(resolve(path, subDirectory.name))
                }
            }

            return subDirectories
        } finally {
            dir.closeSync()
        }
    }, E.toError)
