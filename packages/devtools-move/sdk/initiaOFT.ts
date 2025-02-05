import { Aptos, SimpleTransaction } from '@aptos-labs/ts-sdk'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IOFTInterface } from './IOFTInterface'
import { OFTType, TypedInputGenerateTransactionPayloadData } from './oft'
import { bcs, RESTClient } from '@initia/initia.js'

type ViewFunctionResult = {
    type: string
    value: string[]
}

export class InitiaOFT implements IOFTInterface {
    public moveVMConnection: Aptos | RESTClient
    public oft_address: string
    public eid: EndpointId
    private rest: RESTClient

    constructor(moveVMConnection: Aptos | RESTClient, oft_address: string, eid: EndpointId) {
        this.moveVMConnection = moveVMConnection
        this.oft_address = oft_address
        this.eid = eid

        if (moveVMConnection instanceof RESTClient) {
            this.rest = moveVMConnection
        } else {
            this.rest = new RESTClient('https://rest.testnet.initia.xyz', {
                chainId: 'initiation-2',
                gasPrices: '0.15uinit',
                gasAdjustment: '1.75',
            })
        }
    }

    initializeOFTFAPayload(
        token_name: string,
        symbol: string,
        icon_uri: string,
        project_uri: string,
        shared_decimals: number,
        local_decimals: number
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    createSetRateLimitTx(
        eid: EndpointId,
        limit: number | bigint,
        window_seconds: number | bigint,
        oftType: OFTType
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    createUnsetRateLimitTx(eid: EndpointId, oftType: OFTType): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    async getRateLimitConfig(eid: EndpointId, oftType: OFTType): Promise<[bigint, bigint]> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            oftType,
            'rate_limit_config',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )) as ViewFunctionResult

        const limit = bcs.u64().parse(Buffer.from(result.value[0], 'base64'))
        const window = bcs.u64().parse(Buffer.from(result.value[1], 'base64'))
        return [BigInt(limit), BigInt(window)]
    }

    createSetFeeBpsTx(fee_bps: number | bigint, oftType: OFTType): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    async getFeeBps(oftType: OFTType): Promise<bigint> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            oftType,
            'fee_bps',
            [],
            []
        )) as ViewFunctionResult
        const feeBps = bcs.u64().parse(Buffer.from(result.value[0], 'base64'))
        return BigInt(feeBps)
    }

    mintPayload(recipient: string, amount: number | bigint): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    async getBalance(account: string): Promise<number> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            'oft',
            'balance',
            [],
            [bcs.address().serialize(account).toBase64()]
        )) as ViewFunctionResult
        return Number(bcs.u64().parse(Buffer.from(result.value[0], 'base64')))
    }

    async quoteSend(
        userSender: string,
        dst_eid: number,
        to: Uint8Array,
        amount_ld: number | bigint,
        min_amount_ld: number | bigint,
        extra_options: Uint8Array,
        compose_message: Uint8Array,
        oft_cmd: Uint8Array,
        pay_in_zro: boolean
    ): Promise<[number, number]> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            'oft',
            'quote_send',
            [],
            [
                bcs.address().serialize(userSender).toBase64(),
                bcs.u32().serialize(dst_eid).toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...to])
                    .toBase64(),
                bcs.u64().serialize(amount_ld).toBase64(),
                bcs.u64().serialize(min_amount_ld).toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...extra_options])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...compose_message])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...oft_cmd])
                    .toBase64(),
                bcs.bool().serialize(pay_in_zro).toBase64(),
            ]
        )) as ViewFunctionResult

        const nativeFee = Number(bcs.u64().parse(Buffer.from(result.value[0], 'base64')))
        const zroFee = Number(bcs.u64().parse(Buffer.from(result.value[1], 'base64')))
        return [nativeFee, zroFee]
    }

    sendPayload(
        dst_eid: number,
        to: Uint8Array,
        amount_ld: number | bigint,
        min_amount_ld: number | bigint,
        extra_options: Uint8Array,
        compose_message: Uint8Array,
        oft_cmd: Uint8Array,
        native_fee: number | bigint,
        zro_fee: number | bigint
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    setPeerPayload(eid: EndpointId, peerAddress: string): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    setDelegatePayload(delegateAddress: string): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    async getDelegate(): Promise<string> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            'oapp_core',
            'get_delegate',
            [],
            []
        )) as ViewFunctionResult
        return bcs.address().parse(Buffer.from(result.value[0], 'base64'))
    }

    async getAdmin(): Promise<string> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            'oapp_core',
            'get_admin',
            [],
            []
        )) as ViewFunctionResult
        return bcs.address().parse(Buffer.from(result.value[0], 'base64'))
    }

    transferAdminPayload(adminAddress: string): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    transferObjectPayload(object_address: string, new_owner_address: string): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    renounceAdminPayload(): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    async getPeer(eid: EndpointId): Promise<string> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            'oapp_core',
            'get_peer',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )) as ViewFunctionResult
        return bcs.address().parse(Buffer.from(result.value[0], 'base64'))
    }

    async hasPeer(eid: EndpointId): Promise<boolean> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            'oapp_core',
            'has_peer',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )) as ViewFunctionResult
        return bcs.bool().parse(Buffer.from(result.value[0], 'base64'))
    }

    setEnforcedOptionsPayload(
        eid: number,
        msgType: number,
        enforcedOptions: Uint8Array
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    async getEnforcedOptions(eid: number, msgType: number): Promise<string> {
        const result = (await this.rest.move.viewFunction(
            this.oft_address,
            'oapp_core',
            'get_enforced_options',
            [],
            [bcs.u32().serialize(eid).toBase64(), bcs.u16().serialize(msgType).toBase64()]
        )) as ViewFunctionResult
        return bcs.string().parse(Buffer.from(result.value[0], 'base64'))
    }

    setSendLibraryPayload(remoteEid: number, msglibAddress: string): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    setReceiveLibraryPayload(
        remoteEid: number,
        msglibAddress: string,
        gracePeriod: number
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    setReceiveLibraryTimeoutPayload(
        remoteEid: number,
        msglibAddress: string,
        expiry: number
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    setConfigPayload(
        msgLibAddress: string,
        eid: number,
        configType: number,
        config: Uint8Array
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    irrevocablyDisableBlocklistPayload(oftType: OFTType): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    permanentlyDisableFungibleStoreFreezingPayload(): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }

    async signSubmitAndWaitForTx(transaction: SimpleTransaction): Promise<any> {
        throw new Error('Method not implemented.')
    }

    initializeAdapterFAPayload(
        tokenMetadataAddress: string,
        sharedDecimals: number
    ): TypedInputGenerateTransactionPayloadData {
        throw new Error('Method not implemented.')
    }
}
