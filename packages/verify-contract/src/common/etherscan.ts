import { type Logger, sleep } from '@layerzerolabs/io-devtools'
import { LicenseType } from './licenses'
import { z } from 'zod'
import { retry } from './promises'
import EventEmitter from 'events'
import got from 'got'

export interface SubmitForVerificationProps {
    apiKey?: string
    apiUrl: string
    chainId?: number
    address: string
    contractName: string
    compilerVersion: string
    optimizerRuns?: number
    licenseType?: LicenseType
    sourceCode: string
    constructorArguments?: string
    evmVersion?: string
}

interface SubmitForVerificationRequest {
    apikey?: string
    action: 'verifysourcecode'
    module: 'contract'
    contractaddress: string
    codeformat: 'solidity-single-file' | 'solidity-standard-json-input'
    contractname: string
    compilerversion: `v${string}`
    optimizationUsed: '0' | '1'
    runs?: string
    constructorArguements?: string
    evmversion?: string
    licenseType?: string
    sourceCode: string
}

export interface VerificationResponse {
    alreadyVerified: boolean
}

export type VerificationRetryHandler = (error: unknown, attempt: number) => void

export type VerificationPollHandler = (guid: string) => void

export interface IVerification {
    verify(): Promise<VerificationResponse>

    on(event: 'retry', handler: VerificationRetryHandler): void
    off(event: 'retry', handler: VerificationRetryHandler): void

    on(event: 'poll', handler: VerificationPollHandler): void
    off(event: 'poll', handler: VerificationPollHandler): void
}

class Verification extends EventEmitter implements IVerification {
    constructor(
        private readonly props: SubmitForVerificationProps,
        private readonly logger: Logger
    ) {
        super()
    }

    public async verify(): Promise<VerificationResponse> {
        try {
            this.logger.verbose(
                `Submitting verification for ${this.props.contractName} on address ${this.props.address} to ${this.props.apiUrl}`
            )

            const response = await this.__submit()

            this.logger.verbose(
                `Received response for ${this.props.contractName} on address ${this.props.address} to ${this.props.apiUrl}`
            )
            this.logger.verbose(JSON.stringify(response))

            // If the contract is already verified, we'll return false to signify that
            if (isAlreadyVerifiedResult(response.result)) {
                return {
                    alreadyVerified: true,
                }
            }

            // At this point the only reasonable way things can go is success
            // so if the API status is not 1, something is off
            //
            // And we'll throw oh boi oh boi we'll throw
            if (response.status !== 1) {
                throw new Error(
                    `Verification failed with result "${response.result}", status ${response.status} (${response.message})`
                )
            }

            const guid = response.result
            if (guid == null) {
                throw new Error(`Missing GUID from the response: ${response}`)
            }

            return await this.__poll(guid)
        } catch (error) {
            throw new Error(`Verification error: ${error}`)
        }
    }

    private async __submit(): Promise<ScanResponse> {
        const request = createVerificationRequest(this.props)

        this.logger.verbose(`Sending verification request to ${this.props.apiUrl}:\n\n${JSON.stringify(request)}`)

        return await retry(
            async () => {
                // We'll retry if the request itself fails
                const response = await submitRequest(this.props.apiUrl, request, this.props.chainId)

                this.logger.verbose(`Received raw response from ${this.props.apiUrl}:\n\n${JSON.stringify(response)}`)

                // If we got rate limited, we'll retry as well
                if (isApiRateLimitedResult(response.result)) {
                    throw new Error(`API Rate limit has been exceeded`)
                }

                return response
            },
            // We'll retry 3 times because 3 is a magic number
            3,
            // If an error happens while retrying, we'll let the upstream know
            async (error, attempt) => {
                this.emit('retry', error, attempt)

                // We'll wait a bit after every failed attempt
                await sleep(2000)
            }
        )
    }

