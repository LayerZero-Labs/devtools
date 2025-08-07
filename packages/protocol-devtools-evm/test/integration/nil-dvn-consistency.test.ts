import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { makeZeroAddress, Provider } from '@layerzerolabs/devtools-evm'
import { Uln302 } from '@/uln302'
import { UlnRead } from '@/ulnRead'
import type { Uln302UlnUserConfig, UlnReadUlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'

// The NIL_DVN_COUNT constant value
const NIL_DVN_COUNT = 255

describe('NIL_DVN_COUNT consistency across SDKs', () => {
    let provider: Provider

    beforeEach(async () => {
        provider = new JsonRpcProvider()
    })

    describe('Empty requiredDVNs behavior', () => {
        it('should be consistent between ULN302 and ULNRead SDKs', () => {
            // Create SDK instances
            const uln302Sdk = new Uln302(provider, {
                eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET,
                address: makeZeroAddress(),
            })
            const ulnReadSdk = new UlnRead(provider, {
                eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET,
                address: makeZeroAddress(),
            })

            // ULN302 config with empty DVNs
            const uln302Config: Uln302UlnUserConfig = {
                requiredDVNs: [],
                optionalDVNs: [],
                optionalDVNThreshold: 0,
                confirmations: BigInt(0),
            }

            // ULNRead config with empty DVNs
            const ulnReadConfig: UlnReadUlnUserConfig = {
                requiredDVNs: [],
                optionalDVNs: [],
                optionalDVNThreshold: 0,
                executor: makeZeroAddress(),
            }

            // Serialize both configs
            const serialized302 = (uln302Sdk as any).serializeUlnConfig(uln302Config)
            const serializedRead = (ulnReadSdk as any).serializeUlnConfig(ulnReadConfig)

            // Both should use NIL_DVN_COUNT
            expect(serialized302.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(serializedRead.requiredDVNCount).toBe(NIL_DVN_COUNT)

            // Optional DVN count should still be 0
            expect(serialized302.optionalDVNCount).toBe(0)
            expect(serializedRead.optionalDVNCount).toBe(0)
        })

        it('should handle non-empty arrays consistently', () => {
            const uln302Sdk = new Uln302(provider, {
                eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET,
                address: makeZeroAddress(),
            })
            const ulnReadSdk = new UlnRead(provider, {
                eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET,
                address: makeZeroAddress(),
            })

            const dvns = [makeZeroAddress(), makeZeroAddress()]

            const uln302Config: Uln302UlnUserConfig = {
                requiredDVNs: dvns,
                optionalDVNs: [makeZeroAddress()],
                optionalDVNThreshold: 1,
                confirmations: BigInt(15),
            }

            const ulnReadConfig: UlnReadUlnUserConfig = {
                requiredDVNs: dvns,
                optionalDVNs: [makeZeroAddress()],
                optionalDVNThreshold: 1,
                executor: makeZeroAddress(),
            }

            const serialized302 = (uln302Sdk as any).serializeUlnConfig(uln302Config)
            const serializedRead = (ulnReadSdk as any).serializeUlnConfig(ulnReadConfig)

            // Both should use actual array length
            expect(serialized302.requiredDVNCount).toBe(2)
            expect(serializedRead.requiredDVNCount).toBe(2)

            // Optional DVN count should be 1
            expect(serialized302.optionalDVNCount).toBe(1)
            expect(serializedRead.optionalDVNCount).toBe(1)
        })
    })

    describe('Edge cases', () => {
        it('should distinguish between empty array (255) and explicit zero override', () => {
            const uln302Sdk = new Uln302(provider, {
                eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET,
                address: makeZeroAddress(),
            })

            // Empty array should give 255
            const emptyConfig: Uln302UlnUserConfig = {
                requiredDVNs: [],
                optionalDVNs: [],
                optionalDVNThreshold: 0,
                confirmations: BigInt(0),
            }
            const serializedEmpty = (uln302Sdk as any).serializeUlnConfig(emptyConfig)
            expect(serializedEmpty.requiredDVNCount).toBe(NIL_DVN_COUNT)

            // But explicit 0 override should be honored
            const explicitZeroConfig: Uln302UlnUserConfig = {
                requiredDVNs: [],
                requiredDVNCount: 0, // Explicit override to use chain defaults
                optionalDVNs: [],
                optionalDVNThreshold: 0,
                confirmations: BigInt(0),
            }
            const serializedZero = (uln302Sdk as any).serializeUlnConfig(explicitZeroConfig)
            expect(serializedZero.requiredDVNCount).toBe(0)
        })
    })
})
