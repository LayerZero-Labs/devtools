import { InvalidOptionArgumentError, Option } from 'commander'
import { generatorMarkdown, generatorTypeScript } from '..'

export const logLevelOption = new Option('-l,--log-level <level>', 'Log level')
    .choices(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info')

export const deploymentsPathOption = new Option('-d,--deployments <path>', 'Path to the deployments folder').default(
    './deployments'
)

export const networksOption = new Option(
    '-n,--networks <network names>',
    'Comma separated list of network names to verify'
).argParser((value: string) => value.trim().split(/\s*,\s*/))

export const outputPathOption = new Option('-o,--out-dir <path>', 'Path to the output directory').default('./generated')

export const contractNamesOption = new Option(
    '-c,--contracts <contract names>',
    'Comma-separated list of case-sensitive contract names to verify'
).argParser((value: string) => value.trim().split(/\s*,\s*/))

export const deploymentFilesOption = new Option(
    '-f,--files <deployment file name>',
    'Comma-separated list of case-sensitive deployment file names to include in the export'
).argParser((value: string) => value.trim().split(/\s*,\s*/))

export const excludeDeploymentFilesOption = new Option(
    '--exclude-files <deployment file name>',
    'Comma-separated list of case-sensitive deployment file names to exclude from the export'
).argParser((value: string) => value.trim().split(/\s*,\s*/))

export const generatorOption = new Option('-g,--generator <generator type>', 'Type of generator to use')
    .choices(['markdown', 'typescript'])
    .argParser((value: string) => {
        switch (value) {
            case 'markdown':
                return generatorMarkdown

            case 'typescript':
                return generatorTypeScript

            default:
                throw new InvalidOptionArgumentError(`Invalid generator specified: ${value}`)
        }
    })
    .default(generatorTypeScript)
