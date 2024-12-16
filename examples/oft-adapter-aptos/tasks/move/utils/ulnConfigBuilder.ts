import type { OmniPointHardhat, Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'

interface SerializableUlnConfig {
    confirmations: bigint
    optional_dvn_threshold: number
    optional_dvns: string[]
    required_dvns: string[]
    use_default_for_confirmations: boolean
    use_default_for_required_dvns: boolean
    use_default_for_optional_dvns: boolean
}

export function createSerializableUlnConfig(
    ulnConfig: Uln302UlnUserConfig,
    to: OmniPointHardhat,
    from: OmniPointHardhat
): SerializableUlnConfig {
    // Validate required fields
    if (ulnConfig.requiredDVNs === undefined) {
        throw new Error(
            `requiredDVNs must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})\nIf you intend to use defaults for requiredDVNs, set requiredDVNs to an empty array.`
        )
    }
    if (ulnConfig.optionalDVNs === undefined) {
        throw new Error(
            `optionalDVNs must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})\nIf you intend to use defaults for optionalDVNs, set optionalDVNs to an empty array.`
        )
    }
    if (ulnConfig.optionalDVNThreshold === undefined) {
        throw new Error(
            `optionalDVNThreshold must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})`
        )
    }
    if (ulnConfig.confirmations === undefined) {
        throw new Error(
            `confirmations must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})\nIf you wish to use defaults for confirmations, set confirmations to 0.`
        )
    }

    const confirmations = ulnConfig.confirmations
    const optionalDVNThreshold = ulnConfig.optionalDVNThreshold
    const requiredDVNs = ulnConfig.requiredDVNs
    const optionalDVNs = ulnConfig.optionalDVNs

    // Use defaults when confirmations are set to 0
    const useDefaultForConfirmations = confirmations === BigInt(0)
    // Use defaults for required DVNs when array is empty
    const useDefaultForRequiredDVNs = !requiredDVNs.length
    // Use defaults for optional DVNs when array is empty
    const useDefaultForOptionalDVNs = !optionalDVNs.length

    return {
        confirmations,
        optional_dvn_threshold: optionalDVNThreshold,
        optional_dvns: optionalDVNs,
        required_dvns: requiredDVNs,
        use_default_for_confirmations: useDefaultForConfirmations,
        use_default_for_required_dvns: useDefaultForRequiredDVNs,
        use_default_for_optional_dvns: useDefaultForOptionalDVNs,
    } satisfies SerializableUlnConfig
}
