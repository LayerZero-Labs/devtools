import type { Call } from 'starknet'

export const serializeStarknetCalls = (calls: Call[]): string =>
    JSON.stringify(calls, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))

export const deserializeStarknetCalls = (data: string): Call[] => JSON.parse(data) as Call[]
