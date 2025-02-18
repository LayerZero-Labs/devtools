import { getDefaultRuntimeEnvironment } from '@/runtime'
import { Artifacts } from 'hardhat/internal/artifacts'
import { Artifact } from 'hardhat/types'
import pMemoize from 'p-memoize'

/**
 * Will return all artifacts available in the project, including the external ones
 *
 * @return {Promise<Artifact[]>}
 */
export const getAllArtifacts = pMemoize(async (hre = getDefaultRuntimeEnvironment()): Promise<Artifact[]> => {
    // First we collect all the paths where artifacts could be
    //
    // This is a port of the code found in hardhat-deploy/src/DeploymentsManager.ts
    const externalContracts = hre.config.external?.contracts ?? []
    const artifactsPaths: string[] = [
        hre.config.paths.artifacts,
        hre.config.paths.imports,
        ...externalContracts.flatMap(({ artifacts }) => artifacts),
    ]

    // Now we create Artifacts objects
    const artifactsObjects = artifactsPaths.map((path) => new Artifacts(path))

    // Oxford dictionary defines "artifactses" as the plural form of "artifacts"
    const artifactses = await Promise.all(artifactsObjects.map(getAllArtifactsFrom))

    return artifactses.flat()
})

const getAllArtifactsFrom = async (artifactsObject: Artifacts) => {
    // First we get all the fully qualified names fro mthis artifacts object
    const fullyQualifiedNames = await artifactsObject.getAllFullyQualifiedNames()

    return fullyQualifiedNames.map((name) => artifactsObject.readArtifactSync(name))
}

export const isErrorFragment = <TFragment extends { type?: string }>(
    fragment: TFragment
): fragment is TFragment & { type: 'error' } => fragment.type === 'error'
