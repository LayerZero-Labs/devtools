import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as NEA from 'fp-ts/NonEmptyArray'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Record'
import { flow, pipe } from 'fp-ts/lib/function'
import {
    createArrayLiteral,
    createConst,
    createExportAsterisk,
    createExportConst,
    createIdentifier,
    createStringLiteral,
    createTypeDeclaration,
    createTypeOf,
    createTypeReferenceNode,
    creteAsConst,
    normalizeIdentifierName,
    printTSFile,
    recordToObjectLiteral,
    recordToRecordType,
    runtimeObjectToExpressionSafe,
} from './typescript'
import { OutputFile } from '../types'
import { AbiBase, DeploymentBase } from '../../parser/schema'
import { Ord } from 'fp-ts/lib/string'
import { deduplicateRecord } from './utils'
import { ContractInformation, contractInformationSafe } from '../common/generate'

type NetworkName = string

/**
 * Container for information on one contracts on all networks
 *
 * The information is grouped at property level to enable code-splitting
 * and tree shaking on the generated files (the properties will be exported as records
 * keyed by network name which enables the bundlers to drop the properties that are not used).
 *
 * An example of this is a downstream dependency that only requires contract addresses
 * and does not use abis - in this case the abis will not appear in the resulting bundle
 */
interface GroupedContractInformation {
    addresses: Record<NetworkName, string>
    abis: Record<NetworkName, AbiBase>
    transactionHashes: Record<NetworkName, string>
}

/**
 * Extracts values for a particular deployment property from an array of ContractInformation,
 * discarding nullable properties
 *
 * This is used when converting ContractInformation to GroupedContractInformation
 * where an array of ContractInformation produces a single GroupedContractInformation
 * by grouping the properties by network names.
 *
 * @param propertyName
 *
 * @returns `Record<NetworkName, NonNullable<DeploymentBase[TPropertyName]>>`
 */
const getDeploymentProperties = <TPropertyName extends keyof DeploymentBase>(propertyName: TPropertyName) =>
    flow(
        // First we create tuples of network names and deployment values
        A.map(({ networkName, deployment }: ContractInformation): [NetworkName, DeploymentBase[TPropertyName]] => [
            networkName,
            deployment[propertyName],
        ]),
        // Then we convert those to an object keyed by network name
        R.fromEntries,
        // Then we filter the nullish values from that object
        // by first mapping the nullish values to Options, the compacting the record
        R.map(O.fromNullable),
        R.compact
    )

/**
 * Groups contract properties, converting an array of ContractInformation
 * to GroupedContractInformation object.
 *
 * @param infos `ContractInformation[]`
 *
 * @returns `GroupedContractInformation`
 */
const groupContractInformation = (infos: ContractInformation[]): GroupedContractInformation => ({
    addresses: getDeploymentProperties('address')(infos),
    abis: getDeploymentProperties('abi')(infos),
    transactionHashes: getDeploymentProperties('transactionHash')(infos),
})

/**
 * Converts an array of deployment JSON file paths into a record
 * of contract names mapped to GroupedContractInformation.
 *
 * @param paths Deployment file paths
 *
 * @returns `Either<Error, Record<string, GroupedContractInformation>>`
 */
const contractsInformationSafe = flow(
    // The first step is to gather ContractInformation objects from deployment file paths
    A.map(contractInformationSafe),
    A.sequence(E.Applicative),
    // The second step is to group these by contract names
    E.map(NEA.groupBy(({ contractName }) => contractName)),
    // And finally we take the grouped information and convert each group
    // (since they are grouped by contract names) into GroupedContractInformation object
    E.map(R.map(groupContractInformation))
)

/**
 * Helper function that creates variable names for the deduplicated ABIs
 * based on their numeric index (deduplication works by returning an array of deduplicated ABIs
 * and a record that maps from network names to the indexes in that array)
 *
 * @param index
 * @returns
 */
const createAbiIdentifier = (index: number) => createIdentifier(`abi${index}`)

const createAbiTypeIdentifier = (index: number) => createIdentifier(`Abi${index}`)

/**
 * Converts GroupedContractInformation into a TypeScript file contents string.
 *
 * @param info `GroupedContractInformation`
 *
 * @returns `string`
 */
