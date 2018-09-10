class FrozenMap extends Map
{
    constructor(entries)
    {
        super(entries);
        Object.freeze(this);
    }

    forceSet(key, value) { super.set(key, value); }
    forceDelete(key) { super.delete(key); }
    forceClear() { super.clear(); }

    set(key, value)
    {
        if (Object.isFrozen(this))
        {
            throw new Error("This map is frozen");
        }
        super.set(key, value);
    }

    delete(key)
    {
        if (Object.isFrozen(this))
        {
            throw new Error("This map is frozen");
        }
        super.delete(key);
    }

    clear()
    {
        if (Object.isFrozen(this))
        {
            throw new Error("This map is frozen");
        }
        super.clear();
    }
}