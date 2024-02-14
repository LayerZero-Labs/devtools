import { contractNameFromDeploymentFilePath, networkNameFromDeploymentFilePath } from './names'
import * as E from 'fp-ts/Either'

describe('names', () => {
    describe('contractNameFromDeploymentFilePath', () => {
        it.each([
            [E.left(new Error(`Invalid deployment file path`)), ''],
            [E.right('Contract'), 'Contract.json'],
            [E.right('Contract'), './some/Contract.json'],
            [E.right('Contract'), '/a/contract/deployments/folder/Contract.json'],
        ])("should return '%s' for contract path '%s'", (name, path) => {
            expect(contractNameFromDeploymentFilePath(path)).toEqual(name)
        })
    })

    describe('networkNameFromDeploymentFilePath', () => {
        it.each([
            [E.left(new Error(`Invalid deployment file path`)), ''],
            [E.left(new Error(`Invalid deployment file path`)), 'Contract.json'],
            [E.right('some'), './some/Contract.json'],
            [E.right('folder'), '/a/contract/deployments/folder/Contract.json'],
        ])("should return '%s' for contract path '%s'", (name, path) => {
            expect(networkNameFromDeploymentFilePath(path)).toEqual(name)
        })
    })
})
