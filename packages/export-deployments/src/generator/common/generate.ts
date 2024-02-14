import * as E from 'fp-ts/Either'
import { parseDeploymentSafe } from '../../parser/deployment'
import { DeploymentBase } from '../../parser/schema'
import { pipe } from 'fp-ts/lib/function'
import { contractNameFromDeploymentFilePath, networkNameFromDeploymentFilePath } from '../../common/names'

/**
 * Container for information on one particular contract instance
 */
export interface ContractInformation {
    deployment: DeploymentBase
    contractName: string
    networkName: string
}

/**
 * Gathers contract information from a deployment file located at path
 *
 * @param path Path to a JSON deployment file
 *
 * @returns `E.Either<Error, ContractInformation>`
 */
export const contractInformationSafe = (path: string): E.Either<Error, ContractInformation> =>
    pipe(
        E.Do,
        E.apS('deployment', parseDeploymentSafe(path)),
        E.apS('contractName', contractNameFromDeploymentFilePath(path)),
        E.apS('networkName', networkNameFromDeploymentFilePath(path))
    )
