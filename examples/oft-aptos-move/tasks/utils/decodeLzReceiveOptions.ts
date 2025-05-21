/* eslint-disable import/no-unresolved */
import { Options } from '@layerzerolabs/lz-v2-utilities'

export function decodeLzReceiveOptions(hex: string): string {
    try {
        if (!hex || hex === '0x') return 'No options set'
        const options = Options.fromOptions(hex)
        const lzReceiveOpt = options.decodeExecutorLzReceiveOption()
        return lzReceiveOpt
            ? `gas: ${lzReceiveOpt.gas.toLocaleString().replace(/,/g, '_')} , value: ${lzReceiveOpt.value.toLocaleString().replace(/,/g, '_')} wei`
            : 'No executor options'
    } catch (e) {
        return `Invalid options (${hex.slice(0, 12)}...)`
    }
}
