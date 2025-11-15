import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IOFT, TypedInputGenerateTransactionPayloadData, OFTType } from './IOFT'
import { bcs, MsgExecute, RawKey, RESTClient, Wallet } from '@initia/initia.js'
import { hexAddrToAptosBytesAddr } from './utils'

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
        return Object.assign(msg, {
            multiSigArgs: [token_name, symbol, icon_uri, project_uri, shared_decimals, local_decimals],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [token_name, symbol, icon_uri, project_uri, shared_decimals, local_decimals],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [eid, limit, window_seconds, oftType],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [eid, oftType],
        })
    }

    async getRateLimitConfig(eid: EndpointId, oftType: OFTType): Promise<[bigint, bigint]> {
        const result = await this.rest.move.viewFunction<string[]>(
            this.oft_address,
            oftType,
            'rate_limit_config',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )

        const limit = result[0]
        const window = result[1]
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
        return Object.assign(msg, {
            multiSigArgs: [fee_bps, oftType],
        })
    }

    async getFeeBps(oftType: OFTType): Promise<bigint> {
        const result = await this.rest.move.viewFunction<string>(this.oft_address, oftType, 'fee_bps', [], [])
        return BigInt(result)
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
        return Object.assign(msg, {
            multiSigArgs: [recipient, amount],
        })
    }

    async getBalance(account: string): Promise<number> {
        const result = await this.rest.move.viewFunction<string>(
            this.oft_address,
            'oft',
            'balance',
            [],
            [bcs.address().serialize(account).toBase64()]
        )
        return Number(result)
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
        const result = await this.rest.move.viewFunction<string>(
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
        )

        const nativeFee = result[0] as unknown as number
        const zroFee = result[1] as unknown as number
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
        return Object.assign(msg, {
            multiSigArgs: [
                dst_eid,
                to,
                amount_ld,
                min_amount_ld,
                extra_options,
                compose_message,
                oft_cmd,
                native_fee,
                zro_fee,
            ],
        })
    }

    setPeerPayload(eid: EndpointId, peerAddress: string): TypedInputGenerateTransactionPayloadData {
        const peerAddressAsBytes = hexAddrToAptosBytesAddr(peerAddress)
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oapp_core',
            'set_peer',
            [],
            [
                bcs.u32().serialize(eid).toBase64(),
                bcs
                    .vector(bcs.u8())
                    .serialize([...peerAddressAsBytes])
                    .toBase64(),
            ]
        )
        return Object.assign(msg, {
            multiSigArgs: [eid, peerAddressAsBytes],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [delegateAddress],
        })
    }

    async getDelegate(): Promise<string> {
        const result = await this.rest.move.viewFunction<string>(this.oft_address, 'oapp_core', 'get_delegate', [], [])
        return result
    }

    async getAdmin(): Promise<string> {
        const result = await this.rest.move.viewFunction<string>(this.oft_address, 'oapp_core', 'get_admin', [], [])
        return result
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
        return Object.assign(msg, {
            multiSigArgs: [adminAddress],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [object_address, new_owner_address],
        })
    }

    renounceAdminPayload(): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(this.accountAddress, this.oft_address, 'oapp_core', 'renounce_admin', [], [])
        return Object.assign(msg, {
            types: [],
            multiSigArgs: [],
        })
    }

    async getPeer(eid: EndpointId): Promise<string> {
        try {
            const result = await this.rest.move.viewFunction<string>(
                this.oft_address,
                'oapp_core',
                'get_peer',
                [],
                [bcs.u32().serialize(eid).toBase64()]
            )
            return '0x' + result.replace('0x', '')
        } catch (error) {
            return '0x00'
        }
    }

    async hasPeer(eid: EndpointId): Promise<boolean> {
        const result = await this.rest.move.viewFunction<string>(
            this.oft_address,
            'oapp_core',
            'has_peer',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )
        return result as unknown as boolean
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
        return Object.assign(msg, {
            multiSigArgs: [eid, msgType, enforcedOptions],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [remoteEid, msglibAddress],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [remoteEid, msglibAddress, gracePeriod],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [remoteEid, msglibAddress, expiry],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [msgLibAddress, eid, configType, config],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [oftType],
        })
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
        return Object.assign(msg, {
            multiSigArgs: [],
        })
    }

    async signSubmitAndWaitForTx(transaction: MsgExecute): Promise<any> {
        try {
            const signedTx = await this.wallet.createAndSignTx({
                msgs: [transaction as MsgExecute],
                memo: 'LayerZero OFT transaction',
            })

            const result = await this.rest.tx.broadcast(signedTx)
            return result
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Transaction failed:', error.message)
            } else {
                console.error('Transaction failed with an unknown error')
            }
            throw error
        }
    }

    async getSequenceNumber(): Promise<number> {
        // throw new Error('Method not implemented.')
        console.log('Get Sequence Number Not Implemented')
        return 0
    }

    async syncSequenceNumber(): Promise<void> {
        // throw new Error('Method not implemented.')
        console.log('syncSequenceNumber')
    }

    initializeAdapterFAPayload(
        tokenMetadataAddress: string,
        sharedDecimals: number,
        localDecimals?: number
    ): TypedInputGenerateTransactionPayloadData {
        const msg = new MsgExecute(
            this.accountAddress,
            this.oft_address,
            'oft_adapter_fa',
            'initialize',
            [],
            [
                bcs.address().serialize(tokenMetadataAddress).toBase64(),
                bcs.u8().serialize(sharedDecimals).toBase64(),
                bcs.option(bcs.u8()).serialize(localDecimals).toBase64(),
            ]
        )
        return Object.assign(msg, {
            types: ['address', 'u8', 'u8'],
            multiSigArgs: [tokenMetadataAddress, sharedDecimals, localDecimals || 0],
        })
    }

    async getEnforcedOptions(eid: number, msgType: number): Promise<string> {
        const result = await this.rest.move.viewFunction<string>(
            this.oft_address,
            'oapp_core',
            'get_enforced_options',
            [],
            [bcs.u32().serialize(eid).toBase64(), bcs.u16().serialize(msgType).toBase64()]
        )
        if (result.length === 0) {
            return '0x00'
        }
        return '0x' + result.replace('0x', '')
    }
}
