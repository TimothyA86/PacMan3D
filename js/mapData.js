class MapData
{
    /**
     * @param {THREE.Texture} texture 
     */
    static createDataFromTexture(texture)
    {
        let imageData = Misc.extractImageData(texture);
        let width = imageData.width;
        let height = imageData.height;
        let data = imageData.data;

        let snapshot = new Snapshot();
        let collisionMap = new CollisionMap(width, height, CollisionFlags.All);

        let index, key;
        let type, mask;

        for (let y = 0; y < height; ++y)
        {
            for (let x = 0; x < width; ++x)
            {
                index = x + y * width << 2;
                key = new THREE.Color(data[index] / 255, data[index + 1] / 255, data[index + 2] / 255).getHex();

                if (key == MapData.screenWrapColor)
                {
                    collisionMap.setFlags(x, height - y - 1, CollisionFlags.ScreenWrap);
                    continue;
                }
                
                type = MapData.colorEntityMap.get(key);

                if (type === undefined) continue;

                mask = MapData.entityMaskMap[type];

                snapshot.push(type, x, height - y - 1);
                collisionMap.setFlags(x, height - y - 1, mask);
            }
        }

        snapshot.freeze();
        collisionMap.freeze();

        return Object.freeze(
        {
            width: width,
            height: height,
            snapshot: snapshot,
            collisionMap: collisionMap
        });
    }
}

MapData.screenWrapColor = 0xff00ff;
MapData.colorEntityMap = new FrozenMap(
[
    [0x000000, EntityType.None],
    [0xffff00, EntityType.PacMan],
    [0xfe2500, EntityType.Blinky],
    [0xfeb2af, EntityType.Pinky],
    [0x00dee1, EntityType.Inky],
    [0xfea000, EntityType.Clyde],
    [0x00ff00, EntityType.Energizer],
    [0xffffff, EntityType.Dot],
    // [COLOR, EntityType.Fruit],
    [0x7f7f7f, EntityType.Door],
    [0x0000ff, EntityType.Wall],
]);
    
MapData.entityMaskMap = new Array(EntityType.count).fill(CollisionFlags.None);
MapData.entityMaskMap[EntityType.Door] = CollisionFlags.Door;
MapData.entityMaskMap[EntityType.Wall] = CollisionFlags.Wall;
Object.freeze(MapData.entityMaskMap);

class CollisionMap extends Array
{
    constructor(width, height, outOfBoundsMask = 0)
    {
        super(width * height);

        Object.defineProperties(this,
        {
            'm_width': { value: width },
            'm_height': { value: height },
            'm_outOfBoundsMask': { value: outOfBoundsMask }
        });
    }

    get width() { return this.m_width; }
    get height() { return this.m_height; }

    freeze()
    {
        Object.freeze(this);
    }

    inBounds(x, y)
    {
        return (x >= 0 && x < this.m_width && y >= 0 && y < this.m_height);
    }

    getMask(x, y)
    {
        return this.inBounds(x, y) ? this[x + y * this.m_width] : this.m_outOfBoundsMask;
    }

    setFlags(x, y, flags)
    {
        this[x + y * this.m_width] |= flags;
    }

    removeFlags(x, y, flags)
    {
        this[x + y * this.m_width] &= ~flags;
    }

    hasFlags(x, y, flags)
    {
        return ((this.getMask(x, y) & flags) != 0);
    }

    hasMask(x, y, mask)
    {
        return ((this.getMask(x, y) & mask) == mask);
    }
}

class Snapshot extends Array
{
    constructor() { super(); }

    freeze() { Object.freeze(this); }

    push(type, x, y)
    {
        super.push(Object.freeze({ type: type, x: x, y: y }));
    }

    get(index)
    {
        return this[index];
    }
}