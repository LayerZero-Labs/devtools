import { Command } from 'commander'
import { wire } from './wire'

export const oapp = new Command('oapp').description('OApp configuration commands').addCommand(wire)
