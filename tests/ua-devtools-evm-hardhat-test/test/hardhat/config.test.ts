import 'hardhat'
import { getTestHre } from '@layerzerolabs/test-devtools-evm-hardhat'
import { join } from 'path'

describe('hardhat/config', () => {
    const configFixture = (fileName: string) => join('test', 'hardhat', '__data__', fileName)

    describe('layerZero', () => {
        describe('deploymentSourcePackages', () => {
            it('should not load external deployments if set to an empty array', async () => {
                const hre = getTestHre({
                    network: 'vengaboys',
                    config: configFixture('hardhat.config.with-no-external-deployments.ts'),
                })

                await expect(hre.deployments.get('EndpointV2')).rejects.toThrow('No deployment found for: EndpointV2')
            })

            it('should load external deployments if set to undefined', async () => {
                const hre = getTestHre({
                    network: 'vengaboys',
                    config: configFixture('hardhat.config.with-undefined-external-deployments.ts'),
                })

                await expect(hre.deployments.get('EndpointV2')).resolves.not.toBeUndefined()
            })

            it('should load external deployments if set to specific packages', async () => {
                const hre = getTestHre({
                    network: 'vengaboys',
                    config: configFixture('hardhat.config.with-specified-external-deployments.ts'),
                })

                await expect(hre.deployments.get('EndpointV2')).resolves.not.toBeUndefined()
            })
        })

        describe('artifactSourcePackages', () => {
            it('should not load external artifacts if set to an empty array', async () => {
                const hre = getTestHre({
                    network: 'vengaboys',
                    config: configFixture('hardhat.config.with-no-external-artifacts.ts'),
                })

                await expect(hre.deployments.getArtifact('EndpointV2')).rejects.toThrow(
                    'cannot find artifact "EndpointV2"'
                )
            })

            it('should load external artifacts if set to undefined', async () => {
                const hre = getTestHre({
                    network: 'vengaboys',
                    config: configFixture('hardhat.config.with-undefined-external-artifacts.ts'),
                })

                await expect(hre.deployments.getArtifact('EndpointV2')).resolves.not.toBeUndefined()
                await expect(hre.deployments.getArtifact('EndpointV2Mock')).resolves.not.toBeUndefined()
            })

            it('should load external artifacts if set to specific packages', async () => {
                const hre = getTestHre({
                    network: 'vengaboys',
                    config: configFixture('hardhat.config.with-specified-external-artifacts.ts'),
                })

                await expect(hre.deployments.getArtifact('EndpointV2')).resolves.not.toBeUndefined()
                await expect(hre.deployments.getArtifact('EndpointV2Mock')).rejects.toThrow(
                    'cannot find artifact "EndpointV2Mock"'
                )
            })
        })
    })
})
