import { abi as defaultAbi } from '@layerzerolabs/oapp-evm/artifacts/OApp.sol/OApp.json'
import { abi as defaultOptionsType3Abi } from '@layerzerolabs/oapp-evm/artifacts/OAppOptionsType3.sol/OAppOptionsType3.json'

// Even though duplicated fragments don't throw errors, they still pollute the interface with warning console.logs
// To prevent this, we'll run a simple deduplication algorithm - use JSON encoded values as hashes
//
// We do this because both ABIs define Ownable methods & events
export const abi = Object.values(
    Object.fromEntries([...defaultAbi, ...defaultOptionsType3Abi].map((abi) => [JSON.stringify(abi), abi]))
)
