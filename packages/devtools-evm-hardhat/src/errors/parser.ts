import { getAllArtifacts, isErrorFragment } from '@/artifacts'
import { Contract } from '@ethersproject/contracts'
import { OmniContract, createContractErrorParser } from '@layerzerolabs/devtools-evm'
import { makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import pMemoize from 'p-memoize'

/**
 * Helper function that combines all the available ABIs into a one giant
 * interface (only containing the error fragments) used for error decoding.
 *
 * @returns {OmniContract}
 */
const createCombinedContract = pMemoize(async (): Promise<OmniContract> => {
    // We get all the available artifacts first
    const artifacts = await getAllArtifacts()

    // Now we combine the ABIs and keep only the errors
    const abi = artifacts.flatMap((artifact) => artifact.abi).filter(isErrorFragment)

    // Even though duplicated fragments don't throw errors, they still pollute the interface with warning console.logs
    // To prevent this, we'll run a simple deduplication algorithm - use JSON encoded values as hashes
    const deduplicatedAbi = Object.values(Object.fromEntries(abi.map((abi) => [JSON.stringify(abi), abi])))

    // FIXME Since we are creating an endpoint-agnostic, completely fictional contract,
    // we just make up and eid for it. Once the underlying logic is refactored, this should be gone
    return { eid: -1 as EndpointId, contract: new Contract(makeZeroAddress(), deduplicatedAbi) }
})

/**
 * Creates a generic error parser based on all the artifacts found in your hardhat project
 */
export const createErrorParser = async () => createContractErrorParser(await createCombinedContract())
