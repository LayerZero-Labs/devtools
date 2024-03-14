import { EndpointId } from '@layerzerolabs/lz-definitions'
import { wordlist } from '@scure/bip39/wordlists/english'

export const ENDPOINT_IDS = Object.values(EndpointId).filter((value): value is EndpointId => typeof value === 'number')

export const BIP39_WORDLIST: string[] = wordlist
