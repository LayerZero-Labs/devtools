import { createOAppFactory } from '@layerzerolabs/ua-devtools'
import { createTronWebFactory } from '@layerzerolabs/devtools-tronbox'

// Example of customizing the OApp factory to use Tronbox's TronWeb
export const createTronOAppFactory = (privateKey: string) => {
    const tronFactory = createTronWebFactory(
        () => 'https://api.shasta.trongrid.io',
        () => privateKey
    )

    return createOAppFactory(async (point) => {
        const tronWeb = await tronFactory(point.eid)
        // Here you would load contract artifacts using tronWeb
        // and return an IOApp-compatible SDK.
        // For demonstration we just return the TronWeb instance as-is.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return tronWeb as unknown as any
    })
}
