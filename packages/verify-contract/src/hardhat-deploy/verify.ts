import { parseNetworksConfig } from '../common/config'
import { basename, resolve } from 'path'
import { findLicenseType } from '../common/licenses'
import { SubmitForVerificationProps, createVerification } from '../common/etherscan'
import chalk from 'chalk'
import { COLORS, RecordLogger, anonymizeValue, createRecordLogger } from '../common/logger'
import { tryCreateScanContractUrl } from '../common/url'
import { DeploymentSchema } from '../common/schema'
import { extractSolcInputFromMetadata } from './schema'
import { encodeContructorArguments, getContructorABIFromSource } from '../common/abi'
import type {
    VerificationArtifact,
    VerificationResult,
    VerifyHardhatNonTargetConfig,
    VerifyHardhatTargetConfig,
} from './types'
import { parseFilterConfig, parsePathsConfig } from './config'
import { isDirectory, isFile } from '../common/fs'
import { readdirSync } from 'fs'
import type { Logger } from '@layerzerolabs/io-devtools'

/**
 * verifyNonTarget is useful when verifying a contract that does not have its own
 * deployment file (i.e. is not a target of any hardhat deployment, hence the name).
 *
 * This happens when a contract is deployed dynamically from another contract,
 * either using minimal proxy pattern or by new keyword
 *
 * In this case the construtor arguments must be provided manually for every contract/network combination
 *
 * @param config VerifyHardhatNonTargetConfig
 * @param logger Logger
 *
 * @returns Promise<VerificationResult[]>
 */
