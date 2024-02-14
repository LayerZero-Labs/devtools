import { flow } from 'fp-ts/lib/function'
import { basename, dirname } from 'path'
import * as E from 'fp-ts/Either'

export const contractNameFromDeploymentFilePath = flow(
    (path: string) => basename(path, '.json'),
    (name) => (name === '' ? E.left(new Error(`Invalid deployment file path`)) : E.right(name))
)

export const networkNameFromDeploymentFilePath = flow(
    (path: string) => basename(dirname(path)),
    (name) => (name === '' || name === '.' ? E.left(new Error(`Invalid deployment file path`)) : E.right(name))
)
