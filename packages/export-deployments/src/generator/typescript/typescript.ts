import { flow } from 'fp-ts/lib/function'
import * as E from 'fp-ts/Either'
import * as R from 'fp-ts/Record'
import {
    type BindingName,
    type Expression,
    type ModifierLike,
    type Statement,
    NodeFlags,
    ScriptKind,
    ScriptTarget,
    createSourceFile,
    factory,
    isExpressionStatement,
    SyntaxKind,
    createPrinter,
    ListFormat,
    Identifier,
    TypeNode,
} from 'typescript'
import { stringify } from 'fp-ts/lib/Json'
import { Ord } from 'fp-ts/lib/string'

export const createConst =
    (modifiers: ModifierLike[] = []) =>
    (name: string | BindingName, type?: TypeNode) =>
    (expression: Expression) =>
        factory.createVariableStatement(
            modifiers,
            factory.createVariableDeclarationList(
                [factory.createVariableDeclaration(name, undefined, type, expression)],
                NodeFlags.Const
            )
        )

export const createTypeOf = factory.createTypeQueryNode

export const createTypeReferenceNode = factory.createTypeReferenceNode

export const createTypeDeclaration =
    (modifiers: ModifierLike[] = []) =>
    (name: Identifier) =>
    (type: TypeNode) =>
        factory.createTypeAliasDeclaration(modifiers, name, undefined, type)

/**
 * Wraps an expression with "as const"
 *
 * @param {Expression} expression
 * @returns {Expression}
 */
export const creteAsConst = (expression: Expression): Expression =>
    factory.createAsExpression(expression, createTypeReferenceNode(createIdentifier('const'), undefined))

export const createIdentifier = factory.createIdentifier

export const createStringLiteral = factory.createStringLiteral

export const createArrayLiteral = (expressions: Expression[]) =>
    factory.createArrayLiteralExpression(expressions, false)

export const createExportConst = createConst([factory.createToken(SyntaxKind.ExportKeyword)])

export const normalizeIdentifierName = (name: string) => name.replaceAll('-', '_')

export const createExportAsterisk = (name: string, path: string = `./${name}`) =>
    factory.createExportDeclaration(
        undefined,
        false,
        factory.createNamespaceExport(factory.createIdentifier(name)),
        factory.createStringLiteral(path),
        undefined
    )

export const recordToObjectLiteral = flow(
    R.collect(Ord)((key: string, value: Expression) =>
        factory.createPropertyAssignment(factory.createStringLiteral(key), value)
    ),
    (properties) => factory.createObjectLiteralExpression(properties, true)
)

export const recordToRecordType = flow(
    R.collect(Ord)((key: string, value: Identifier) =>
        factory.createPropertySignature(
            undefined,
            factory.createStringLiteral(key),
            undefined,
            createTypeReferenceNode(value)
        )
    ),
    (properties) => factory.createTypeLiteralNode(properties)
)

/**
 * Parses a JSON string into TypeScript AST
 *
 * @returns `Either<Error, SourceFile>`
 */
const createJSONSourceFileSafe = E.tryCatchK(
    (content: string) => createSourceFile('file.json', content, ScriptTarget.JSON, false, ScriptKind.JSON),
    E.toError
)

/**
 * Takes a JSON-serializable runtime object and converts it into a TypeScript AST.
 *
 * @returns `Either<Error, Expression>`
 */
export const runtimeObjectToExpressionSafe = flow(
    // The first step is to JSON-serialize the object
    stringify,
    // This step just converts the unknown exception we migth have gotten
    // in the previous step to an Error instance
    E.mapLeft(E.toError),

    // After that we use the TypeScript AST parser to get the JSON SourceFile
    // and get the first (and only) statement the JSON file will contain
    E.flatMap(createJSONSourceFileSafe),
    E.flatMapNullable(
        ({ statements }) => statements.at(0),
        () => new Error('Empty JSON file')
    ),

    // For type safety we need to make sure the statement is an expression
    // (which it has to be but TypeScript does not know that)
    E.filterOrElse(isExpressionStatement, () => new Error('Malformed JSON file')),

    // Instead of returning an expression statement, we'll return the expression itself
    E.map(({ expression }) => expression)
)

/**
 * Prints a series of TypeScript statements into a string
 *
 * @returns `string`
 */
export const printTSFile = (statements: Statement[]): string => {
    const printer = createPrinter()
    const sourceFile = createSourceFile('file.ts', '', ScriptTarget.ESNext, true, ScriptKind.TS)
    const nodes = factory.createNodeArray(statements)
    return printer.printList(ListFormat.MultiLine, nodes, sourceFile)
}
