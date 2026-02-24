const SUI_HEX_REGEX = /^0x[0-9a-fA-F]{1,64}$/

export const isSuiAddress = (value: string): boolean => SUI_HEX_REGEX.test(value)

export const assertSuiAddress = (value: string, label = 'address'): void => {
    if (!isSuiAddress(value)) {
        throw new Error(`Invalid Sui ${label}: ${value}`)
    }
}
