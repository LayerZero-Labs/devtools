import * as E from 'fp-ts/Either'
import { parseDeploymentSafe } from './deployment'
import { ZodError } from 'zod'

describe('parser/deployments', () => {
    describe('parseDeploymentSafe', () => {
        it('should return left either if require fails', () => {
            expect(parseDeploymentSafe('./__mocks__/NonExistingDeployment.json')).toEqual(E.left(expect.any(Error)))
        })

        it('should return left either for an empty JSON', () => {
            expect(parseDeploymentSafe('./__mocks__/Empty.json')).toEqual(E.left(expect.any(Error)))
        })

        it.each([
            './__mocks__/Array.json',
            './__mocks__/False.json',
            './__mocks__/Number.json',
            './__mocks__/String.json',
        ])("should return left either for invalid deployment file '%s'", (path) => {
            expect(parseDeploymentSafe(path)).toEqual(E.left(expect.any(ZodError)))
        })

        it.each(['./__mocks__/DeploymentMock.json', './__mocks__/ONFT1155.json'])(
            "shout return right either for valid deployment file '%s'",
            (path) => {
                expect(parseDeploymentSafe(path)).toEqual(
                    E.right(
                        expect.objectContaining({
                            address: expect.any(String),
                            abi: expect.any(Array),
                            transactionHash: expect.any(String),
                        })
                    )
                )
            }
        )
    })
})
