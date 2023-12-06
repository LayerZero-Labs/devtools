import { defaultAbiCoder } from '@ethersproject/abi'
import type { OmniContract, OmniContractFactory } from '@/omnigraph/types'
import type { OmniError } from '@layerzerolabs/utils'
import { ContractError, CustomError, UnknownError, PanicError, RevertError } from './errors'
import { BigNumberishBigintSchema } from '../schema'

/**
 * Creates an asynchronous error parser for EVM contract errors.
 *
 * This parser is capable of turning `unknown` `OmniError` instances to typed ones
 *
 * @param contractFactory `OmniContractFactory`
 *
 * @returns `(omniError: OmniError<unknown>): Promise<OmniError<ContractError>>` `OmniError` parser
 */
export const createErrorParser =
    (contractFactory: OmniContractFactory) =>
    async ({ error, point }: OmniError<unknown>): Promise<OmniError<ContractError>> => {
        try {
            // If the error already is a ContractError, we'll continue
            if (error instanceof ContractError) return { error, point }

            // If the error is unknown we'll try to decode basic errors
            const candidates = getErrorDataCandidates(error)
            const [basicError] = candidates.flatMap(basicDecoder)
            if (basicError != null) return { point, error: basicError }

            // Then we'll try to decode custom errors
            const contract = await contractFactory(point)
            const contractDecoder = createContractDecoder(contract)
            const [customError] = candidates.flatMap(contractDecoder)
            if (customError != null) return { point, error: customError }

            // If none of the decoding works, we'll send a generic error back
            return { point, error: new UnknownError(`Unknown error: ${error}`) }
        } catch {
            // If we fail, we send an unknown error back
            return {
                point,
                error: new UnknownError(`Unexpected error: ${error}`),
            }
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
    if (data === '' || data === '0x') return [new UnknownError(`Reverted with empty data`)]

    // This covers the case for assert()
    if (data.startsWith(PANIC_ERROR_PREFIX)) {
        const reason = data.slice(PANIC_ERROR_PREFIX.length)

        try {
            const [decodedRawReason] = defaultAbiCoder.decode(['uint256'], `0x${reason}`)
            const decodedReason = BigNumberishBigintSchema.parse(decodedRawReason)

            return [new PanicError(decodedReason)]
        } catch {
            return [new PanicError(BigInt(-1), `Reason unknown, ABI decoding failed. The raw reason was '0x${reason}'`)]
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
 * @param contract `OmniContract`
 *
 * @returns `(data: string) => ContractError[]` Custom error decoder
 */
const createContractDecoder =
    ({ contract }: OmniContract) =>
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
    [(error as any)?.error?.data?.data, (error as any)?.error?.data, (error as any)?.data].filter(
        (candidate: unknown) => typeof candidate === 'string'
    )
