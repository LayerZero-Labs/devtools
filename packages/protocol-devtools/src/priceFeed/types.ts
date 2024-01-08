import type { Factory, IOmniSDK, OmniGraph, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IPriceFeed extends IOmniSDK {
    getPrice(eid: EndpointId): Promise<PriceData>
    setPrice(eid: EndpointId, priceData: PriceData): Promise<OmniTransaction>
}

export interface PriceData {
    priceRatio: bigint | string | number
    gasPriceInUnit: bigint | string | number
    gasPerByte: bigint | string | number
}

export interface PriceFeedEdgeConfig {
    priceData: PriceData
}

export type PriceFeedOmniGraph = OmniGraph<unknown, PriceFeedEdgeConfig>

export type PriceFeedFactory<TPriceFeed extends IPriceFeed = IPriceFeed, TOmniPoint = OmniPoint> = Factory<
    [TOmniPoint],
    TPriceFeed
>
