import { getDefaultRuntimeEnvironment } from '@/runtime'
import { Artifact } from 'hardhat/types'

export const getAllArtifacts = async (hre = getDefaultRuntimeEnvironment()): Promise<Artifact[]> => {
    const artifactNames = await hre.artifacts.getAllFullyQualifiedNames()

    return artifactNames.map((name) => hre.artifacts.readArtifactSync(name))
}

export const isErrorFragment = <TFragment extends { type?: string }>(
    fragment: TFragment
): fragment is TFragment & { type: 'error' } => fragment.type === 'error'
