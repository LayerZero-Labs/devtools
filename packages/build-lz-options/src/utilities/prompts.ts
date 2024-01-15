import { EXECUTOR_OPTION_TYPE, OPTION_TYPES, WORKER_TYPE } from '@/config'
import { OptionType1, OptionType2 } from '@/types'
import { makeBytes32 } from '@layerzerolabs/devtools-evm'
import { ExecutorOptionType, Options, WorkerId } from '@layerzerolabs/lz-utility-v2'
import prompts, { PromptObject } from 'prompts'
import { handlePromptState, promptToContinue } from '@layerzerolabs/io-devtools'

const MAX_UINT_128 = BigInt(2) ** BigInt(128) - BigInt(1)
const MAX_UINT_8 = 0xffff
const DEFAULT_INITIAL_TEXT_NUMBER = BigInt('200000')

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
const promptForBigInt = (
    name: string,
    message: string,
    initial: bigint = DEFAULT_INITIAL_TEXT_NUMBER,
    max: bigint = MAX_UINT_128,
    min: bigint = BigInt(0)
): PromptObject<string> => {
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

const promptForGasLimit: PromptObject<string> = promptForBigInt('gasLimit', 'What gas limit do you want to set?')

const promptForNativeDropAmount: PromptObject<string> = promptForBigInt(
    'nativeDropAmount',
    'What native gas drop do you want to set?'
)

/**
 * Prompt for verifier / executor index.
 */
const promptForIndex: PromptObject<string> = {
    onState: handlePromptState,
    type: 'number',
    name: 'index',
    message: 'What is the index?',
    initial: 0,
    min: 0,
    max: MAX_UINT_8,
}

const promptForNativeDropAddress: PromptObject<string> = {
    onState: handlePromptState,
    type: 'text',
    name: 'nativeDropAddress',
    message: 'What native gas drop do you want to set?',
    initial: makeBytes32(),
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

const promptExecutorLzReceiveOption = async (options: Options): Promise<Options> => {
    const { gasLimit, nativeDropAmount } = await prompts([promptForGasLimit, promptForNativeDropAmount])
    return options.addExecutorLzReceiveOption(gasLimit, nativeDropAmount)
}

const promptExecutorNativeDropOption = async (options: Options): Promise<Options> => {
    const { nativeDropAmount, nativeDropAddress } = await prompts([
        promptForNativeDropAmount,
        promptForNativeDropAddress,
    ])
    return options.addExecutorNativeDropOption(nativeDropAmount, nativeDropAddress)
}

const promptExecutorComposeOption = async (options: Options): Promise<Options> => {
    const { index, gasLimit, nativeDropAmount } = await prompts([
        promptForIndex,
        promptForGasLimit,
        promptForNativeDropAmount,
    ])
    return options.addExecutorComposeOption(index, gasLimit, nativeDropAmount)
}

const promptForExecutorOption = async (options: Options): Promise<Options> => {
    const executorOptionType = await promptForExecutorOptionType()
    switch (executorOptionType.type?.id) {
        case ExecutorOptionType.LZ_RECEIVE: {
            options = await promptExecutorLzReceiveOption(options)
            break
        }
        case ExecutorOptionType.NATIVE_DROP: {
            options = await promptExecutorNativeDropOption(options)
            break
        }
        case ExecutorOptionType.COMPOSE: {
            options = await promptExecutorComposeOption(options)
            break
        }
        case ExecutorOptionType.ORDERED: {
            options = options.addExecutorOrderedExecutionOption()
            break
        }
    }
    return options
}

const promptVerifierPrecrimeOption = async (options: Options): Promise<Options> => {
    const { index } = await prompts([promptForIndex])
    return options.addVerifierPrecrimeOption(index)
}

/**
 * Helper function to prompt for OptionType.TYPE_1.
 */
export const promptForOptionType1 = () => prompts([promptForGasLimit]) as never as Promise<OptionType1>

/**
 * Helper function to prompt for OptionType.TYPE_2.
 */
export const promptForOptionType2 = (): Promise<OptionType2> =>
    prompts([promptForGasLimit, promptForNativeDropAmount, promptForNativeDropAddress]) as never as Promise<OptionType2>

/**
 * Helper function to prompt for OptionType.TYPE_3.
 */
export const promptForOptionType3 = async (): Promise<Options> => {
    let options = Options.newOptions()
    do {
        const workerType = await promptForWorkerType()
        switch (workerType.type.id) {
            case WorkerId.EXECUTOR: {
                options = await promptForExecutorOption(options)
                break
            }
            case WorkerId.VERIFIER: {
                options = await promptVerifierPrecrimeOption(options)
                break
            }
        }
    } while (await promptToContinue())
    return options
}
