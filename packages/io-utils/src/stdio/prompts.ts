import assert from 'assert'
import prompts from 'prompts'

export const promptToContinue = async (
    message: string = 'Do you want to continue?',
    defaultValue = true
): Promise<boolean> => {
    const { value } = await prompts({
        type: 'confirm',
        name: 'value',
        message,
        initial: defaultValue,
    })

    assert(typeof value === 'boolean', `Invariant error: Expected a boolean response, got ${value}`)

    return value
}
