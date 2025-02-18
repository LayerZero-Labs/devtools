import assert from 'assert'
import prompts from 'prompts'

/**
 * Helper utility to be used when raw access to prompts
 * is required.
 *
 * This should be passed to `onState` property of the options
 * to handle cases where the user sends a SIGTERM signal to the process
 * (ctrl + c) usually.
 *
 * If not passed in, the SIGTERM will cancel the prompt but the promise
 * will resolve with an invalid result and, what's more important,
 * if cursor had been hidden it will be swallowed and people will need to
 * restart their terminal to bring it back
 *
 * @param {{ aborted?: boolean}} state Prompts state object
 */
export const handlePromptState = (state: { aborted?: boolean }) => {
    if (state.aborted) {
        // If we don't re-enable the terminal cursor before exiting
        // the program, the cursor will remain hidden
        process.stdout.write('\x1B[?25h')
        process.stdout.write('\n')
        process.exit(1)
    }
}

export const promptToContinue = async (
    message: string = 'Do you want to continue?',
    defaultValue = true
): Promise<boolean> => {
    const { value } = await prompts({
        type: 'confirm',
        name: 'value',
        message,
        initial: defaultValue,
        onState: handlePromptState,
    })

    assert(typeof value === 'boolean', `Invariant error: Expected a boolean response, got ${value}`)

    return value
}

/**
 * Validation function for prompts (sync or async)
 *
 * Should return true if validation passed, false or an error message
 * if validation failed
 */
type PromptValidator<TValue extends string> = (value: TValue) => string | boolean | Promise<string | boolean>

interface TextProps {
    /**
     * Additional message to show to the user
     */
    hint?: string
    defaultValue?: string
    validate?: PromptValidator<string>
}

export const promptForText = async (
    message: string = 'Do you want to continue?',
    { defaultValue, hint, validate }: TextProps = {}
) => {
    const { value } = await prompts({
        type: 'text',
        name: 'value',
        hint,
        message,
        onState: handlePromptState,
        validate,
        initial: defaultValue,
    })

    return value
}

export interface PromptOption<TValue> {
    title: string
    hint?: string
    disabled?: boolean
    selected?: boolean
    value?: TValue
}

interface SelectProps<TValue> {
    options: PromptOption<TValue>[]
    /**
     * A message displayed to the user if they focus on a disabled value
     */
    disabledHint?: string
}

export const promptToSelectOne = async <TValue>(message: string, { options }: SelectProps<TValue>): Promise<TValue> => {
    const { value } = await prompts({
        type: 'select',
        name: 'value',
        message,
        choices: options,
        onState: handlePromptState,
    })

    return value
}

interface MultiSelectProps<TValue> extends SelectProps<TValue> {
    /**
     * Minimum number of options to select
     */
    min?: number
    /**
     * Maximum number of options to select
     */
    max?: number
}

export const promptToSelectMultiple = async <TValue>(
    message: string,
    { options, disabledHint, min, max }: MultiSelectProps<TValue>
): Promise<TValue[]> => {
    const { value } = await prompts({
        type: 'autocompleteMultiselect',
        name: 'value',
        message,
        choices: options,
        onState: handlePromptState,
        warn: disabledHint,
        min,
        max,
    })

    return value
}
