/**
 * Used to render OptionType input from the user.
 */
export interface OptionType {
    id: string
    label: string
}

/**
 * Input OptionType selection.
 */
export interface OptionTypeInput {
    type: OptionType
}

/**
 * The result of building an Option.
 */
export interface OptionOutput {
    hex: string
}

/**
 * Summary of OptionType.TYPE_1.
 */
export interface OptionType1Summary {
    gasLimit: string
}

/**
 * Summary of OptionType.TYPE_2.
 */
export interface OptionType2Summary extends OptionType1Summary {
    nativeDropAmount: string
    nativeDropAddress: string
}