const transformGroupedContractInformation = ({ addresses, abis, transactionHashes }: GroupedContractInformation) =>
    pipe(
        // The first step is to take the record of abis
        // and deduplicate them. This will result in an array of unique ABIs
        // and a record that maps the network names to indices in this array
        deduplicateRecord(abis),
        ([uniqueAbis, abiIndexesByNetworkName]) =>
            pipe(
                uniqueAbis,
                // Take the array of unique ABIs and turn them into a list of variable declarations
                A.mapWithIndex((index, abi) =>
                    pipe(
                        abi,
                        runtimeObjectToExpressionSafe,
                        // Add "as const" to the exported ABIs
                        //
                        // This is very useful for e.g. viem that infers a lot of the information
                        // based on the shape of the ABI
                        E.map(creteAsConst),
                        E.map(createConst()(createAbiIdentifier(index)))
                    )
                ),
                A.sequence(E.Applicative),
                // With the declarations ready, we can construct an object that maps a network name
                // to a variable declaration
                E.map((declarations) => [
                    // We'll return all the variable declarations
                    ...declarations,
                    // Then we'll add their types
                    ...pipe(
                        declarations,
                        A.mapWithIndex((index) =>
                            pipe(
                                createTypeDeclaration()(createAbiTypeIdentifier(index))(
                                    createTypeOf(createAbiIdentifier(index))
                                )
                            )
                        )
                    ),
                    // Then we'll add the type of the 'abis' object
                    pipe(
                        abiIndexesByNetworkName,
                        R.map(createAbiTypeIdentifier),
                        recordToRecordType,
                        createTypeDeclaration()(createIdentifier('Abis'))
                    ),
                    // And we'll add an object export to map network names to the ABIs
                    pipe(
                        abiIndexesByNetworkName,
                        R.map(createAbiIdentifier),
                        recordToObjectLiteral,
                        createExportConst('abis', createTypeReferenceNode('Abis'))
                    ),
                ])
            ),
        // With the ABIs ready, we can add the rest of the properties we want to export
        E.map((abis) => [
            pipe(addresses, R.map(createStringLiteral), recordToObjectLiteral, createExportConst('addresses')),
            pipe(
                transactionHashes,
                R.map(createStringLiteral),
                recordToObjectLiteral,
                createExportConst('transactionHashes')
            ),
            ...abis,
        ]),
        E.map(printTSFile)
    )

/**
 * Creates a contracts.ts file based on a list of contract names.
 *
 * This file will contain a list of `export * as MyContract from './MyContract'` statements
 *
 * @param names `string[]` Contract names
 *
 * @returns `OutputFile`
 */
const createContractsFile = flow(
    A.map((name: string) => createExportAsterisk(normalizeIdentifierName(name), `./${name}`)),
    printTSFile,
    (content): OutputFile => ({ content, path: 'contracts.ts' })
)

/**
 * Creates an index.ts file based on a list of contract names.
 *
 * This file will contain an `export * as Contracts from './contracts'` and `export const names = ['MyContract']`
 *
 * @param names `string[]` Contract names
 *
 * @returns `OutputFile`
 */
const createIndexFile = flow(
    (names: string[]) => [
        pipe(names, A.map(createStringLiteral), createArrayLiteral, createExportConst('names')),
        createExportAsterisk('contracts', `./contracts`),
    ],
    printTSFile,
    (content): OutputFile => ({ content, path: 'index.ts' })
)

/**
 * The main generator function that takes in an array of deployment file paths
 * and transforms them into an array of OutputFile objects, one for every contracts
 * plus one index.ts file
 *
 * @param deploymentFilePaths An array of deployment JSON file paths
 *
 * @returns `Either<Error, OutputFile[]>`
 */
export const generate = flow(
    contractsInformationSafe,
    E.flatMap(flow(R.map(transformGroupedContractInformation), R.sequence(E.Applicative))),
    E.map((contractNamesToFileContents: Record<string, string>) => [
        // Create one output file for every contract
        ...pipe(
            contractNamesToFileContents,
            R.collect(Ord)(
                (contractName, content): OutputFile => ({
                    path: `${contractName}.ts`,
                    content,
                })
            )
        ),
        // And an index file
        pipe(contractNamesToFileContents, R.keys, createIndexFile),
        pipe(contractNamesToFileContents, R.keys, createContractsFile),
    ])
)
