import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { formatEid, areBytes32Equal, type Bytes, type OmniAddress, type OmniTransaction } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-starknet'
import { EndpointV2, STARKNET_ENDPOINT_V2_ADDRESSES } from '@layerzerolabs/protocol-devtools-starknet'
import { Contract } from 'starknet'

// OFT ABI from oft-mint-burn-starknet package - includes enforced options functions
const getOftAbi = (): unknown[] => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('@layerzerolabs/oft-mint-burn-starknet')
        return pkg.abi?.oFTMintBurnAdapter
    } catch {
        // Fallback to generic OApp ABI if OFT package not available
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const protocol = require('@layerzerolabs/protocol-starknet-v2')
        return protocol.abi?.oApp
    }
}

const getOFTContract = (address: string, provider: unknown): Contract => {
    const abi = getOftAbi()
    return new (Contract as any)({ abi, address, providerOrAccount: provider })
}

const normalizeHex = (value: string): string => (value.startsWith('0x') ? value.slice(2) : value)

const toFixedBytes = (value: unknown, size: number): Buffer => {
    if (typeof value === 'string') {
        const hex = normalizeHex(value).padStart(size * 2, '0')
        return Buffer.from(hex.slice(-size * 2), 'hex')
    }
    if (typeof value === 'bigint') {
        const hex = value.toString(16).padStart(size * 2, '0')
        return Buffer.from(hex.slice(-size * 2), 'hex')
    }
    if (typeof value === 'number') {
        return toFixedBytes(BigInt(value), size)
    }
    return Buffer.alloc(size)
}

/**
 * Convert hex string to a string for Cairo ByteArray.
 * In starknet.js v8, ByteArray parameters accept plain strings.
 * We convert hex bytes to latin1 encoding which preserves byte values.
 */
const toCairoByteArray = (hex: string): string => {
    const clean = normalizeHex(hex || '')
    if (!clean) {
        return ''
    }
    const buffer = Buffer.from(clean, 'hex')
    return buffer.toString('latin1')
}

const fromCairoByteArray = (value: unknown): string => {
    if (value == null) {
        return '0x'
    }
    if (typeof value === 'string') {
        return value.startsWith('0x') ? value : `0x${value}`
    }
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        return `0x${Buffer.from(value).toString('hex')}`
    }
    if (typeof value === 'object' && value !== null && 'data' in value && 'pending_word' in value) {
        const data = (value as { data?: unknown[] }).data ?? []
        const pendingWord = (value as { pending_word?: unknown }).pending_word
        const pendingLen = Number((value as { pending_word_len?: unknown }).pending_word_len ?? 0)
        const chunks = data.map((entry) => toFixedBytes(entry, 31))
        const pending = pendingLen ? toFixedBytes(pendingWord, pendingLen) : Buffer.alloc(0)
        return `0x${Buffer.concat([...chunks, pending]).toString('hex')}`
    }
    return '0x'
}

export class OFT extends OmniSDK implements IOApp {
    private oapp?: Contract

    async getEndpointSDK(): Promise<EndpointV2> {
        const endpoint = STARKNET_ENDPOINT_V2_ADDRESSES[this.point.eid]
        if (!endpoint) {
            throw new Error(
                `No Starknet EndpointV2 address configured for eid ${this.point.eid} (${formatEid(this.point.eid)})`
            )
        }
        return new EndpointV2(this.provider, { eid: this.point.eid, address: endpoint })
    }

    async getOwner(): Promise<OmniAddress | undefined> {
        return this.getDelegate()
    }

    async hasOwner(_address: OmniAddress): Promise<boolean> {
        const owner = await this.getOwner()
        return owner === _address
    }

    async setOwner(_address: OmniAddress): Promise<OmniTransaction> {
        return this.setDelegate(_address)
    }

    async getPeer(_eid: EndpointId): Promise<OmniAddress | undefined> {
        const oapp = await this.getOApp()
        if (!('get_peer' in oapp)) {
            return this.notImplemented('getPeer')
        }
        const result = await (oapp as any).get_peer(_eid)
        return this.parseFelt(result?.value ?? result)
    }

    async hasPeer(_eid: EndpointId, _address: OmniAddress | null | undefined): Promise<boolean> {
        const peer = await this.getPeer(_eid)
        // Both null/undefined = no peer set
        if (peer == null && _address == null) {
            return true
        }
        // One is null, other is not
        if (peer == null || _address == null) {
            return false
        }
        // Use areBytes32Equal for address comparison to handle leading zero differences
        return areBytes32Equal(peer, _address)
    }

