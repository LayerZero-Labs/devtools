import type { Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

export function createSerializableUlnConfig(
    ulnConfig: Uln302UlnUserConfig,
    to: OmniPointHardhat,
    from: OmniPointHardhat
) {
    // Validate required fields
    if (ulnConfig.requiredDVNs === undefined) {
        throw new Error(
            `requiredDVNs must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})\nIf you intend to use default requiredDVNs, set requiredDVNs to an empty array.`
        )
    }
    if (ulnConfig.optionalDVNs === undefined) {
        throw new Error(
            `optionalDVNs must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})\nIf you intend to use default optionalDVNs, set optionalDVNs to an empty array.`
        )
    }
    if (ulnConfig.optionalDVNThreshold === undefined) {
        throw new Error(
            `optionalDVNThreshold must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})`
        )
    }
    if (ulnConfig.confirmations === undefined) {
        throw new Error(
            `confirmations must be specified in ULN configuration for ${from.contractName}(${from.eid}) -> ${to.contractName}(${to.eid})\nIf you wish to use default confirmations, set confirmations to 0.`
        )
    }

    const confirmations = ulnConfig.confirmations
    const optionalDVNThreshold = ulnConfig.optionalDVNThreshold ?? 0
    const requiredDVNs = ulnConfig.requiredDVNs
    const optionalDVNs = ulnConfig.optionalDVNs ?? []

    // Use defaults only when values are undefined
    const useDefaultForConfirmations = confirmations === undefined || confirmations === BigInt(0)
    // Use defaults for required DVNs when array is empty OR undefined
    const useDefaultForRequiredDVNs = !requiredDVNs.length
    // Use defaults for optional DVNs when array is empty OR undefined
    const useDefaultForOptionalDVNs = !optionalDVNs.length

    return {
        confirmations: confirmations,
        optional_dvn_threshold: optionalDVNThreshold,
        optional_dvns: optionalDVNs,
        required_dvns: requiredDVNs,
        use_default_for_confirmations: useDefaultForConfirmations,
        use_default_for_required_dvns: useDefaultForRequiredDVNs,
        use_default_for_optional_dvns: useDefaultForOptionalDVNs,
    }
}
