import { defaultAbiCoder } from '@ethersproject/abi'
import { ContractError, CustomError, UnknownError, PanicError, RevertError } from './errors'
import { BigNumberishBigIntSchema } from '@/schema'
import type { Contract } from '@ethersproject/contracts'
import type { OmniContractErrorParserFactory } from './types'

/**
 * Creates an error parser based on a specific `OmniContract`
 *
 * This call will never fail and will always return an instance of `ContractError`
 *
 * @param {OmniContract | null | undefined} contract
 * @returns {OmniContractErrorParser}
 */
export const createContractErrorParser: OmniContractErrorParserFactory = (contract) => (error) =>
    // First we'll try to decode a contract error if we have a contract
    (contract ? parseContractError(error, contract.contract) : null) ??
    // Then we'll try decoding a generic one
    parseGenericError(error) ??
    // The we throw a generic one
    new UnknownError(`Unknown error: ${toStringSafe(error)}`)

export const parseContractError = (error: unknown, contract: Contract): ContractError | undefined => {
    // If the error already is a ContractError, we'll continue
    if (error instanceof ContractError) {
        return error
    }

    try {
        // If the error is unknown we'll try to decode basic errors
        const candidates = getErrorDataCandidates(error)

        const contractDecoder = createContractDecoder(contract)
        return candidates.flatMap(contractDecoder).at(0)
    } catch {
        return undefined
    }
}

export const parseGenericError = (error: unknown): ContractError | undefined => {
    // If the error already is a ContractError, we'll continue
    if (error instanceof ContractError) {
        return error
    }

    try {
        // If the error is unknown we'll try to decode basic errors
        const candidates = getErrorDataCandidates(error)

        // And return the first candidate
        return candidates.flatMap(basicDecoder).at(0)
    } catch {
        return undefined
    }
}

// If a contract reverts using revert, the error data will be prefixed with this beauty
const REVERT_ERROR_PREFIX = '0x08c379a0'

// If a contract reverts with assert, the error data will be prefixed with this beauty
const PANIC_ERROR_PREFIX = '0x4e487b71'

/**
 * Basic decoder can decode a set of common errors without having access to contract ABIs
 *
 * @param data `string` Error revert data
 *
 * @returns `ContractError[]` Decoded errors, if any
 */
const basicDecoder = (data: string): ContractError[] => {
    if (data === '' || data === '0x') {
        return [new UnknownError(`Reverted with empty data`)]
    }

    // This covers the case for assert()
    if (data.startsWith(PANIC_ERROR_PREFIX)) {
        const reason = data.slice(PANIC_ERROR_PREFIX.length)

        // If the reason is empty, we'll assume the default 0 exit code
        if (reason === '') {
            return [new PanicError(BigInt(0))]
        }

        try {
            // The codes should follow the docs here https://docs.soliditylang.org/en/latest/control-structures.html#error-handling-assert-require-revert-and-exceptions
            const [decodedRawReason] = defaultAbiCoder.decode(['uint256'], `0x${reason}`)
            const decodedReason = BigNumberishBigIntSchema.parse(decodedRawReason)

            return [new PanicError(decodedReason)]
        } catch {
            return [new PanicError(BigInt(0), `Reason unknown, ABI decoding failed. The raw reason was '0x${reason}'`)]
        }
    }

    // This covers the case for revert() and reject()
    if (data.startsWith(REVERT_ERROR_PREFIX)) {
        const reason = data.slice(REVERT_ERROR_PREFIX.length)

        try {
            const [decodedReason] = defaultAbiCoder.decode(['string'], `0x${reason}`)

            return [new RevertError(decodedReason)]
        } catch {
            return [new RevertError(`Reason unknown, ABI decoding failed. The raw reason was '0x${reason}'`)]
        }
    }

    return []
}

/**
 * Contract decoder uses the contract ABIs to decode error revert string
 *
 * @param contract `Contract`
 *
 * @returns `(data: string) => ContractError[]` Custom error decoder
 */
const createContractDecoder =
    (contract: Contract) =>
    (data: string): ContractError[] => {
        try {
            const errorDescription = contract.interface.parseError(data)

            return [new CustomError(errorDescription.name, [...errorDescription.args])]
        } catch {
            return []
        }
    }

/**
 * Helper function that traverses an unknown error and agthers all the fields
 * that could possibly contain the revert data.
 *
 * The results are order from the most specific one to the least specific one
 * since the function above will prioritize the results in front of the list
 *
 * @param error `unknown`
 *
 * @returns `string[]` A list of possible error revert strings
 */
const getErrorDataCandidates = (error: unknown): string[] =>
    [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.error?.data?.data,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.error?.data,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.data,
    ].filter((candidate: unknown) => typeof candidate === 'string')

/**
 * Solves an issue with objects that cannot be converted to primitive values
 * and when stringified, they fail
 *
 * See https://stackoverflow.com/questions/41164750/cannot-convert-object-to-primitive-value
 *
 * @param {unknown} obj
 * @returns {string} String representation of an object or `'[unknown]'`
 */
const toStringSafe = (obj: unknown): string => {
    try {
        return String(obj)
    } catch {
        return '[unknown]'
    }
}
