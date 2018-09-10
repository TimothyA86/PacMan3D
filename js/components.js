let Components = (function()
{
    let count = 0;

    function create(dataFunction)
    {
        return ECS.Component.createBlueprint(count++, dataFunction);
    }

    let Components =
    {
        Collectable: create((radius, value, flags) => ({ radius: radius, flags: flags,
            value: value, Collected: new ECS.Event() })),
        Collector: create((radius, flags) => ({ radius: radius, flags: flags })),
        Dot: create(EMPTY_FUNCTION),
        Energizer: create(EMPTY_FUNCTION),
        Player: create((leftKey, rightKey, downKey, upKey) =>
        ({
            leftKey: leftKey,
            rightKey: rightKey,
            downKey: downKey,
            upKey: upKey,
            priorities: { left: -1, right: -1, down: -1, up: -1, current: 0 }
        })),
        Ai: create(() => ({ target: new THREE.Vector3(), nextIntersection: new THREE.Vector3(), forceReverse: false })),
        Movement: create(function(speed)
        {
            let component =
            {
                speed: 0,
                modifier: 1,
                start: function() { this.speed = speed; },
                stop: function() { this.speed = 0; },
                direction: Direction.None,
                desiredDirection: Direction.None,
                screenWrapped: false,
                masks: new Array(5).fill(CollisionFlags.All & ~CollisionFlags.ScreenWrap)
            };

            return component;
        }),
        Mesh: create((x, y, z, geo, mat) =>
        {
            let mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            mesh.previousPosition = mesh.position.clone();
            mesh.cell = mesh.position.clone().divideScalar(TILE_SIZE).floor();
            mesh.previousCell = mesh.cell.clone();
            mesh.up.set(0, 0, 1);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            return { mesh: mesh };
        }),
        PacMan: create((radius) => ({ radius: radius })),
        Ghost: create((ghostType, radius) => ({ ghostType: ghostType, radius: radius })),
        Penned: create(EMPTY_FUNCTION),
        LeavePen: create(EMPTY_FUNCTION),
        Dead: create(EMPTY_FUNCTION),
        Chase: create(EMPTY_FUNCTION),
        Frightened: create(EMPTY_FUNCTION),
        Scatter: create(EMPTY_FUNCTION)
    };

    return Object.freeze(Components);
})();