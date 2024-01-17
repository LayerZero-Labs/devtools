export type Hash = string | number | boolean | bigint

export type HashFunction<T, H extends Hash = Hash> = (value: T) => H

/**
 * Data structure similar to the default ES6 Map
 * with one crucial difference - it requires a hash function
 * which allows it to store values not by reference, but by value
 *
 * The implementation is quite naive as it uses three additional maps
 * to be able to easily implement the ES6 Map interface. This comes at a small
 * storage price which, in our environment, is perfectly negligible.
 *
 * The interface matches the interface of Map with one syntactic sugar added:
 * the getOrElse method that prevents us from having to do null checks on get.
 */
export abstract class AbstractMap<K, V> implements Map<K, V> {
    #keys: Map<Hash, K> = new Map()

    #values: Map<Hash, V> = new Map()

    #entries: Map<Hash, [K, V]> = new Map()

    protected abstract hash(key: K): Hash

    constructor(entries: Iterable<[K, V]> = []) {
        for (const [key, value] of entries) {
            this.set(key, value)
        }
    }

    clear(): void {
        this.#keys.clear()
        this.#values.clear()
        this.#entries.clear()
    }

    delete(key: K): boolean {
        const serialized = this.hash(key)

        return this.#keys.delete(serialized), this.#values.delete(serialized), this.#entries.delete(serialized)
    }

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
        for (const [_, [key, value]] of this.#entries) {
            callbackfn.apply(thisArg, [value, key, this])
        }
    }

    get(key: K): V | undefined {
        return this.#values.get(this.hash(key))
    }

    getOrElse(key: K, orElse: () => V): V {
        return this.has(key) ? (this.get(key) as V) : orElse()
    }

    has(key: K): boolean {
        return this.#keys.has(this.hash(key))
    }

    set(key: K, value: V): this {
        const serialized = this.hash(key)

        return (
            this.#keys.set(serialized, key),
            this.#values.set(serialized, value),
            this.#entries.set(serialized, [key, value]),
            this
        )
    }

    get size(): number {
        return this.#entries.size
    }

    entries(): IterableIterator<[K, V]> {
        return this.#entries.values()
    }

    keys(): IterableIterator<K> {
        return this.#keys.values()
    }

    values(): IterableIterator<V> {
        return this.#values.values()
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries()
    }

    [Symbol.toStringTag] = 'HashMap'
}
