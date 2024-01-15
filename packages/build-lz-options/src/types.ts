export interface OptionConfig {
    type: OptionType
}

export interface OptionType {
    id: string
    label: string
}

export interface OptionType1 {
    gasLimit: string
}

export interface OptionType2 extends OptionType1 {
    nativeDropAmount: string
    nativeDropAddress: string
}

export interface OptionType3 {
    output: string
}
