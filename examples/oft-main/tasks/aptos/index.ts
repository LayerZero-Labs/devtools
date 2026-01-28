import { createConnectionFactory, createSignerFactory } from '@layerzerolabs/devtools-aptos'
import { createOFTFactory } from '@layerzerolabs/ua-devtools-aptos'

export const createAptosOAppFactory = createOFTFactory
export const createAptosSignerFactory = (privateKey?: string) => {
    const connectionFactory = createConnectionFactory()
    return createSignerFactory(connectionFactory, privateKey)
}
