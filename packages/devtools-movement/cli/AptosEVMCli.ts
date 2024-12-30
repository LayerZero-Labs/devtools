import { ArgumentParser } from 'argparse'

class AptosEVMCLI {
    parser: ArgumentParser
    aptosArgs: string[]
    ethereumArgs: string[]
    args: any
    constructor() {
        this.parser = new ArgumentParser({
            description: 'A simple CLI tool built with argparse in TypeScript',
        })

        this.aptosArgs = ['build', 'deploy', 'wire', 'setDelegate', 'initOFTFA']
        this.ethereumArgs = ['build', 'deploy', 'wire', 'setDelegate']
    }

    getArgs() {
        this.parser.add_argument('--vm', {
            type: 'str',
            help: `vm to perform operation on - aptos or ethereum`,
            choices: ['aptos', 'ethereum'],
            required: true,
        })

        this.parser.add_argument('--op', {
            type: 'str',
            help: `any ONE operation to perform - build, deploy, setDelegate, initOFTFA`,
            choices: this.aptosArgs.concat(this.ethereumArgs),
            required: true,
        })

        this.parser.add_argument('--named-addresses', {
            type: 'str',
            help: `deployer account address based on your config`,
            required: false,
        })

        this.parser.add_argument('--force-build', {
            type: 'str',
            help: 'Force build even if contracts already built',
            default: 'false',
            choices: ['true', 'false'],
        })

        this.parser.add_argument('--force-deploy', {
            type: 'str',
            help: 'Force deploy even if deployment already exists',
            default: 'false',
            choices: ['true', 'false'],
        })
    }

    sanitizeArgs() {
        const args = this.parser.parse_args()

        if (args.vm === 'aptos') {
            if (!this.aptosArgs.includes(args.op)) {
                throw new Error(`Operation ${args.op} is not valid for aptos`)
            }
        } else if (args.vm === 'ethereum') {
            if (!this.ethereumArgs.includes(args.op)) {
                throw new Error(`Operation ${args.op} is not valid for ethereum`)
            }
        }

        this.args = args
    }

    cli() {
        this.getArgs()
        this.sanitizeArgs()
        console.log(this.args)
    }
}

export { AptosEVMCLI }
