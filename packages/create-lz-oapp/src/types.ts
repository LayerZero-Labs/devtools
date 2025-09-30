export interface Config {
    destination: string
    example: Example
    packageManager: PackageManager
}

export interface Example {
    id: string
    label: string
    repository: string
    directory?: string
    ref?: string
}

interface PackageManagerBase {
    id: string
    executable: string
    label: string
    hasLockfile: boolean
    versionRegex?: RegExp
}

export type PackageManager = PackageManagerBase & ({ args: string[] } | { commands: string[] })
