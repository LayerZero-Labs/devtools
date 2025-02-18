import * as E from 'fp-ts/Either'
import { flow } from 'fp-ts/lib/function'
import { DeploymentBaseSchema } from './schema'

export const parseDeploymentSafe = flow(
    E.tryCatchK(require, E.toError),
    E.flatMap(E.tryCatchK(DeploymentBaseSchema.parse, E.toError))
)