    async setPeer(_eid: EndpointId, _peer: OmniAddress | null | undefined): Promise<OmniTransaction> {
        const oapp = await this.getOApp()
        const peerValue = _peer ? { value: BigInt(_peer) } : { value: 0n }
        const call = (oapp as any).populateTransaction.set_peer(_eid, peerValue)
        return {
            ...this.createTransaction([call]),
            description: `Setting peer for ${formatEid(_eid)} to ${_peer ?? '0x0'}`,
        }
    }

    async getDelegate(): Promise<OmniAddress | undefined> {
        const oapp = await this.getOApp()
        if (!('get_delegate' in oapp)) {
            return this.notImplemented('getDelegate')
        }
        const result = await (oapp as any).get_delegate()
        return this.parseFelt(result)
    }

    async isDelegate(_address: OmniAddress): Promise<boolean> {
        const delegate = await this.getDelegate()
        return delegate === _address
    }

    async setDelegate(_address: OmniAddress): Promise<OmniTransaction> {
        const oapp = await this.getOApp()
        const call = (oapp as any).populateTransaction.set_delegate(_address)
        return {
            ...this.createTransaction([call]),
            description: `Setting delegate to ${_address}`,
        }
    }

    async getEnforcedOptions(_eid: EndpointId, _msgType: number): Promise<Bytes> {
        try {
            const oapp = await this.getOApp()
            if (!('get_enforced_options' in oapp)) {
                // Contract doesn't expose this function - return empty options
                return '0x'
            }
            const result = await (oapp as any).get_enforced_options(_eid, _msgType)
            return fromCairoByteArray(result)
        } catch (error) {
            // If the call fails (e.g., no enforced options set), return empty options
            if (this.isMissingStarknetConfig(error)) {
                return '0x'
            }
            throw error
        }
    }

    private isMissingStarknetConfig(error: unknown): boolean {
        const message =
            typeof error === 'string'
                ? error.toLowerCase()
                : error && typeof error === 'object' && 'message' in error
                  ? String((error as { message?: unknown }).message).toLowerCase()
                  : ''
        if (!message) {
            return false
        }
        // Common patterns for missing config in Starknet
        return message.includes('entry point') || message.includes('not found') || message.includes('contract error')
    }

    async setEnforcedOptions(_enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        const oapp = await this.getOApp()
        // Try both function names - the contract may use either form
        const funcName =
            'set_enforced_options' in oapp
                ? 'set_enforced_options'
                : 'setEnforcedOptions' in oapp
                  ? 'setEnforcedOptions'
                  : null
        if (!funcName) {
            // Contract doesn't support enforced options - return a no-op transaction
            this.logger.warn(`Contract at ${this.point.address} does not support setEnforcedOptions - skipping`)
            return this.createTransaction([])
        }
        const params = _enforcedOptions.map(({ eid, option }) => ({
            eid,
            msg_type: option.msgType,
            options: toCairoByteArray(option.options),
        }))
        const call = (oapp as any).populateTransaction[funcName](params)
        return {
            ...this.createTransaction([call]),
            description: `Setting enforced options for ${params.length} pathway(s)`,
        }
    }

    async getCallerBpsCap(): Promise<bigint | undefined> {
        return this.notImplemented('getCallerBpsCap')
    }

    async setCallerBpsCap(_callerBpsCap: bigint): Promise<OmniTransaction | undefined> {
        return this.notImplemented('setCallerBpsCap')
    }

    private notImplemented(method: string): never {
        throw new TypeError(`${method}() not implemented on Starknet OFT SDK`)
    }

    private async getOApp(): Promise<Contract> {
        if (!this.oapp) {
            this.oapp = getOFTContract(this.point.address, this.provider)
        }
        return this.oapp!
    }

    private parseFelt(value: unknown): string | undefined {
        if (value == null) {
            return undefined
        }
        if (typeof value === 'string') {
            return value
        }
        if (typeof value === 'bigint') {
            return `0x${value.toString(16)}`
        }
        if (typeof value === 'object' && value !== null && 'value' in value) {
            const feltValue = (value as { value: bigint | string }).value
            return typeof feltValue === 'bigint' ? `0x${feltValue.toString(16)}` : String(feltValue)
        }
        return undefined
    }
}
