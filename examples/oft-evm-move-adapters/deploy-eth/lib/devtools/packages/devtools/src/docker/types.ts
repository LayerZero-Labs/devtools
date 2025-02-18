export type ComposeSpecVersion = '3.9'

export interface ComposeSpecServiceHealthcheck {
    disable?: boolean
    interval?: string
    retries?: number
    test?: string | string[]
    timeout?: string
    start_period?: string
    start_interval?: string
}

export interface ComposeSpecServiceBuild {
    context?: string
    dockerfile?: string
    dockerfile_inline?: string
    args?: ListOrDict
    ssh?: ListOrDict
    labels?: ListOrDict
    cache_from?: string[]
    cache_to?: string[]
    no_cache?: boolean
    network?: string
    pull?: boolean
    target?: string
    privileged?: boolean
    tags?: string[]
    platforms?: string[]
}

export interface ComposeSpecPortDefinition {
    name?: string
    mode?: string
    host_ip?: string
    target?: number
    published?: string | number
    protocol?: string
}

export type ComposeSpecPortNumber = string | number

export type ComposeSpecPort =
    | `${ComposeSpecPortNumber}:${ComposeSpecPortNumber}`
    | ComposeSpecPortNumber
    | ComposeSpecPortDefinition

export interface ComposeSpecServiceVolumeDefinition {
    type: string
    source?: string
    target?: string
    read_only?: boolean
    consistency?: string
    bind?: {
        propagation?: string
        create_host_path?: boolean
        selinux?: 'z' | 'Z'
    }
    volume?: {
        nocopy?: boolean
    }
    tmpfs?: {
        size?: number | string
        mode?: number
    }
}

export type ComposeSpecServiceVolume = string | ComposeSpecServiceVolumeDefinition

export type ComposeSpecDependencyCondition = 'service_started' | 'service_healthy' | 'service_completed_successfully'

export interface ComposeSpecDependsOnDefinition {
    restart?: boolean
    required?: boolean
    condition: ComposeSpecDependencyCondition
}

export type ComposeSpecServiceDependsOn = string[] | Record<string, ComposeSpecDependsOnDefinition>

export type ComposeSpecServiceCommand = string | string[]

export interface ComposeSpecService {
    depends_on?: ComposeSpecServiceDependsOn
    build?: string | ComposeSpecServiceBuild
    image?: string
    expose?: ComposeSpecPortNumber[]
    command?: ComposeSpecServiceCommand
    ports?: ComposeSpecPort[]
    volumes?: ComposeSpecServiceVolume[]
    healthcheck?: ComposeSpecServiceHealthcheck
}

export type ComposeSpecServices = Record<string, ComposeSpecService>

export interface ComposeSpecVolumeDefinition {
    name?: string
    driver?: string
    driver_opts?: Record<string, string | number>
    labels?: ListOrDict
}

export type ComposeSpecVolume = null | ComposeSpecVolumeDefinition

export type ComposeSpecVolumes = Record<string, ComposeSpecVolume>

export interface ComposeSpec {
    version?: ComposeSpecVersion
    services?: ComposeSpecServices
    volumes?: ComposeSpecVolumes
}

export type ListOrDict = Record<string, string | number | boolean | null> | string[]
