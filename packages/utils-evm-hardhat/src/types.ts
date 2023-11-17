import { Chain, ChainType, Stage, getChainType } from "@layerzerolabs/lz-definitions"
import { HardhatError } from "hardhat/internal/core/errors"
import { ERRORS } from "hardhat/internal/core/errors-list"
import { CLIArgumentType } from "hardhat/types"
import { z } from "zod"

const StageSchema = z.nativeEnum(Stage).default(Stage.TESTNET)

const ChainSchema = z.string().refine(
    (value: string): value is Chain => getChainType(value as Chain) === ChainType.EVM,
    (value) => ({ message: `Invalid EVM chain: ${value}` })
)

/**
 * Helper zod schema that splits a comma-separated string
 * into individual values, trimming the results
 */
const CommaSeparatedValuesSchema = z.string().transform((value) =>
    value
        .trim()
        .split(/\s*,\s*/)
        .filter(Boolean)
)

/**
 * Schema that takes a comma-separated strings of chain names and outputs
 * an array of valid EVM chains
 */
const ChainListSchema = CommaSeparatedValuesSchema.pipe(z.array(ChainSchema))

/**
 * Hardhat CLI type for Chain (e.g. avalanche, bsc, base)
 */
const chains: CLIArgumentType<Chain[]> = {
    name: "chains",
    parse(name: string, value: string) {
        const result = ChainListSchema.safeParse(value)
        if (!result.success) {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: "chains",
            })
        }

        return result.data
    },
    validate() {},
}

/**
 * Hardhat CLI type for Stage (mainnet/testnet/sandbox)
 */
const stage: CLIArgumentType<Stage> = {
    name: "stage",
    parse(name: string, value: string) {
        const result = StageSchema.safeParse(value)
        if (!result.success) {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: "stage",
            })
        }

        return result.data
    },
    validate() {},
}

export const types = { chains, stage }
