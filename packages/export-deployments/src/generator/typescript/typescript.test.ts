import * as E from 'fp-ts/Either'
import { SyntaxKind } from 'typescript'
import { runtimeObjectToExpressionSafe } from './typescript'

describe('generator/typescript/typescript', () => {
    describe('runtimeObjectToExpressionSafe()', () => {
        it('should return a right either with object literal expression', () => {
            expect(runtimeObjectToExpressionSafe({})).toEqual(
                E.right(
                    expect.objectContaining({
                        kind: SyntaxKind.ObjectLiteralExpression,
                    })
                )
            )
        })

        it('should return a right either with array literal expression', () => {
            expect(runtimeObjectToExpressionSafe([])).toEqual(
                E.right(
                    expect.objectContaining({
                        kind: SyntaxKind.ArrayLiteralExpression,
                    })
                )
            )
        })

        it('should return a right either with boolean literal expression', () => {
            expect(runtimeObjectToExpressionSafe(false)).toEqual(
                E.right(
                    expect.objectContaining({
                        kind: SyntaxKind.FalseKeyword,
                    })
                )
            )
        })
    })
})
