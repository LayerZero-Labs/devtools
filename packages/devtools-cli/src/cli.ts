import { Command } from 'commander'
import { version, name } from '../package.json'
import { oapp } from './commands/oapp'

new Command(name).description('CLI for configuring LayerZero OApps').version(version).addCommand(oapp).parseAsync()
