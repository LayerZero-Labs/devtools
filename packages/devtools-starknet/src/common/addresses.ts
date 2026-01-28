const STARKNET_HEX_REGEX = /^0x[0-9a-fA-F]{1,64}$/

export const isStarknetAddress = (value: string): boolean => STARKNET_HEX_REGEX.test(value)

export const assertStarknetAddress = (value: string, label = 'address'): void => {
    if (!isStarknetAddress(value)) {
        throw new Error(`Invalid Starknet ${label}: ${value}`)
    }
}
