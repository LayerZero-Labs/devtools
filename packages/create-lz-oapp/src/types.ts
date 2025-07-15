import { LogLevel } from '@layerzerolabs/io-devtools'

export interface Config {
    destination: string
    example: Example
    packageManager: PackageManager
    branch?: string
    baseRepository?: string
    logLevel?: LogLevel
}

export interface Example {
    id: string
    label: string
    repository: string
    directory?: string
    ref?: string
    experimental?: string[]
}

export interface PackageManager {
    id: string
    executable: string
    args: string[]
    label: string
}
