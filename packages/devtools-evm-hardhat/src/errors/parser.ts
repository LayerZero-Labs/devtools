import { getAllArtifacts, isErrorFragment } from '@/artifacts'
import { Contract } from '@ethersproject/contracts'
import {
    createErrorParser as createErrorParserBase,
    makeZeroAddress,
    type OmniContractFactory,
} from '@layerzerolabs/devtools-evm'

/**
 * Helper function that combines all the available ABIs into a one giant
 * interface (only containing the error fragments) used for error decoding.
 *
 * TODO This function is not memoized at the moment, if the performance turns out to be a bottleneck we can memoize
 *
 * @returns {OmniContractFactory}
 */
const createCombinedContractFactory =
    (): OmniContractFactory =>
    async ({ eid }) => {
        // We get all the available artifacts first
        const artifacts = await getAllArtifacts()

        // Now we combine the ABIs and keep only the errors
        const abi = artifacts.flatMap((artifact) => artifact.abi).filter(isErrorFragment)

        // Even though duplicated fragments don't throw errors, they still pollute the interface with warning console.logs
        // To prevent this, we'll run a simple deduplication algorithm - use JSON encoded values as hashes
        const deduplicatedAbi = Object.values(Object.fromEntries(abi.map((abi) => [JSON.stringify(abi), abi])))

        return { eid, contract: new Contract(makeZeroAddress(), deduplicatedAbi) }
    }

/**
 * Creates a generic error parser based on all the artifacts found in your hardhat project
 */
export const createErrorParser = () => createErrorParserBase(createCombinedContractFactory())
