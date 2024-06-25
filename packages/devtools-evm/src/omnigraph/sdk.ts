import type { OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import type { IOmniSDK, OmniContract } from './types'
import { omniContractToPoint } from './coordinates'
import { createContractErrorParser } from '@/errors/parser'
import type { OmniContractErrorParser, OmniContractErrorParserFactory } from '@/errors/types'
import type { ContractError } from '@/errors/errors'
import { Logger, createModuleLogger } from '@layerzerolabs/io-devtools'
import { formatOmniContract } from './format'

/**
 * Base class for all EVM SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export abstract class OmniSDK implements IOmniSDK {
    static errorParserFactory: OmniContractErrorParserFactory = createContractErrorParser

    /**
     * Registers a `OmniContractErrorParserFactory` function to be used when
     * an SDK needs to get an instance of `OmniContractErrorParser`.
     *
     * This enables us to use environment-specific error parsers
     * while maintaining separation of concerns. For example, `hardhat`-specific
     * environments can create error parsers based on all available errors from the build artifacts.
     *
     * @param {OmniContractErrorParserFactory | undefined} factory
     * @returns {void}
     */
    static registerErrorParserFactory(factory: OmniContractErrorParserFactory | undefined): void {
        this.errorParserFactory = factory ?? createContractErrorParser
    }

    /**
     * Creates an instance of `OmniContractErrorParser` based on the registered
     * `OmniContractErrorParserFactory`
     *
     * @param {OmniContract | null | undefined} contract
     * @returns {OmniContractErrorParser}
     */
    static createErrorParser(
        contract: OmniContract | null | undefined
    ): OmniContractErrorParser | Promise<OmniContractErrorParser> {
        return this.errorParserFactory(contract)
    }

    constructor(
        public readonly contract: OmniContract,
        protected readonly logger: Logger = createModuleLogger(
            `EVM SDK ${new.target.name} @ ${formatOmniContract(contract)}`
        )
    ) {}

    /**
     * Human radable label for this SDK
     */
    get label(): string {
        return formatOmniContract(this.contract)
    }

    get point(): OmniPoint {
        return omniContractToPoint(this.contract)
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: this.point,
            data,
        }
    }

    protected async parseError(error: unknown): Promise<ContractError> {
        const parser = await (this.constructor as typeof OmniSDK).createErrorParser(this.contract)

        return parser(error)
    }
}
