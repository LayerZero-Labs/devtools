import type { InputEntryFunctionData } from '@aptos-labs/ts-sdk'

/**
 * Extended Aptos transaction payload with type information
 */
export interface AptosTransactionPayload extends InputEntryFunctionData {
    /**
     * Type hints for the function arguments
     * Used for encoding/decoding arguments
     */
    types?: string[]
}

/**
 * Serialized Aptos transaction data
 * This is stored in OmniTransaction.data
 */
export interface SerializedAptosTransaction {
    /**
     * The entry function to call (format: "module_address::module_name::function_name")
     */
    function: string

    /**
     * Type arguments for the function (generics)
     */
    typeArguments?: string[]

    /**
     * Function arguments
     */
    functionArguments: unknown[]

    /**
     * Type hints for function arguments (for encoding)
     */
    types?: string[]
}
