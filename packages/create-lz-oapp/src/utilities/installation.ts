import type { Config, PackageManager } from '@/types'
import { spawn } from 'child_process'
import which from 'which'

export const installDependencies = (config: Config) =>
    new Promise<void>((resolve, reject) => {
        /**
         * Spawn the installation process.
         */
        const child = spawn(config.packageManager.command, ['install'], {
            cwd: config.destination,
            env: {
                ...process.env,
                ADBLOCK: '1',
                // we set NODE_ENV to development as pnpm skips dev
                // dependencies when production
                NODE_ENV: 'development',
                DISABLE_OPENCOLLECTIVE: '1',
            },
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `Failed to install dependencies: ${config.packageManager.label} install exited with code ${code}`
                    )
                )
            } else resolve()
        })
    })

export const isPackageManagerAvailable = ({ command }: PackageManager): boolean =>
    !!which.sync(command, { nothrow: true })
