import { Command } from 'commander'
import {
    deploymentFilesOption,
    deploymentsPathOption,
    generatorOption,
    logLevelOption,
    networksOption,
    outputPathOption,
    excludeDeploymentFilesOption,
} from '@/cli/options'
import { COLORS, SUCCESS_SYMBOL } from '@/common/logger'
import { createIncludeDirent, generateSafe } from '@/index'
import { pipe } from 'fp-ts/lib/function'
import * as E from 'fp-ts/Either'
import type { CodeGenerator } from '@/generator/types'
import { type LogLevel, createLogger, pluralizeNoun } from '@layerzerolabs/io-devtools'
import { version } from '../package.json'

// Ensure we exit with zero code on SIGTERM/SIGINT
//
// This is important for prompts
const handleSigTerm = () => process.exit(0)
process.on('SIGINT', handleSigTerm)
process.on('SIGTERM', handleSigTerm)

new Command('export-deployments')
    .version(version)
    .addOption(deploymentsPathOption)
    .addOption(outputPathOption)
    .addOption(logLevelOption)
    .addOption(networksOption)
    .addOption(deploymentFilesOption)
    .addOption(excludeDeploymentFilesOption)
    .addOption(generatorOption)
    .action(
        async (args: {
            deployments: string
            files?: string[]
            excludeFiles?: string[]
            networks?: string[]
            logLevel: LogLevel
            outDir: string
            generator: CodeGenerator
        }) => {
            const defaultLogger = createLogger(args.logLevel)

            defaultLogger.debug(COLORS.default`Exporting deployments from ${args.deployments} to ${args.outDir}`)

            pipe(
                generateSafe({
                    deploymentsDir: args.deployments,
                    outDir: args.outDir,
                    includeDeploymentFile: createIncludeDirent(args.files, args.excludeFiles),
                    includeNetworkDir: createIncludeDirent(args.networks),
                    generator: args.generator,
                }),
                E.foldW(
                    (error) => {
                        defaultLogger.error(COLORS.error`Got an error during code generation: ${error}`)

                        process.exit(1)
                    },
                    (outputFiles) => {
                        const numGeneratedFiles = outputFiles.length

                        if (numGeneratedFiles === 0) {
                            defaultLogger.info(COLORS.default`No files generated, exiting`)
                        } else {
                            const message = pluralizeNoun(
                                numGeneratedFiles,
                                `Generated 1 file:`,
                                `Generated ${numGeneratedFiles} files:`
                            )

                            defaultLogger.info(COLORS.default`${SUCCESS_SYMBOL} ${message}`)
                            for (const { path } of outputFiles) {
                                defaultLogger.info(COLORS.default`\t${path}`)
                            }
                        }

                        process.exit(0)
                    }
                )
            )
        }
    )
    .parseAsync()
