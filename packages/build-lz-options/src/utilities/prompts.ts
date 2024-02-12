import { EXECUTOR_OPTION_TYPE, OPTION_TYPES, WORKER_TYPE } from '@/config'
import { OptionType1Summary, OptionType2Summary } from '@/types'
import { makeBytes32 } from '@layerzerolabs/devtools'
import { ExecutorOptionType, GasLimit, NativeDrop, Options, WorkerId } from '@layerzerolabs/lz-v2-utilities'
import prompts, { PromptObject } from 'prompts'
import { handlePromptState, promptToContinue } from '@layerzerolabs/io-devtools'

// Max value of a Uint128 using a BigInt container.
const MAX_UINT_128 = BigInt(2) ** BigInt(128) - BigInt(1)
// Max value of a Uint16 using a number container.
const MAX_UINT_16 = 0xffffffff
// Default initial text number.
const DEFAULT_INITIAL_TEXT_NUMBER = BigInt('200000')

/**
 * OptionsBuilder class to build Options.  This class is a facade around the @layerzerolabs/lz-v2-utilities Options
 * builder, purpose built to support an interactive experience.
 */
class OptionsBuilder {
    private constructor(
        protected options: Options = Options.newOptions(),
        protected specifiesVerifierPreCrimeIndex: boolean = false
    ) {}

    /**
     * Factory method.
     * @returns {OptionsBuilder}
     */
    public static newBuilder(): OptionsBuilder {
        return new OptionsBuilder()
    }

    public addExecutorLzReceiveOption(gasLimit: GasLimit, nativeDrop: NativeDrop = 0): OptionsBuilder {
        this.options = this.options.addExecutorLzReceiveOption(gasLimit, nativeDrop)
        return this
    }

    public addExecutorNativeDropOption(nativeDrop: NativeDrop, receiver: string): OptionsBuilder {
        this.options = this.options.addExecutorNativeDropOption(nativeDrop, receiver)
        return this
    }

    public addExecutorComposeOption(index: number, gasLimit: GasLimit, nativeDrop: NativeDrop = 0): OptionsBuilder {
        this.options = this.options.addExecutorComposeOption(index, gasLimit, nativeDrop)
        return this
    }

    public addExecutorOrderedExecutionOption(): OptionsBuilder {
        this.options = this.options.addExecutorOrderedExecutionOption()
        return this
    }

    public addVerifierPrecrimeOption(verifierIdx: number): OptionsBuilder {
        this.options = this.options.addVerifierPrecrimeOption(verifierIdx)
        this.specifiesVerifierPreCrimeIndex = true
        return this
    }

    /**
     * Check if the options include Verifier PreCrime.
     * @returns {boolean}
     */
    public hasVerifierPreCrimeOption(): boolean {
        return this.specifiesVerifierPreCrimeIndex
    }

    public toHex(): string {
        return this.options.toHex()
    }

    public decodeExecutorLzReceiveOption() {
        return this.options.decodeExecutorLzReceiveOption()
    }
}

/**
 * Helper function to validate a string as a bigint.
 * @param {string} str input string
 * @param {bigint} max
 * @param {bigint} min defaults to BigInt(0)
 */
const isValidBigInt = (str: string, max: bigint, min: bigint = BigInt(0)): boolean => {
    try {
        const value = BigInt(str)
        return value >= min && value <= max
    } catch (e) {
        return false
    }
}

/**
 * Helper function to create a prompt for a bigint.
 * @param {string} name output variable name
 * @param {string} message prompt message
 * @param {bigint} initial defaults to DEFAULT_INITIAL_TEXT_NUMBER
 * @param {bigint} max defaults to MAX_UINT_128
 * @param {bigint} min defaults to BigInt(0)
 */
const promptForBigInt = <T extends string = string>(
    name: T,
    message: string,
    initial: bigint = DEFAULT_INITIAL_TEXT_NUMBER,
    max: bigint = MAX_UINT_128,
    min: bigint = BigInt(0)
): PromptObject<T> => {
    // wrapper around prompts to handle bigint using string serialization
    return {
        onState: handlePromptState,
        type: 'text',
        name,
        message,
        initial: initial.toString(),
        validate: (str: string) => isValidBigInt(str, max, min),
    }
}

/**
 * Helper function to prompt for supported option type (1, 2, or 3).
 */
export const promptForOptionType = () =>
    prompts([
        {
            onState: handlePromptState,
            type: 'select',
            name: 'type',
            message: 'Which option type?',
            choices: OPTION_TYPES.map((type) => ({ title: type.label, value: type })),
        },
    ])

const promptForGasLimit: PromptObject<'gasLimit'> = promptForBigInt(
    'gasLimit',
    'What gas limit (uint128) do you want to set?'
)

