import type { OmniAddress, OmniTransaction, Bytes } from '@layerzerolabs/devtools'
import { areBytes32Equal } from '@layerzerolabs/devtools'
import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import type { IEndpointV2 } from '@layerzerolabs/protocol-devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    OmniSDK,
    type ConnectionFactory,
    hexAddrToAptosBytesAddr,
    normalizeAddressToBytes32,
} from '@layerzerolabs/devtools-aptos'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-aptos'

/**
 * Aptos OFT SDK implementing the IOApp interface
 *
 * This SDK provides methods to interact with LayerZero OFT contracts on Aptos.
 */
export class OFT extends OmniSDK implements IOApp {
    private endpoint?: EndpointV2

    constructor(
        point: { eid: EndpointId; address: OmniAddress },
        connectionFactory?: ConnectionFactory,
        private readonly endpointAddress?: string
    ) {
        // Cast to any to handle potential lz-definitions version mismatches between packages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(point as any, connectionFactory)
    }

    /**
     * Get the EndpointV2 SDK for this OFT
     */
    async getEndpointSDK(): Promise<IEndpointV2> {
        if (this.endpoint) {
            return this.endpoint
        }

        // Create endpoint SDK - the endpoint address may come from config or use a default
        this.endpoint = new EndpointV2(
            {
                eid: this.point.eid,
                address: this.endpointAddress ?? this.point.address,
            },
            this.connectionFactory
        )

        return this.endpoint
    }

    /**
     * Get the owner/admin of this OFT
     */
    async getOwner(): Promise<OmniAddress | undefined> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.point.address}::oapp_core::get_admin`,
                    functionArguments: [],
                },
            })
            return result[0] as string | undefined
        } catch {
            return undefined
        }
    }

    /**
     * Check if address is the owner
     */
    async hasOwner(address: OmniAddress): Promise<boolean> {
        const owner = await this.getOwner()
        return owner?.toLowerCase() === address.toLowerCase()
    }

    /**
     * Set the owner/admin (transfer admin)
     */
    async setOwner(address: OmniAddress): Promise<OmniTransaction> {
        return {
            point: this.point,
            data: JSON.stringify({
                function: `${this.point.address}::oapp_core::transfer_admin`,
                functionArguments: [address],
                types: ['address'],
            }),
            description: `Transferring admin to ${address}`,
        }
    }

    /**
     * Get the peer address for a given endpoint ID
     */
    async getPeer(eid: EndpointId): Promise<OmniAddress | undefined> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.point.address}::oapp_core::get_peer`,
                    functionArguments: [eid],
                },
            })

            const peer = result[0] as string | undefined
            if (!peer || peer === '0x' + '0'.repeat(64)) {
                return undefined
            }

            return peer
        } catch {
            return undefined
        }
    }

    /**
     * Check if a peer is set for a given endpoint ID
     *
     * Uses areBytes32Equal for proper comparison across different address formats
     */
    async hasPeer(eid: EndpointId, address: OmniAddress | null | undefined): Promise<boolean> {
        const currentPeer = await this.getPeer(eid)

        // If no peer is expected and no peer is set, return true
        if (!address && !currentPeer) {
            return true
        }

        // If one is set and the other isn't, return false
        if (!address || !currentPeer) {
            return false
        }

        // Use bytes32 comparison for cross-chain address equality
        return areBytes32Equal(normalizeAddressToBytes32(currentPeer), normalizeAddressToBytes32(address))
    }

    /**
     * Set the peer address for a given endpoint ID
     */
    async setPeer(eid: EndpointId, peer: OmniAddress | null | undefined): Promise<OmniTransaction> {
        const peerBytes = hexAddrToAptosBytesAddr(peer)

        return {
            point: this.point,
            data: JSON.stringify({
                function: `${this.point.address}::oapp_core::set_peer`,
                functionArguments: [eid, Array.from(peerBytes)],
                types: ['u32', 'u8'],
            }),
            description: `Setting peer for eid ${eid} to ${peer}`,
        }
    }

    /**
     * Get the delegate address
     */
    async getDelegate(): Promise<OmniAddress | undefined> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.point.address}::oapp_core::get_delegate`,
                    functionArguments: [],
                },
            })
            return result[0] as string | undefined
        } catch {
            return undefined
        }
    }

    /**
     * Check if address is the delegate
     */
    async isDelegate(address: OmniAddress): Promise<boolean> {
        const delegate = await this.getDelegate()
        return delegate?.toLowerCase() === address.toLowerCase()
    }

    /**
     * Set the delegate address
     */
    async setDelegate(address: OmniAddress): Promise<OmniTransaction> {
        return {
            point: this.point,
            data: JSON.stringify({
                function: `${this.point.address}::oapp_core::set_delegate`,
                functionArguments: [address],
                types: ['address'],
            }),
            description: `Setting delegate to ${address}`,
        }
    }

    /**
     * Get enforced options for a given endpoint ID and message type
     */
    async getEnforcedOptions(eid: EndpointId, msgType: number): Promise<Bytes> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.point.address}::oapp_core::get_enforced_options`,
                    functionArguments: [eid, msgType],
                },
            })

            const options = result[0]
            if (!options) {
                return '0x'
            }

            // Convert array of numbers to hex string if needed
            if (Array.isArray(options)) {
                return '0x' + Buffer.from(options as number[]).toString('hex')
            }

            return options as string
        } catch {
            return '0x'
        }
    }

    /**
     * Set enforced options
     */
    async setEnforcedOptions(enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        // Aptos requires setting options one at a time per eid/msgType combination
        // If there are multiple options, we need to batch them
        if (enforcedOptions.length === 0) {
            return {
                point: this.point,
                data: '0x',
                description: 'No enforced options to set',
            }
        }

        // For single option
        if (enforcedOptions.length === 1) {
            const opt = enforcedOptions[0]!
            const optionsBytes = this.hexToBytes(opt.option.options)

            return {
                point: this.point,
                data: JSON.stringify({
                    function: `${this.point.address}::oapp_core::set_enforced_options`,
                    functionArguments: [opt.eid, opt.option.msgType, Array.from(optionsBytes)],
                    types: ['u32', 'u16', 'u8'],
                }),
                description: `Setting enforced options for eid ${opt.eid}, msgType ${opt.option.msgType}`,
            }
        }

        // For multiple options, return the first one (caller should handle batching)
        const opt = enforcedOptions[0]!
        const optionsBytes = this.hexToBytes(opt.option.options)

        return {
            point: this.point,
            data: JSON.stringify({
                function: `${this.point.address}::oapp_core::set_enforced_options`,
                functionArguments: [opt.eid, opt.option.msgType, Array.from(optionsBytes)],
                types: ['u32', 'u16', 'u8'],
            }),
            description: `Setting enforced options for eid ${opt.eid}, msgType ${opt.option.msgType} (1 of ${enforcedOptions.length})`,
        }
    }

    /**
     * Get caller BPS cap
     */
    async getCallerBpsCap(): Promise<bigint | undefined> {
        // Aptos OFT may not have caller BPS cap
        // Return undefined to indicate not applicable
        return undefined
    }

    /**
     * Set caller BPS cap
     */
    async setCallerBpsCap(_callerBpsCap: bigint): Promise<OmniTransaction | undefined> {
        // Aptos OFT may not have caller BPS cap
        return undefined
    }

    /**
     * Convert hex string to Uint8Array
     */
    private hexToBytes(hex: string): Uint8Array {
        const cleanHex = hex.replace('0x', '')
        const bytes = new Uint8Array(cleanHex.length / 2)
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16)
        }
        return bytes
    }
}
