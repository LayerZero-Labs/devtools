import { EXAMPLES, PACKAGE_MANAGERS } from '@/config.js'
import prompts from 'prompts'
import { isPackageManagerAvailable } from './installation.js'
import { isDirectory } from './filesystem.js'
import { resolve } from 'path'

const handlePromptState = (state: { aborted: boolean }) => {
    if (state.aborted) {
        // If we don't re-enable the terminal cursor before exiting
        // the program, the cursor will remain hidden
        process.stdout.write('\x1B[?25h')
        process.stdout.write('\n')
        process.exit(1)
    }
}

export const promptForContinue = async () =>
    prompts({
        type: 'confirm',
        name: 'pleasecontinue',
        message: 'Would you like to continue?',
        initial: true,
    }).then(({ pleasecontinue }): boolean => pleasecontinue)

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
