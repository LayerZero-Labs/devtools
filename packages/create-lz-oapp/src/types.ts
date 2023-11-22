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

export interface PackageManager {
    command: string
    label: string
}
