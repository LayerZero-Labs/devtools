export interface ITimeMarkerResolverChainSdk {
    resolveTimestamps(timestamps: number[]): Promise<{ [timestamp: number]: number }>
}
