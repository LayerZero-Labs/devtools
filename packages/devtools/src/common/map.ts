export abstract class HashMap<K, V> implements Map<K, V> {
    #keys: Map<string, K> = new Map()

    #values: Map<string, V> = new Map()

    #entries: Map<string, [K, V]> = new Map()

    protected abstract serializeKey(key: K): string

    clear(): void {
        this.#keys.clear()
        this.#values.clear()
        this.#entries.clear()
    }

    delete(key: K): boolean {
        const serialized = this.serializeKey(key)

        return this.#keys.delete(serialized), this.#values.delete(serialized), this.#entries.delete(serialized)
    }

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
        for (const [_, [key, value]] of this.#entries) {
            callbackfn.apply(thisArg, [value, key, this])
        }
    }

    get(key: K): V | undefined {
        return this.#values.get(this.serializeKey(key))
    }

    has(key: K): boolean {
        return this.#keys.has(this.serializeKey(key))
    }

    set(key: K, value: V): this {
        const serialized = this.serializeKey(key)

        return this.#keys.set(serialized, key), this.#values.set(serialized, value), this
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
