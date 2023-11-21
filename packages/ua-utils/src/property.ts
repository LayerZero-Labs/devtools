import assert from "assert"

/**
 * The central concept of this module - a structure that can be evaluated into a `PropertyState`
 *
 * `Property` has three basic functions:
 *
 * - Property getter that gets the current value of the property
 * - Property setter that sets value of the property
 * - Property desired value getter that grabs the value this property should be set to
 */
export type Property<TContext extends unknown[], TValue = unknown, TResult = unknown> = (
    ...context: TContext
) => Promise<PropertyState<TValue, TResult>>

/**
 * Type encapsulating two states of a configurable property: `Configured` and `Misconfigured`
 *
 * Property property is understood as anything that has a getter and setter
 * and its value needs to match a desired value (coming from some sort of a configuration).
 */
export type PropertyState<TValue = unknown, TResult = unknown> = Configured<TValue> | Misconfigured<TValue, TResult>

/**
 * Interface for configured state of a configurable property.
 *
 * In configured state, the current value of the property matches its desired state
 * and no action is necessary.
 */
export interface Configured<TValue = unknown> {
    value: TValue
    desiredValue?: never
    configure?: never
}

/**
 * Interface for misconfigured state of a configurable property.
 *
 * In misconfigured state, the current value of the property does not match its desired state
 * and an action needs to be taken to synchronize these two.
 */
export interface Misconfigured<TValue = unknown, TResult = unknown> {
    value: TValue
    desiredValue: TValue
    configure: () => TResult | Promise<TResult>
}

export type GetPropertyValue<TContext extends unknown[], TValue = unknown> = (...context: TContext) => TValue | Promise<TValue>

export type SetPropertyValue<TContext extends unknown[], TValue = unknown, TResult = unknown> = (
    ...params: [...TContext, TValue]
) => TResult | Promise<TResult>

export interface PropertyOptions<TContext extends unknown[], TValue, TResult> {
    desired: GetPropertyValue<TContext, TValue>
    get: GetPropertyValue<TContext, TValue>
    set: SetPropertyValue<TContext, TValue, TResult>
}

/**
 * Property factory, the central functional piece of this module.
 *
 * @param `PropertyOptions<TContext extends unknown[], TValue = unknown, TResult = unknown>`
 *
 * @returns `Property<TContext, TValue, TResult>`
 */
export const createProperty =
    <TContext extends unknown[], TValue = unknown, TResult = unknown>({
        get,
        set,
        desired,
    }: PropertyOptions<TContext, TValue, TResult>): Property<TContext, TValue, TResult> =>
    async (...context) => {
        // First we grab the current & desired states of the property
        const [value, desiredValue] = await Promise.all([get(...context), desired(...context)])

        // Now we compare the current & desired states using value equality (i.e. values
        // with the same shape will be considered equal)
        //
        // We'll use the native deep equality function that throws an AssertionError
        // when things don't match so we need to try/catch and understand the catch branch
        // as inequality
        try {
            assert.deepStrictEqual(value, desiredValue)

            // The values matched, we return a Configured
            return { value }
        } catch {
            // The values did not match, we'll return a Misconfigured
            return { value, desiredValue, configure: async () => set(...context, desiredValue) }
        }
    }

/**
 * Type assertion utility for narrowing the `PropertyState` type to `Misconfigured` type
 *
 * @param value `PropertyState<TValue, TResult>`
 * @returns `value is Misconfigured<TValue, TResult>`
 */
export const isMisconfigured = <TValue = unknown, TResult = unknown>(
    value: PropertyState<TValue, TResult>
): value is Misconfigured<TValue, TResult> => "configure" in value && "desiredValue" in value && typeof value.configure === "function"

/**
 * Type assertion utility for narrowing the `PropertyState` type to `Configured` type
 *
 * @param value `PropertyState<TValue, TResult>`
 * @returns `value is Configured<TValue, TResult>`
 */
export const isConfigured = <TValue = unknown>(value: PropertyState<TValue>): value is Configured<TValue> => !isMisconfigured(value)
