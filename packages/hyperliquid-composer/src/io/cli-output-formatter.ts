import Table from 'cli-table3'

import { SpotBalancesResponse } from '@/types'

export function formatBalancesTable(balances: SpotBalancesResponse, showZeroBalances: boolean): string {
    if (balances.balances.length === 0) {
        return 'No balances found for this address.'
    }

    const table = new Table({
        head: ['Coin', 'Token', 'Total', 'Hold', 'Entry Ntl'],
        colAligns: ['left', 'right', 'right', 'right', 'right'],
    })

    let filteredBalances = balances.balances

    if (!showZeroBalances) {
        filteredBalances = balances.balances.filter((balance) => parseFloat(balance.total) > 0)
    }

    if (filteredBalances.length === 0) {
        return 'No non-zero balances found for this address.'
    }

    filteredBalances.sort((a, b) => parseFloat(b.total) - parseFloat(a.total))

    for (const balance of filteredBalances) {
        const total = parseFloat(balance.total)
        const hold = parseFloat(balance.hold)
        const entryNtl = parseFloat(balance.entryNtl)

        table.push([
            balance.coin,
            balance.token.toString(),
            total === 0 ? '0.0' : total.toFixed(8).replace(/\.?0+$/, ''),
            hold === 0 ? '0.0' : hold.toFixed(8).replace(/\.?0+$/, ''),
            entryNtl === 0 ? '0.0' : entryNtl.toFixed(6).replace(/\.?0+$/, ''),
        ])
    }

    let output = '\nBalances:\n' + table.toString()

    const totalBalances = balances.balances.length
    const nonZeroBalances = balances.balances.filter((b) => parseFloat(b.total) > 0).length
    const shownBalances = filteredBalances.length

    output += `\n\nShowing ${shownBalances} balances (${nonZeroBalances} non-zero out of ${totalBalances} total)`

    return output
}
