import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IOFT, TypedInputGenerateTransactionPayloadData, OFTType } from './IOFT'
import { bcs, MsgExecute, RawKey, RESTClient, Wallet } from '@initia/initia.js'

type ViewFunctionResult = {
    type: string
    value: string[]
}

export class InitiaOFT implements IOFT {
    public moveVMConnection: RESTClient
    public oft_address: string
    public eid: EndpointId
    public accountAddress: string
    private rest: RESTClient
    private wallet: Wallet

    constructor(
        moveVMConnection: RESTClient,
        oftAddress: string,
        accountAddress: string,
        privateKey: string,
        eid: EndpointId
    ) {
        this.moveVMConnection = moveVMConnection
        this.oft_address = oftAddress
        this.eid = eid
        const rawKey = RawKey.fromHex(privateKey)
        this.wallet = new Wallet(moveVMConnection as RESTClient, rawKey)
        this.rest = moveVMConnection as RESTClient
        this.accountAddress = accountAddress
    }

    initializeOFTFAPayload(
        token_name: string,
        symbol: string,
        icon_uri: string,
        project_uri: string,
        shared_decimals: number,
        local_decimals: number
    ): TypedInputGenerateTransactionPayloadData {
        const encoder = new TextEncoder()
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oft_fa',
            'initialize',
            [],
            [
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(token_name)])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(symbol)])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(icon_uri)])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(project_uri)])
                    .toBase64(),
                bcs.u8().serialize(shared_decimals).toBase64(),
                bcs.u8().serialize(local_decimals).toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['u8', 'u8', 'u8', 'u8', 'u8', 'u8'] })
    }

    initializeOFTPayload(
        token_name: string,
        symbol: string,
        icon_uri: string,
        project_uri: string,
        shared_decimals: number,
        local_decimals: number
    ): TypedInputGenerateTransactionPayloadData {
        const encoder = new TextEncoder()
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oft',
            'initialize',
            [],
            [
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(token_name)])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(symbol)])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(icon_uri)])
                    .toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...encoder.encode(project_uri)])
                    .toBase64(),
                bcs.u8().serialize(shared_decimals).toBase64(),
                bcs.u8().serialize(local_decimals).toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['u8', 'u8', 'u8', 'u8', 'u8', 'u8'] })
    }

    createSetRateLimitTx(
        eid: EndpointId,
        limit: number | bigint,
        window_seconds: number | bigint,
        oftType: OFTType
    ): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            oftType,
            'set_rate_limit',
            [],
            [
                bcs.u32().serialize(eid).toBase64(),
                bcs.u64().serialize(limit).toBase64(),
                bcs.u64().serialize(window_seconds).toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['u32', 'u64', 'u64'] })
    }

    createUnsetRateLimitTx(eid: EndpointId, oftType: OFTType): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            oftType,
            'unset_rate_limit',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )
        return Object.assign(msg, { types: ['u32'] })
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
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            oftType,
            'set_fee_bps',
            [],
            [bcs.u64().serialize(fee_bps).toBase64()]
        )
        return Object.assign(msg, { types: ['u64'] })
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
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oft_fa',
            'mint',
            [],
            [bcs.address().serialize(recipient).toBase64(), bcs.u64().serialize(amount).toBase64()]
        )
        return Object.assign(msg, { types: ['address', 'u64'] })
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
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oft',
            'send_withdraw',
            [],
            [
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
                bcs.u64().serialize(native_fee).toBase64(),
                bcs.u64().serialize(zro_fee).toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['u32', 'u8', 'u64', 'u64', 'u8', 'u8', 'u8', 'u64', 'u64'] })
    }

    setPeerPayload(eid: EndpointId, peerAddress: string): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_peer',
            [],
            [bcs.u32().serialize(eid).toBase64(), bcs.address().serialize(peerAddress).toBase64()]
        )
        return Object.assign(msg, { types: ['u32', 'address'] })
    }

    setDelegatePayload(delegateAddress: string): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_delegate',
            [],
            [bcs.address().serialize(delegateAddress).toBase64()]
        )
        return Object.assign(msg, { types: ['address'] })
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
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'transfer_admin',
            [],
            [bcs.address().serialize(adminAddress).toBase64()]
        )
        return Object.assign(msg, { types: ['address'] })
    }

    transferObjectPayload(object_address: string, new_owner_address: string): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            '0x1',
            'object',
            'transfer',
            [],
            [bcs.address().serialize(object_address).toBase64(), bcs.address().serialize(new_owner_address).toBase64()]
        )
        return Object.assign(msg, { types: ['address', 'address'] })
    }

    renounceAdminPayload(): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(this.accountAddress, this.oft_address, 'oapp_core', 'renounce_admin', [], [])
        return Object.assign(msg, { types: [] })
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
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_enforced_options',
            [],
            [
                bcs.u32().serialize(eid).toBase64(),
                bcs.u16().serialize(msgType).toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...enforcedOptions])
                    .toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['u32', 'u16', 'u8'] })
    }

    setSendLibraryPayload(remoteEid: number, msglibAddress: string): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_send_library',
            [],
            [bcs.u32().serialize(remoteEid).toBase64(), bcs.address().serialize(msglibAddress).toBase64()]
        )
        return Object.assign(msg, { types: ['u32', 'address'] })
    }

    setReceiveLibraryPayload(
        remoteEid: number,
        msglibAddress: string,
        gracePeriod: number
    ): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_receive_library',
            [],
            [
                bcs.u32().serialize(remoteEid).toBase64(),
                bcs.address().serialize(msglibAddress).toBase64(),
                bcs.u64().serialize(gracePeriod).toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['u32', 'address', 'u64'] })
    }

    setReceiveLibraryTimeoutPayload(
        remoteEid: number,
        msglibAddress: string,
        expiry: number
    ): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_receive_library_timeout',
            [],
            [
                bcs.u32().serialize(remoteEid).toBase64(),
                bcs.address().serialize(msglibAddress).toBase64(),
                bcs.u64().serialize(expiry).toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['u32', 'address', 'u64'] })
    }

    setConfigPayload(
        msgLibAddress: string,
        eid: number,
        configType: number,
        config: Uint8Array
    ): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_config',
            [],
            [
                bcs.address().serialize(msgLibAddress).toBase64(),
                bcs.u32().serialize(eid).toBase64(),
                bcs.u32().serialize(configType).toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...config])
                    .toBase64(),
            ]
        )
        return Object.assign(msg, { types: ['address', 'u32', 'u32', 'u8'] })
    }

    irrevocablyDisableBlocklistPayload(oftType: OFTType): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            oftType,
            'irrevocably_disable_blocklist',
            [],
            []
        )
        return Object.assign(msg, { types: [] })
    }

    permanentlyDisableFungibleStoreFreezingPayload(): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oft_fa',
            'permanently_disable_fungible_store_freezing',
            [],
            []
        )
        return Object.assign(msg, { types: [] })
    }

    async signSubmitAndWaitForTx(transaction: MsgExecute): Promise<any> {
        const signedTx = await this.wallet.createAndSignTx({
            msgs: [transaction as MsgExecute],
            memo: 'LayerZero OFT transaction',
        })

        const result = await this.rest.tx.broadcast(signedTx)

        return result
    }

    async getSequenceNumber(): Promise<number> {
        // throw new Error('Method not implemented.')
        console.log('getSequenceNumber')
        return 0
    }

    async syncSequenceNumber(): Promise<void> {
        // throw new Error('Method not implemented.')
        console.log('syncSequenceNumber')
    }

    initializeAdapterFAPayload(
        tokenMetadataAddress: string,
        sharedDecimals: number
    ): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oft_adapter_fa',
            'initialize',
            [],
            [bcs.address().serialize(tokenMetadataAddress).toBase64(), bcs.u8().serialize(sharedDecimals).toBase64()]
        )
        return Object.assign(msg, { types: ['address', 'u8'] })
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
}
