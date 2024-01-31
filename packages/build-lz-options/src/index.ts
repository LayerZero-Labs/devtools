import { withMutedConsole } from '@layerzerolabs/io-devtools'
import { Command } from 'commander'
import { version } from '../package.json'

new Command('build-lz-options')
    .description('Build Options for LayerZero OApps')
    .version(version)
    .action(async () => {
        // We'll mute the console when importing the command because of
        // warnings related to bigint-buffer.

        // For this we'll need to asynchronously import the code that in turn imports
        // the functionality that triggers this warning
        //
        // See https://github.com/no2chem/bigint-buffer/issues/31
        const { buildLZOptions } = await withMutedConsole(() => import('@/commands'))

        await buildLZOptions()
    })
    .parseAsync()
