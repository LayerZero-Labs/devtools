import {
    AccountAddress,
    EntryFunctionArgumentTypes,
    MoveString,
    MoveVector,
    ScriptFunctionArgumentTypes,
    SimpleEntryFunctionArgumentTypes,
    U8,
    U16,
    U32,
    U64,
    U128,
    U256,
} from '@aptos-labs/ts-sdk'

export function hexToUint8Array(hexString: string): Uint8Array {
    return Uint8Array.from(Buffer.from(trim0x(hexString), 'hex'))
}
export function trim0x(str: string): string {
    return str.replace(/^0x/, '')
}

const serializeVectorU8 = (arg: EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes) => {
    if (!(typeof arg === 'string')) {
        throw new Error('Argument for vector<u8> must be a string')
    }
    return Array.from(hexToUint8Array(arg))
}

const isStringArray = (arg: any): boolean => {
    return Array.isArray(arg) && arg.every((item) => typeof item === 'string')
}

export function serializeScriptArgs(
    args: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>,
    functionArgumentTypes: string[]
): Array<ScriptFunctionArgumentTypes> {
    if (args.length !== functionArgumentTypes.length) {
        throw new Error('The number of arguments does not match the number of types')
    }
    const serializedArgs: ScriptFunctionArgumentTypes[] = []
    for (let i = 0; i < args.length; i++) {
        if (functionArgumentTypes[i] === 'vector<u8>') {
            serializedArgs.push(MoveVector.U8(serializeVectorU8(args[i])))
        } else if (functionArgumentTypes[i] === 'vector<vector<u8>>' && isStringArray(args[i])) {
            serializedArgs.push(
                new MoveVector((args[i] as string[]).map((item: string) => MoveVector.U8(serializeVectorU8(item))))
            )
        } else if (functionArgumentTypes[i] === 'u8') {
            serializedArgs.push(new U8(Number(args[i])))
        } else if (functionArgumentTypes[i] === 'u16') {
            serializedArgs.push(new U16(Number(args[i])))
        } else if (functionArgumentTypes[i] === 'u32') {
            serializedArgs.push(new U32(Number(args[i])))
        } else if (functionArgumentTypes[i] === 'u64') {
            serializedArgs.push(new U64(Number(args[i])))
        } else if (functionArgumentTypes[i] === 'u128') {
            serializedArgs.push(new U128(Number(args[i])))
        } else if (functionArgumentTypes[i] === 'u256') {
            serializedArgs.push(new U256(Number(args[i])))
        } else if (functionArgumentTypes[i] === 'String') {
            serializedArgs.push(new MoveString(args[i]!.toString()))
        } else if (functionArgumentTypes[i] === 'address') {
            serializedArgs.push(AccountAddress.fromString(args[i]!.toString()))
        } else {
            throw new Error('Unsupported type')
        }
    }
    return serializedArgs
}

/**
 * Serializes the function arguments for view functions and transactions
 * @param args
 */
export function serializeFunctionArgs(
    args: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>,
    functionArgumentTypes?: string[]
): Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes> {
    // if no types are provided, return the args as is
    if (!functionArgumentTypes) {
        return args
    }
    // otherwise, there should be a type for each argument
    if (args.length !== functionArgumentTypes.length) {
        throw new Error('The number of arguments does not match the number of types')
    }
    return serializeScriptArgs(args, functionArgumentTypes)
}
