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
    id: string
    executable: string
    args: string[]
    label: string
}
