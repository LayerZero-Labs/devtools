import type { Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'

export function createUlnConfig(ulnConfig: Uln302UlnUserConfig) {
    // Validate required fields
    if (ulnConfig.requiredDVNs === undefined) {
        throw new Error(
            'requiredDVNs must be specified in ULN configuration\n If you intend to use default requiredDVNs, set requiredDVNs to an empty array.'
        )
    }
    if (ulnConfig.optionalDVNs === undefined) {
        throw new Error(
            'optionalDVNs must be specified in ULN configuration\n If you intend to use default optionalDVNs, set optionalDVNs to an empty array.'
        )
    }
    if (ulnConfig.optionalDVNThreshold === undefined) {
        throw new Error('optionalDVNThreshold must be specified in ULN configuration')
    }
    if (ulnConfig.confirmations === undefined) {
        throw new Error(
            'confirmations must be specified in ULN configuration\n If you wish to use default confirmations, set confirmations to 0.'
        )
    }

    // requiredDVNs is an empty array: 
    console.log('ulnConfig', ulnConfig)
    console.log('confirmations', ulnConfig.confirmations)
    const confirmations = ulnConfig.confirmations
    const optionalDVNThreshold = ulnConfig.optionalDVNThreshold ?? 0
    const requiredDVNs = ulnConfig.requiredDVNs
    const optionalDVNs = ulnConfig.optionalDVNs ?? []

    // Use defaults only when values are undefined
    const useDefaultForConfirmations = confirmations === undefined
    // Use defaults for required DVNs when array is empty OR undefined
    const useDefaultForRequiredDVNs = !requiredDVNs.length
    // Use defaults for optional DVNs when array is empty OR undefined
    const useDefaultForOptionalDVNs = !optionalDVNs.length

    return {
        confirmations: confirmations,
        required_dvns: [],
        optional_dvns: optionalDVNs,
        optional_dvn_threshold: optionalDVNThreshold,
        use_default_for_confirmations: useDefaultForConfirmations,
        use_default_for_required_dvns: useDefaultForRequiredDVNs,
        use_default_for_optional_dvns: useDefaultForOptionalDVNs,
    }
}
