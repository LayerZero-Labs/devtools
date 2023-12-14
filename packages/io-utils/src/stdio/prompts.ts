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
