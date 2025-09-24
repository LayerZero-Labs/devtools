import type { Config, PackageManager } from '@/types'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { spawn, spawnSync } from 'child_process'
import which from 'which'

const runCommand = (command: string, args: string[], cwd: string, packageManager: PackageManager) =>
    new Promise<void>((resolve, reject) => {
        const logger = createModuleLogger('installation')

        // We'll store combined stdout and stderr in this variable
        const std: string[] = []

        // This function will handle stdout/stderr streams from the child process
        const handleStd = (chunk: string) => {
            std.push(chunk)

            logger.verbose(chunk)
        }

        /**
         * Spawn the installation process.
         */
        const child = spawn(command, args, {
            cwd,
            env: {
                ...process.env,
                ADBLOCK: '1',
                // we set NODE_ENV to development as pnpm skips dev
                // dependencies when production
                NODE_ENV: 'development',
                DISABLE_OPENCOLLECTIVE: '1',
            },
        })

        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        child.stdout.on('data', handleStd)
        child.stderr.on('data', handleStd)

        child.on('close', (code) => {
            switch (code) {
                // The null case happens when the script receives a sigterm signall
                // (i.e. is cancelled by the user)
                case null:
                    return reject(new Error(`Failed to install dependencies: Installation interrupted`))

                // 0 exit code means success
                case 0:
                    return resolve()

                // And any other non-zero exit code means an error
                default:
                    return reject(new InstallationError(packageManager, code, std.join('')))
            }
        })
    })

export const installDependencies = async (config: Config) => {
    if ('args' in config.packageManager) {
        await runCommand(
            config.packageManager.executable,
            config.packageManager.args,
            config.destination,
            config.packageManager
        )
        return
    }
    for (const command of config.packageManager.commands) {
        const [cmd, ...args] = command.split(' ')
        if (!cmd) {
            continue
        }
        await runCommand(cmd, args, config.destination, config.packageManager)
    }
}

export const getPackageManagerVersion = ({ executable }: PackageManager): string | null => {
    try {
        const result = spawnSync(executable, ['--version'], { encoding: 'utf8' })
        if (result.status === 0 && result.stdout) {
            return result.stdout.trim()
        }
        return null
    } catch {
        return null
    }
}

export const isPackageManagerAvailable = (packageManager: PackageManager): boolean => {
    const { executable, versionRegex } = packageManager
    if (!versionRegex) {
        return which.sync(executable, { nothrow: true }) !== null
    }
    const version = getPackageManagerVersion(packageManager)
    return !version ? false : versionRegex.test(version)
}

export class InstallationError extends Error {
    constructor(
        public readonly packageManager: PackageManager,
        public readonly exitCode: number,
        public readonly stdout: string,
        message: string = `Failed to install dependencies: ${packageManager.label} exited with code ${exitCode}`
    ) {
        super(message)
    }
}
