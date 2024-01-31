import { z } from 'zod'
import { BigNumber, BigNumberish, isBigNumberish } from '@ethersproject/bignumber/lib/bignumber'

export const BigNumberishSchema = z.custom<BigNumberish>((value: unknown) => isBigNumberish(value))

export const BigNumberishBigIntSchema = BigNumberishSchema.transform(BigNumber.from).transform((bn) => bn.toBigInt())

export const BigNumberishNumberSchema = BigNumberishSchema.transform(BigNumber.from).transform((bn) => bn.toNumber())
