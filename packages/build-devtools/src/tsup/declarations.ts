import { spawnSync } from 'child_process'
import { type Options } from 'tsup'

export interface CreateDeclarationBuildOptions {
    /**
     * Enable this plugin.
     *
     * @default process.env.NODE_ENV === 'production'
     */
    enabled?: boolean
    /**
     * tsc binary to use
     *
     * @default 'tsc'
     */
    tsc?: string
    /**
     * tsconfig.json to use
     *
     * @default 'tsconfig.build.json'
     */
    tsConfig?: string
    outDir?: string
}

/**
 * Helper type to make sure the return value matches what tsup expects
 */
type Plugin = Exclude<Options['plugins'], undefined>[number]

const LOG_LABEL = 'DMAP'

export const createDeclarationBuild = ({
    enabled = process.env.NODE_ENV !== 'production',
    tsc = 'tsc',
    tsConfig = 'tsconfig.build.json',
    outDir: outDirOption,
}: CreateDeclarationBuildOptions = {}) =>
    ({
        name: 'Generate Local Declaration Maps',
        async buildEnd() {
            if (!enabled) {
                this.logger.info(LOG_LABEL, `Skipping declaration map generation in production mode`)

                return
            }

            const outDir = outDirOption ?? this.options.outDir
            this.logger.info(LOG_LABEL, `Generating declaration maps for based on ${tsConfig} into ${outDir}`)

            // tsc does not have a pretty programmatic interface
            // so we use spawnSync to run it as an external command
            const result = spawnSync(
                tsc,
                ['-p', tsConfig, '--noEmit', 'false', '--emitDeclarationOnly', '-outDir', outDir],
                {
                    encoding: 'utf8',
                    stdio: 'inherit',
                }
            )

            // Check the exit status of tsc to make sure it succeeded
            if (result.status !== 0) {
                this.logger.error(LOG_LABEL, `Declaration map generation failed with exit code ${result.status}`)

                throw new Error(`Declaration map generation failed with exit code ${result.status}`)
            }

            this.logger.info(LOG_LABEL, `⚡️ Generating declaration maps successful`)
        },
    }) satisfies Plugin