export const verifyNonTarget = async (
    config: VerifyHardhatNonTargetConfig,
    logger: Logger
): Promise<VerificationResult[]> => {
    const networks = parseNetworksConfig(logger, config.networks)
    const paths = parsePathsConfig(config.paths)
    const recordLogger = createRecordLogger(logger)
    const verifyAll = createVerifyAll(logger)
    const logResult = createLogVerificationResult(recordLogger)

    const verificationArtifacts = config.contracts.flatMap((contract): VerificationArtifact[] => {
        const { address, network, contractName, deployment: deploymentPathOrBasename } = contract
        logger.info(`Collecting information for contract ${contractName} on network ${network}`)

        const networkConfig = networks[network]
        if (networkConfig == null) {
            logger.info(`No network configured for contract ${contractName} on network ${network}`)

            return []
        }

        // To be tolerant we'll accept the deployment path both with and without the .json extension
        const deploymentPath = `${basename(deploymentPathOrBasename, '.json')}.json`

        // Since the contract does not have its own deployment, we need to specify
        // a deployment file to use
        const contractDeploymentPath = resolve(paths.deployments, network, deploymentPath)
        if (!isFile(contractDeploymentPath)) {
            logger.error(COLORS.error`Deployment file ${contractDeploymentPath} does not exist or is not a file`)

            return []
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const rawDeployment = require(contractDeploymentPath)
        const deploymentParseResult = DeploymentSchema.safeParse(rawDeployment)
        if (!deploymentParseResult.success) {
            logger.error(COLORS.error`No network configured for contract ${contractName} on network ${network}`)

            return []
        }

        // At this moment we have a type-safe deployment available
        const deployment = deploymentParseResult.data

        const contractClassName = basename(contractName, '.sol')
        const source = deployment.metadata.sources[contractName]
        if (source == null) {
            logger.error(
                COLORS.error`Missing source for contract ${contractName} for network ${network} in ${deploymentPath}`
            )

            return []
        }

        const licenseType = findLicenseType(source.content)
        // Constructor arguments can be passed encoded or decoded
        const constructorArguments =
            // If there are no constructor arguments, we don't pass anything
            contract.constructorArguments == null
                ? undefined
                : // If the constructor arguments are passed encoded we pass them directly
                  typeof contract.constructorArguments === 'string'
                  ? contract.constructorArguments
                  : // For decoded constructor arguments we'll need to try and encoded them using the contract source
                    encodeContructorArguments(getContructorABIFromSource(source.content), contract.constructorArguments)

        // Deployment metadata contains solcInput, just a bit rearranged
        const solcInput = extractSolcInputFromMetadata(deployment.metadata)

        const submitProps: SubmitForVerificationProps = {
            apiUrl: networkConfig.apiUrl,
            apiKey: networkConfig.apiKey,
            chainId: networkConfig.chainId,
            address,
            contractName: `${contractName}:${contractClassName}`,
            constructorArguments,
            licenseType,
            compilerVersion: deployment.metadata.compiler.version,
            sourceCode: JSON.stringify(solcInput),
            evmVersion: deployment.metadata.settings.evmVersion,
            optimizerRuns: deployment.metadata.settings.optimizer?.runs,
        }

        recordLogger({
            Contract: contractName,
            Network: network,
            Address: submitProps.address,
            License: submitProps.licenseType,
            Arguments: contract.constructorArguments ? JSON.stringify(contract.constructorArguments) : undefined,
            Sources: Object.keys(deployment.metadata.sources),
            'Scan URL': submitProps.apiUrl,
            'Scan API Key': submitProps.apiKey ? anonymizeValue(submitProps.apiKey) : undefined,
        })

        return [
            {
                networkName: network,
                networkConfig,
                submitProps,
            },
        ]
    })

    if (verificationArtifacts.length === 0) {
        logger.warn('No contracts match the verification criteria, exiting')

        return []
    }

    // If we are only running a dry run, we'll print out the important info and exit
    if (config.dryRun) {
        logger.debug('Dry run enabled, exiting')

        return []
    }

    // Now it's time to verify stuff
    const results = await Promise.all(verifyAll(verificationArtifacts))

    // And due to high demand we'll also like show results and stuff
    results.forEach(logResult)

    return results
}

export const verifyTarget = async (
    config: VerifyHardhatTargetConfig,
    logger: Logger
): Promise<VerificationResult[]> => {
    // First we parse the configuration and fill in the defaults
    const verify = parseFilterConfig(config.filter)
    const networks = parseNetworksConfig(logger, config.networks)
    const paths = parsePathsConfig(config.paths)
    const recordLogger = createRecordLogger(logger)
    const verifyAll = createVerifyAll(logger)
    const logResult = createLogVerificationResult(recordLogger)

    // We'll need to check whether the deployments path exists and is a directory
    if (!isDirectory(paths.deployments)) {
        throw new Error(`Path ${paths.deployments} is not a directory`)
    }

    // We know that the deployments folder should contain folders named by networks
    // so we'll get the list of deployed networks by listing the directory contents
    const deployedNetworkNames = new Set(readdirSync(paths.deployments))
    const networkConfigEntries = Object.entries(networks)

    logger.debug('Verifying deployments for following networks:')
    networkConfigEntries.forEach(([networkName, networkConfig]) => {
        logger.debug(`\t\t- ${networkName} (API URL ${networkConfig.apiUrl})`)
    })

    // Then it's time to go over the networks and collect the contracts that need to be verified
    const verificationArtifacts = networkConfigEntries.flatMap(
        ([networkName, networkConfig]): VerificationArtifact[] => {
            logger.info(`Collecting deployments for ${networkName}...`)

            // First we check that there is a deployment for this network name
            //
            // If there isn't, we just skip it instead of throwing an error
            // This allows us to have all the networks configured at all times
            // and only verify the deployed ones
            if (!deployedNetworkNames.has(networkName)) {
                logger.warn(`Could not find deployment for network ${networkName} in ${paths.deployments}`)

                return []
            }

            // Now we construct the absolute path to the deployment folder
            const deploymentAbsolutePath = resolve(paths.deployments, networkName)

            // Then we get all the JSON files in the deployment folder
            const deployedContractFileNames = readdirSync(deploymentAbsolutePath).filter((fileName) =>
                fileName.endsWith('.json')
            )

            // Now it's time to process the deployments
            return deployedContractFileNames.flatMap((fileName) => {
                logger.info(`Inspecting deployment file ${fileName} on network ${networkName}`)

                // We load the deployment file and make sure it's correctly formatted
                const contractDeploymentPath = resolve(deploymentAbsolutePath, fileName)
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const rawDeployment = require(contractDeploymentPath)
                const deploymentParseResult = DeploymentSchema.safeParse(rawDeployment)
                if (!deploymentParseResult.success) {
                    throw new Error(
                        `Error parsing deployment file ${fileName} on network ${networkName}: ${deploymentParseResult.error}`
                    )
                }

                // At this moment we have a type-safe deployment available
                const deployment = deploymentParseResult.data

                // We 'll now walk through the compilation targets
                // and find the ones that we want to verify
                const compilationTargets = deployment.metadata.settings.compilationTarget
                return Object.entries(compilationTargets).flatMap(([compilationTarget, contractName]) => {
                    const shouldVerifyHardhatDeploy = verify(contractName, compilationTarget, networkName)

                    if (!shouldVerifyHardhatDeploy) {
                        logger.debug(`Not verifying ${contractName} in ${fileName} on network ${networkName}`)
                        return []
                    }

                    // In order to find the correct license for this articular contract we'll need to find its source code
                    const source = deployment.metadata.sources[compilationTarget]
                    if (source == null) {
                        logger.error(COLORS.error`Could not find source for ${contractName} (${compilationTarget})`)

                        return []
                    }

                    const licenseType = findLicenseType(source.content)

                    // Constructor arguments need to come ABI-encoded but without the 0x
                    const constructorArguments = encodeContructorArguments(deployment.abi, deployment.args)

                    // Deployment metadata contains solcInput, just a bit rearranged
                    const solcInput = extractSolcInputFromMetadata(deployment.metadata)

                    const submitProps: SubmitForVerificationProps = {
                        apiUrl: networkConfig.apiUrl,
                        apiKey: networkConfig.apiKey,
                        chainId: networkConfig.chainId,
                        address: deployment.address,
                        contractName: `${compilationTarget}:${contractName}`,
                        constructorArguments,
                        licenseType,
                        compilerVersion: deployment.metadata.compiler.version,
                        sourceCode: JSON.stringify(solcInput),
                        evmVersion: deployment.metadata.settings.evmVersion,
                        optimizerRuns: deployment.metadata.settings.optimizer?.runs,
                    }

                    recordLogger({
                        Contract: contractName,
                        Network: networkName,
                        Address: deployment.address,
                        License: submitProps.licenseType,
                        Arguments: JSON.stringify(deployment.args),
                        Sources: Object.keys(deployment.metadata.sources),
                        'Scan URL': submitProps.apiUrl,
                        'Scan API Key': submitProps.apiKey ? anonymizeValue(submitProps.apiKey) : undefined,
                    })

                    return {
                        submitProps,
                        networkName,
                        networkConfig,
                    }
                })
            })
        }
    )

    if (verificationArtifacts.length === 0) {
        logger.warn('No contracts match the verification criteria, exiting')

        return []
    }

    // If we are only running a dry run, we'll print out the important info and exit
    if (config.dryRun) {
        logger.debug('Dry run enabled, exiting')

        return []
    }

    // Now it's time to verify stuff
    const results = await Promise.all(verifyAll(verificationArtifacts))

    // And due to high demand we'll also like show results and stuff
    results.forEach(logResult)

    return results
}

const createVerifyAll =
    (logger: Logger) =>
    (artifacts: VerificationArtifact[]): Promise<VerificationResult>[] => {
        return artifacts.map(async (artifact, index) => {
            const { submitProps } = artifact
            const paletteColor = COLORS.palette[index % COLORS.palette.length]!
            const counter = `[${index + 1}/${artifacts.length}]`
            const contractName = chalk.bold(submitProps.contractName)
            const networkName = chalk.bold(artifact.networkName)

            logger.info(paletteColor`Verifying contract ${contractName} for network ${networkName} ${counter}`)

            try {
                const verification = createVerification(submitProps, logger)

                verification.on('poll', (guid) => {
                    logger.info(
                        paletteColor`Polling for verification status of ${contractName} for network ${networkName} (GUID ${guid}) ${counter}`
                    )
                })

                verification.on('retry', (error, attempt) => {
                    logger.verbose(`Received an error: ${error}`)
                    logger.info(
                        paletteColor`Retrying failed verification attempt of ${contractName} for network ${networkName} (attempt ${
                            attempt + 1
                        }) ${counter}`
                    )
                })

                const result = await verification.verify()

                return { artifact, result }
            } catch (error) {
                logger.error(
                    COLORS.error`Problem verifying contract ${contractName} for network ${networkName} ${counter}: ${error} `
                )

                return { artifact, error }
            }
        })
    }

const createLogVerificationResult =
    (recordLogger: RecordLogger) =>
    ({ artifact, response, error }: VerificationResult) => {
        const contractName = chalk.bold(artifact.submitProps.contractName)
        const networkName = chalk.bold(artifact.networkName)
        const contractUrl = artifact.networkConfig.browserUrl
            ? tryCreateScanContractUrl(artifact.networkConfig.browserUrl, artifact.submitProps.address)
            : undefined

        recordLogger({
            Contract: contractName,
            Network: networkName,
            Result: error == null,
            'Was verified': response?.alreadyVerified,
            'Contract URL': contractUrl,
            Error: error ? COLORS.error(error) : undefined,
        })
    }
