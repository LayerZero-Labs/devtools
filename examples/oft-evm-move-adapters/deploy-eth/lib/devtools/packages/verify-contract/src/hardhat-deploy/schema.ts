import { Metadata } from '../common/schema'

/**
 * Helper function that takes the metadata from hardhat deploy
 * deployment file and reformats it to match solcInput format
 *
 * In general the metadata is a superset of solcInputs and contains
 * additional information that breaks some of the scan APIs (e.g. BSC scan
 * will fail verification if raw metadata has been sent)
 *
 * @param metadata Metadata
 * @returns
 */
export const extractSolcInputFromMetadata = (metadata: Metadata) => {
    const { compilationTarget: _, ...settings } = metadata.settings
    const sources = Object.entries(metadata.sources).reduce(
        (sources, [contractPath, source]) => ({
            ...sources,
            [contractPath]: {
                content: source.content,
            },
        }),
        {}
    )

    return {
        language: metadata.language,
        settings,
        sources,
    }
}
