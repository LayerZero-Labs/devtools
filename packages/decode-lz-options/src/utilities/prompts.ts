import prompts from 'prompts'
import { handlePromptState } from '@layerzerolabs/io-devtools'

export const promptForRawOptions = () =>
    prompts([
        {
            onState: handlePromptState,
            type: 'text',
            name: 'options',
            message: 'Enter raw options:',
        },
    ])
