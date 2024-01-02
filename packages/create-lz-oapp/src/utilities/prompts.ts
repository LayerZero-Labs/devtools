import { EXAMPLES, PACKAGE_MANAGERS } from '@/config'
import prompts from 'prompts'
import { isPackageManagerAvailable } from './installation'
import { handlePromptState, isDirectory } from '@layerzerolabs/io-devtools'
import { resolve } from 'path'

export const promptForConfig = () =>
    prompts([
        {
            onState: handlePromptState,
            type: 'text',
            name: 'destination',
            message: 'Where do you want to start your project?',
            initial: './my-lz-oapp',
            validate: (path: string) => (isDirectory(path) ? `Directory '${resolve(path)}' already exists` : true),
        },
        {
            onState: handlePromptState,
            type: 'select',
            name: 'example',
            message: 'Which example would you like to use as a starting point?',
            choices: EXAMPLES.map((example) => ({ title: example.label, value: example })),
        },
        {
            onState: handlePromptState,
            type: 'select',
            name: 'packageManager',
            choices: PACKAGE_MANAGERS.filter(isPackageManagerAvailable).map((packageManager) => ({
                title: packageManager.label,
                value: packageManager,
            })),
            message: 'What package manager would you like to use in your project?',
        },
    ])
