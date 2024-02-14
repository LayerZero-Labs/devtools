import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as NEA from 'fp-ts/NonEmptyArray'
import * as R from 'fp-ts/Record'
import { flow, pipe } from 'fp-ts/lib/function'
import { contractInformationSafe } from '../common/generate'
import { Ord } from 'fp-ts/lib/string'
import { OutputFile } from '../types'

/**
 * Converts an array of deployment JSON file paths into a record
 * of network names mapped to a record of contract addresses mapped by contract names.
 *
 * @param paths Deployment file paths
 *
 * @returns `Either<Error, Record<string, Record<string, string>>>`
 */
const contractsInformationSafe = flow(
    // The first step is to gather ContractInformation objects from deployment file paths
    A.map(contractInformationSafe),
    A.sequence(E.Applicative),
    // The second step is to group these by network names
    E.map(NEA.groupBy(({ networkName }) => networkName)),
    // Now we transform the contract information to an array of [contractName, contractAddress] entries
    E.map(R.map(A.map(({ deployment, contractName }): [string, string] => [contractName, deployment.address]))),
    // And finally we create an object from those entries
    E.map(R.map(R.fromEntries))
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
    E.map(
        // Here we'll take our record of record and create a single block with all contract addresses for every network
        R.collect(Ord)((networkName, addressesByContractName) =>
            pipe(
                // We collect all the addresses and turn them into markdown lines
                addressesByContractName,
                R.collect(Ord)((contractName, contractAddress) => `- \`${contractName}\`: \`${contractAddress}\``),
                // We prepend a title with the network name
                A.prepend(`## ${networkName}`),
                // And join it all together
                (lines) => lines.join('\n')
            )
        )
    ),
    // Then we join all the blocks together
    E.map((blocks) => blocks.join('\n\n')),
    E.map((content): OutputFile[] => [
        {
            path: `CONTRACTS.md`,
            content,
        },
    ])
)
