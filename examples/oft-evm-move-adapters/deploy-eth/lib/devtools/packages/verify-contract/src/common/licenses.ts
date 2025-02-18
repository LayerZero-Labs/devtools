export enum LicenseType {
    None = 1,
    Unlicense = 2,
    MIT = 3,
    'GNU-GPLv2' = 4,
    'GNU-GPLv3' = 5,
    'GNU-LGPLv2.1' = 6,
    'GNU-LGPLv3' = 7,
    'BSD-2-Clause' = 8,
    'BSD-3-Clause' = 9,
    'MPL-2.0' = 10,
    'OSL-3.0' = 11,
    'Apache-2.0' = 12,
    'GNU-AGPLv3' = 13,
    'BUSL-1.1' = 14,
}

/**
 * Helper function to get the license identifier from the contract
 *
 * @param sourceCode The solidity code of the contract
 * @returns
 */
export const findLicenseType = (sourceCode: string): LicenseType => {
    const matches = sourceCode.match(/\/\/\s*SPDX-License-Identifier:\s*(.*)\s*/i)
    const licenseName = matches?.[1]

    if (licenseName == null) {
        return LicenseType.None
    }
    if (!(licenseName in LicenseType)) {
        console.warn('Found unknown SPDX license identifier: %s', licenseName)
    }

    return LicenseType[licenseName as keyof typeof LicenseType]
}
