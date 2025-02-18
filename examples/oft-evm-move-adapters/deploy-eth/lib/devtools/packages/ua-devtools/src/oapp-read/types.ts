import type {
    BaseExecutorOption,
    ExecutorComposeOption,
    ExecutorOrderedExecutionOption,
    IOApp,
    OAppEdgeConfig,
    OAppNodeConfig,
} from '@/oapp/types'
import type {
    Configurator,
    OmniGraph,
    OmniPoint,
    OmniSDKFactory,
    OmniTransaction,
    PossiblyBigInt,
} from '@layerzerolabs/devtools'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import type { UlnReadUlnUserConfig } from '@layerzerolabs/protocol-devtools'

export interface IOAppRead extends IOApp {
    setReadChannel(channelId: number, active: boolean): Promise<OmniTransaction>
    isReadChannelActive(channelId: number): Promise<boolean>
}

export interface ExecutorLzReadOption extends BaseExecutorOption {
    optionType: ExecutorOptionType.LZ_READ
    gas: PossiblyBigInt
    size: PossiblyBigInt
    value?: PossiblyBigInt
}

export type OAppReadEnforcedOption = ExecutorLzReadOption | ExecutorComposeOption | ExecutorOrderedExecutionOption

export interface OAppReadChannels {
    contract: OmniPoint
    channelId: number
    isActive: boolean
}

export interface OAppReadChannelConfig {
    channelId: number
    active?: boolean
    readLibrary?: string
    ulnConfig?: UlnReadUlnUserConfig
    enforcedOptions?: OAppReadEnforcedOption[]
}

export interface OAppReadNodeConfig extends OAppNodeConfig {
    readChannelConfigs?: OAppReadChannelConfig[]
}

export type OAppReadOmniGraph = OmniGraph<OAppReadNodeConfig | undefined, OAppEdgeConfig | undefined>

export type OAppReadFactory<TOAppRead extends IOAppRead = IOAppRead, TOmniPoint = OmniPoint> = OmniSDKFactory<
    TOAppRead,
    TOmniPoint
>

export type OAppReadConfigurator<TOAppRead extends IOAppRead = IOAppRead> = Configurator<OAppReadOmniGraph, TOAppRead>
