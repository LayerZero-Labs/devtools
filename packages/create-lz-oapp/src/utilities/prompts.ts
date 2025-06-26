import { getExamples, getAvailablePackageManagers } from '@/config'
import prompts, { type Choice } from 'prompts'
import { handlePromptState, isDirectory, isFile } from '@layerzerolabs/io-devtools'
import { resolve } from 'path'
import type { Config } from '@/types'

export const promptForConfig = async (config: Partial<Config> = {}): Promise<Config> => {
    const examples = await getExamples(config.branch, config.baseRepository, config.logLevel)
    const packageManagers = getAvailablePackageManagers()

    return prompts([
        {
            onState: handlePromptState,
            type: 'text',
            name: 'destination',
            message: 'Where do you want to start your project?',
            initial: config.destination ?? './my-lz-oapp',
            validate: (path: string) =>
                isDirectory(path)
                    ? `Directory '${resolve(path)}' already exists`
                    : isFile(path)
                      ? `File '${resolve(path)}' already exists`
                      : true,
        },
        {
            onState: handlePromptState,
            type: 'select',
            name: 'example',
            message: 'Which example would you like to use as a starting point?',
            choices: examples
                .map((example) => ({
                    title: example.label,
                    value: example,
                    selected: example.id === config.example?.id,
                }))
                .sort(sortBySelected),
        },
        {
            onState: handlePromptState,
            type: 'select',
            name: 'packageManager',
            choices: packageManagers
                .map((packageManager) => ({
                    title: packageManager.label,
                    value: packageManager,
                    selected: packageManager.id === config.packageManager?.id,
                }))
                .sort(sortBySelected),
            message: 'What package manager would you like to use in your project?',
        },
    ])
}

/**
 * prompts has a weird issue where even if the selected property is set
 * on a particular choice, it will not preselect it - instead, the first choice will be selected.
 *
 * To remedy this, we'll sort the choices and put the selected one first,
 * mimicking the behavior of preselection
 *
 * @param {Choice} a
 * @param {Choice} b
 * @returns {number}
 */
const sortBySelected = (a: Choice, b: Choice): number => Number(b.selected) - Number(a.selected)
