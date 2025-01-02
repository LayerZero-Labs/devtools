import { ArgumentParser } from 'argparse'
import { wireMove } from '../tasks/move/wire'
import { wireEvm } from '../tasks/evm/wire-evm'
import { build } from '../tasks/move/build'
import { deploy } from '../tasks/move/deploy'
import { setDelegate } from '../tasks/move/setDelegate'

import path from 'path'

class AptosEVMCLI_Core {
    parser: ArgumentParser
    aptosArgs: string[]
    ethereumArgs: string[]
    args: any
    rootDir: string
    constructor(rootDir: string = process.cwd()) {
        this.parser = new ArgumentParser({
            description: 'A simple CLI tool built with argparse in TypeScript',
        })

        this.aptosArgs = ['build', 'deploy', 'init', 'wire', 'setDelegate']
        this.ethereumArgs = ['build', 'deploy', 'wire', 'setDelegate']

        this.rootDir = rootDir

        this.addArgs()
        this.sanitizeArgs()
    }

    addArgs() {
        this.parser.add_argument('--vm', {
            type: 'str',
            help: `vm to perform operation on - move or evm`,
            choices: ['move', 'evm'],
            required: true,
        })

        this.parser.add_argument('--op', {
            type: 'str',
            help: `any ONE operation to perform - build, deploy, setDelegate, initOFTFA`,
            choices: this.aptosArgs.concat(this.ethereumArgs),
            required: true,
        })

        this.parser.add_argument('--lz-config', {
            type: 'str',
            help: `path to the layerzeroconfig file`,
            required: true,
        })

        this.parser.add_argument('--move-deploy-script', {
            type: 'str',
            help: `path to the move deploy script`,
            required: false,
        })

        this.parser.add_argument('--named-addresses', {
            type: 'str',
            help: `deployer account address based on your config`,
            required: false,
        })

        this.parser.add_argument('--force-build', {
            type: 'str',
            help: 'Force aptos build even if contracts already built',
            default: 'false',
            choices: ['true', 'false'],
            required: false,
        })

        this.parser.add_argument('--force-deploy', {
            type: 'str',
            help: 'Force aptos deploy even if deployment already exists',
            default: 'false',
            choices: ['true', 'false'],
            required: false,
        })
    }

    sanitizeArgs() {
        const args = this.parser.parse_args()

        if (args.vm === 'move') {
            if (!this.aptosArgs.includes(args.op)) {
                throw new Error(`Operation ${args.op} is not valid for aptos`)
            }
        } else if (args.vm === 'evm') {
            if (!this.ethereumArgs.includes(args.op)) {
                throw new Error(`Operation ${args.op} is not valid for ethereum`)
            }
        }

        this.args = args
    }

    getArgs() {
        return this.args
    }

    async evmOperations(_callFromInheritance: boolean = false) {
        switch (this.args.op) {
            case 'wire':
                wireEvm(this.args.lz_config)
                break
        }
    }

    async aptosOperations(_callFromInheritance: boolean = false) {
        switch (this.args.op) {
            case 'wire':
                wireMove(this.args.lz_config)
                break
            case 'build':
                build(this.args)
                break
            case 'deploy': {
                const aptosDeployScript = await import(path.join(this.rootDir, this.args.move_deploy_script))

                const contractName = aptosDeployScript.contractName
                await build(this.args, contractName)
                await deploy(this.args, contractName)
                await setDelegate(this.args)
                break
            }
            case 'init':
                if (_callFromInheritance) {
                    console.error(
                        'init needs to be called through @layerzerolabs/oft-movement as it is an extended function'
                    )
                    return 1
                }
                break
            default:
                throw new Error(`Invalid operation: ${this.args.op}`)
        }
    }

    async cli(_callFromInheritance: boolean = false) {
        switch (this.args.vm) {
            case 'evm':
                await this.evmOperations(_callFromInheritance)
                break
            case 'move':
                await this.aptosOperations(_callFromInheritance)
                break
            default:
                throw new Error(`Invalid VM: ${this.args.vm}`) // unreachable line lol
        }
    }
}

export { AptosEVMCLI_Core }
