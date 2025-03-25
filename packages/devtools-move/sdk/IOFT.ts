import { Aptos, InputEntryFunctionData, SimpleTransaction } from '@aptos-labs/ts-sdk'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { MsgExecute, RESTClient } from '@initia/initia.js'

export type TypedAptosPayload = InputEntryFunctionData & {
    types: string[]
}

export type TypedInitiaPayload = MsgExecute & {
    types: string[]
    multiSigArgs: any[]
}

export type TypedInputGenerateTransactionPayloadData = TypedAptosPayload | TypedInitiaPayload

export enum OFTType {
    OFT_FA = 'oft_fa',
    OFT_ADAPTER_FA = 'oft_adapter_fa',
    OFT_COIN = 'oft_coin',
    OFT_ADAPTER_COIN = 'oft_adapter_coin',
}

export interface IOFT {
    moveVMConnection: Aptos | RESTClient
    oft_address: string
    eid: EndpointId

    initializeOFTFAPayload(
        token_name: string,
        symbol: string,
        icon_uri: string,
        project_uri: string,
        shared_decimals: number,
        local_decimals: number
    ): TypedInputGenerateTransactionPayloadData

    initializeAdapterFAPayload(
        tokenMetadataAddress: string,
        sharedDecimals: number
    ): TypedInputGenerateTransactionPayloadData

    createSetRateLimitTx(
        eid: EndpointId,
        limit: number | bigint,
        window_seconds: number | bigint,
        oftType: OFTType
    ): TypedInputGenerateTransactionPayloadData

    createUnsetRateLimitTx(eid: EndpointId, oftType: OFTType): TypedInputGenerateTransactionPayloadData

    getRateLimitConfig(eid: EndpointId, oftType: OFTType): Promise<[bigint, bigint]>

    createSetFeeBpsTx(fee_bps: number | bigint, oftType: OFTType): TypedInputGenerateTransactionPayloadData

    getFeeBps(oftType: OFTType): Promise<bigint>

    mintPayload(recipient: string, amount: number | bigint): TypedInputGenerateTransactionPayloadData

    getBalance(account: string): Promise<number>

    quoteSend(
        userSender: string,
        dst_eid: number,
        to: Uint8Array,
        amount_ld: number | bigint,
        min_amount_ld: number | bigint,
        extra_options: Uint8Array,
        compose_message: Uint8Array,
        oft_cmd: Uint8Array,
        pay_in_zro: boolean
    ): Promise<[number, number]>

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
    ): TypedInputGenerateTransactionPayloadData

    setPeerPayload(eid: EndpointId, peerAddress: string): TypedInputGenerateTransactionPayloadData

    setDelegatePayload(delegateAddress: string): TypedInputGenerateTransactionPayloadData

    getDelegate(): Promise<string>

    getAdmin(): Promise<string>

    transferAdminPayload(adminAddress: string): TypedInputGenerateTransactionPayloadData

    transferObjectPayload(object_address: string, new_owner_address: string): TypedInputGenerateTransactionPayloadData

    renounceAdminPayload(): TypedInputGenerateTransactionPayloadData

    getPeer(eid: EndpointId): Promise<string>

    hasPeer(eid: EndpointId): Promise<boolean>

    setEnforcedOptionsPayload(
        eid: number,
        msgType: number,
        enforcedOptions: Uint8Array
    ): TypedInputGenerateTransactionPayloadData

    getEnforcedOptions(eid: number, msgType: number): Promise<string>

    setSendLibraryPayload(remoteEid: number, msglibAddress: string): TypedInputGenerateTransactionPayloadData

    setReceiveLibraryPayload(
        remoteEid: number,
        msglibAddress: string,
        gracePeriod: number
    ): TypedInputGenerateTransactionPayloadData

    setReceiveLibraryTimeoutPayload(
        remoteEid: number,
        msglibAddress: string,
        expiry: number
    ): TypedInputGenerateTransactionPayloadData

    setConfigPayload(
        msgLibAddress: string,
        eid: number,
        configType: number,
        config: Uint8Array
    ): TypedInputGenerateTransactionPayloadData

    irrevocablyDisableBlocklistPayload(oftType: OFTType): TypedInputGenerateTransactionPayloadData

    permanentlyDisableFungibleStoreFreezingPayload(): TypedInputGenerateTransactionPayloadData

    syncSequenceNumber(): Promise<void>

    getSequenceNumber(): Promise<number>

    signSubmitAndWaitForTx(transaction: SimpleTransaction | MsgExecute): Promise<any>
}