    private async __poll(guid: string): Promise<VerificationResponse> {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            this.emit('poll', guid)

            const result = await checkGuid(this.props.apiUrl, guid, this.props.chainId, this.props.apiKey)
            this.logger.verbose(`Received raw polling response from ${this.props.apiUrl}:\n\n${JSON.stringify(result)}`)

            if (result.status === 1) {
                return {
                    alreadyVerified: false,
                }
            }

            if (isAlreadyVerifiedResult(result.result)) {
                return {
                    alreadyVerified: true,
                }
            }

            if (isPendingResult(result.result)) {
                await sleep(10_000)
                continue
            }

            if (isApiRateLimitedResult(result.result)) {
                await sleep(10_000)
                continue
            }

            throw new Error(
                `Verification failed with result "${result.result}", status ${result.status} (${result.message})`
            )
        }
    }
}

export const createVerification = (props: SubmitForVerificationProps, logger: Logger): IVerification =>
    new Verification(props, logger)

const isPendingResult = (result: string | null | undefined): boolean => !!result?.match(/Pending/gi)

const isAlreadyVerifiedResult = (result: string | null | undefined): boolean => !!result?.match(/already verified/gi)

const isApiRateLimitedResult = (result: string | null | undefined): boolean => !!result?.match(/rate/)

const submitRequest = async (
    apiUrl: string,
    request: SubmitForVerificationRequest,
    chainId?: number
): Promise<ScanResponse> => {
    try {
        // For Etherscan API v2, include chainid in the URL
        // Only add chainid for Etherscan v2 URLs, not for custom explorers
        const url = new URL(apiUrl)
        const isEtherscanV2 = apiUrl.includes('api.etherscan.io/v2')

        if (chainId !== undefined && isEtherscanV2) {
            url.searchParams.set('chainid', String(chainId))
        }

        const response = await got(url.toString(), {
            method: 'POST',
            form: request,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
        }).json()

        return ScanResponseSchema.parse(response)
    } catch (error) {
        throw new Error(`Failed to submit verification request: ${error}`)
    }
}

/**
 * Helper function that will try to get the verification result by GUID
 */
const checkGuid = async (apiUrl: string, guid: string, chainId?: number, apiKey?: string): Promise<ScanResponse> => {
    const url = new URL(apiUrl)
    url.searchParams.set('module', 'contract')
    url.searchParams.set('action', 'checkverifystatus')
    url.searchParams.set('guid', guid)

    // For Etherscan API v2, include chainid in the URL
    // Only add chainid for Etherscan v2 URLs, not for custom explorers
    const isEtherscanV2 = apiUrl.includes('api.etherscan.io/v2')

    if (chainId !== undefined && isEtherscanV2) {
        url.searchParams.set('chainid', String(chainId))
    }

    // Include API key if provided
    if (apiKey) {
        url.searchParams.set('apikey', apiKey)
    }

    try {
        const data = await got(url).json()

        return ScanResponseSchema.parse(data)
    } catch (error) {
        throw new Error(`Failed to check verification status: ${error}`)
    }
}

/**
 * Helper function that formats the scan API request
 * for consumption by the API.
 *
 * Scan APIs have some peculiarities like typos and version prefixes
 * which this function needs to handle
 *
 * @param props SubmitForVerificationProps
 * @returns SubmitForVerificationRequest
 */
const createVerificationRequest = ({
    apiKey,
    address,
    contractName,
    constructorArguments,
    compilerVersion,
    optimizerRuns = 0,
    sourceCode,
    evmVersion,
    licenseType,
}: SubmitForVerificationProps): SubmitForVerificationRequest => {
    const request: SubmitForVerificationRequest = {
        action: 'verifysourcecode',
        module: 'contract',
        codeformat: 'solidity-standard-json-input',
        contractaddress: address,
        contractname: contractName,
        compilerversion: `v${compilerVersion}`,
        optimizationUsed: optimizerRuns > 0 ? '1' : '0',
        sourceCode,
    }

    if (apiKey != null) {
        request.apikey = apiKey
    }
    if (optimizerRuns != null) {
        request.runs = String(optimizerRuns)
    }
    if (constructorArguments != null) {
        request.constructorArguements = constructorArguments
    }
    if (evmVersion != null) {
        request.evmversion = evmVersion
    }
    if (licenseType != null) {
        request.licenseType = String(licenseType)
    }

    return request
}

type ScanResponse = z.TypeOf<typeof ScanResponseSchema>

const ScanResponseSchema = z.object({
    status: z.coerce.number().nullish(),
    message: z.string().nullish(),
    result: z.string().nullish(),
})
