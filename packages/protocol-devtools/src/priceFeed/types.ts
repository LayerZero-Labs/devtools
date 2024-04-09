import type {
    Configurator,
    IOmniSDK,
    OmniGraph,
    OmniPoint,
    OmniSDKFactory,
    OmniTransaction,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IPriceFeed extends IOmniSDK {
    getPrice(eid: EndpointId): Promise<PriceData>
    setPrice(eid: EndpointId, priceData: PriceData): Promise<OmniTransaction>
}

export interface PriceData {
    priceRatio: bigint
    gasPriceInUnit: bigint
    gasPerByte: bigint
}

export interface PriceFeedEdgeConfig {
    priceData: PriceData
}

export type PriceFeedOmniGraph = OmniGraph<unknown, PriceFeedEdgeConfig>

export type PriceFeedFactory<TPriceFeed extends IPriceFeed = IPriceFeed, TOmniPoint = OmniPoint> = OmniSDKFactory<
    TPriceFeed,
    TOmniPoint
>

export type PriceFeedConfigurator<TPriceFeed extends IPriceFeed = IPriceFeed> = Configurator<
    PriceFeedOmniGraph,
    TPriceFeed
>
