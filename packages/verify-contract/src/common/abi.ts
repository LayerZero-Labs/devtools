import assert from 'assert'
import { Interface, type JsonFragment } from '@ethersproject/abi'
import { type MinimalAbi } from './schema'
import * as parser from '@solidity-parser/parser'
import { TypeName, type FunctionDefinition } from '@solidity-parser/parser/dist/src/ast-types'

/**
 * Helper function that takes a contract ABI and constructor
 * arguments and serializes them for submission to scan
 *
 * @param abi ABI in any format that ethers understand
 * @param args Constructor arguments
 * @returns
 */
export const encodeContructorArguments = (abi: JsonFragment[], args: unknown[] | undefined): string | undefined => {
    if (args == null || args.length === 0) {
        return undefined
    }

    const iface = new Interface(abi)
    const encodedConstructorArguments = iface.encodeDeploy(args)

    // Scan APIs expect the string not to contain the leading 0x
    return encodedConstructorArguments.slice(2)
}

export const getContructorABIFromSource = (source: string): MinimalAbi => {
    try {
        // First we'll parse the source code and get the AST
        const ast = parser.parse(source)

        // We'll look for the constructor definition by visiting nodes
        let constructorDefinition: FunctionDefinition | undefined
        parser.visit(ast, {
            FunctionDefinition: (node) => {
                if (node.isConstructor) {
                    constructorDefinition = node
                }
            },
        })

        // At this point we should have the constructor definition,
        // if not we'll yell
        assert(constructorDefinition != null, `Could not find constructor definition`)

        // Now it's time to create a pruned version of an ABI
        const abi = [
            {
                type: 'constructor',
                inputs: constructorDefinition.parameters.map(({ typeName }, index) => {
                    // Let's check everything we can
                    assert(typeName != null, `Missing a type definition for constructor parameter at position ${index}`)

                    return { type: getTypeFromTypeName(typeName) }
                }),
            },
        ]

        return abi
    } catch (error) {
        throw new Error(`Could not get an ABI from contract source: ${error}`)
    }
}

const getTypeFromTypeName = (typeName: TypeName): string => {
    switch (typeName.type) {
        case 'ElementaryTypeName':
            return typeName.name

        case 'ArrayTypeName':
            return `${getTypeFromTypeName(typeName.baseTypeName)}[]`

        default:
            throw new Error(
                `Only primitive and array types are currently supported when constructing ABI from contract source, got ${typeName.type}`
            )
    }
}