const promptForNativeDropAmount: PromptObject<'nativeDropAmount'> = promptForBigInt(
    'nativeDropAmount',
    'What native gas drop amount (uint128) do you want to set?'
)

/**
 * Prompt for verifier / executor index.
 */
const promptForIndex: PromptObject<'index'> = {
    onState: handlePromptState,
    type: 'number',
    name: 'index',
    message: 'What is the index (uint16)?',
    initial: 0,
    min: 0,
    max: MAX_UINT_16,
}

const promptForVerifierPrecrimeIndex: PromptObject<'index'> = {
    ...promptForIndex,
    message: 'What verifier precrime index (uint16) do you want to use?',
}

const promptForNativeDropAddress: PromptObject<'nativeDropAddress'> = {
    onState: handlePromptState,
    type: 'text',
    name: 'nativeDropAddress',
    message: 'What native gas drop address (bytes32) do you want to set?',
    initial: makeBytes32(),
    validate: (str: string) => {
        try {
            makeBytes32(str)
            return true
        } catch (_e) {
            return false
        }
    },
}

const promptForWorkerType = () =>
    prompts([
        {
            onState: handlePromptState,
            type: 'select',
            name: 'type',
            message: 'Which worker type?',
            choices: WORKER_TYPE.map((type) => ({ title: type.label, value: type })),
        },
    ])

const promptForExecutorOptionType = () =>
    prompts([
        {
            onState: handlePromptState,
            type: 'select',
            name: 'type',
            message: 'Which option3 type?',
            choices: EXECUTOR_OPTION_TYPE.map((type) => ({ title: type.label, value: type })),
        },
    ])

const promptExecutorLzReceiveOption = async (options: OptionsBuilder): Promise<OptionsBuilder> => {
    const { gasLimit, nativeDropAmount } = await prompts([promptForGasLimit, promptForNativeDropAmount])
    return options.addExecutorLzReceiveOption(gasLimit, nativeDropAmount)
}

const promptExecutorNativeDropOption = async (options: OptionsBuilder): Promise<OptionsBuilder> => {
    const { nativeDropAmount, nativeDropAddress } = await prompts([
        promptForNativeDropAmount,
        promptForNativeDropAddress,
    ])
    return options.addExecutorNativeDropOption(nativeDropAmount, nativeDropAddress)
}

const promptExecutorComposeOption = async (options: OptionsBuilder): Promise<OptionsBuilder> => {
    const { index, gasLimit, nativeDropAmount } = await prompts([
        promptForIndex,
        promptForGasLimit,
        promptForNativeDropAmount,
    ])

    return options.addExecutorComposeOption(index, gasLimit, nativeDropAmount)
}

const promptForExecutorOption = async (options: OptionsBuilder): Promise<OptionsBuilder> => {
    const executorOptionType = await promptForExecutorOptionType()
    switch (executorOptionType.type?.id) {
        case ExecutorOptionType.LZ_RECEIVE:
            return promptExecutorLzReceiveOption(options)
        case ExecutorOptionType.NATIVE_DROP:
            return promptExecutorNativeDropOption(options)
        case ExecutorOptionType.COMPOSE:
            return promptExecutorComposeOption(options)
        case ExecutorOptionType.ORDERED:
            return options.addExecutorOrderedExecutionOption()
        default:
            // unreachable in normal operations
            throw new Error(`Unsupported executor option type: ${executorOptionType.type?.id}`)
    }
}

const promptVerifierPrecrimeOption = async (options: OptionsBuilder): Promise<OptionsBuilder> => {
    const { index } = await prompts([promptForVerifierPrecrimeIndex])
    return options.addVerifierPrecrimeOption(index)
}

/**
 * Helper function to prompt for OptionType.TYPE_1.
 */
export const promptForOptionType1 = (): Promise<OptionType1Summary> => prompts(promptForGasLimit)

/**
 * Helper function to prompt for OptionType.TYPE_2.
 */
export const promptForOptionType2 = (): Promise<OptionType2Summary> =>
    prompts([promptForGasLimit, promptForNativeDropAmount, promptForNativeDropAddress])

const determineWorkerType = async (options: OptionsBuilder): Promise<OptionsBuilder> => {
    const workerType = await promptForWorkerType()
    switch (workerType.type?.id) {
        case WorkerId.EXECUTOR:
            return promptForExecutorOption(options)
        case WorkerId.VERIFIER:
            return promptVerifierPrecrimeOption(options)
        default:
            // unreachable in normal operations
            throw new Error(`Unsupported worker type: ${workerType.type?.id}`)
    }
}

/**
 * Helper function to prompt for OptionType.TYPE_3.
 */
export const promptForOptionType3 = async (): Promise<OptionsBuilder> => {
    let options = OptionsBuilder.newBuilder()
    do {
        options = await determineWorkerType(options)
    } while (await promptToContinue('Would you like to add another option?'))
    return options
}
