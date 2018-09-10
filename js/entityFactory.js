class EntityFactory
{
    static createPacMan(x, y, z)
    {
        let r = Geometries.PacMan.parameters.radius;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.PacMan.type, Components.PacMan.data(r * 0.7))
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z + r, Geometries.PacMan, Materials.PacMan))
            .addComponent(Components.Movement.type, Components.Movement.data(PAC_MAN_SPEED))
            .addComponent(Components.Collector.type, Components.Collector.data(r * 0.6,
                CollectableFlags.All & ~CollectableFlags.PacMan))
            .build(EntityType.PacMan);

        return entity;
    }

    static createBlinky(x, y, z)
    {
        let r = Geometries.Ghost.parameters.radius;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Ghost.type, Components.Ghost.data(GhostType.Blinky, r))
            .addComponent(Components.Ai.type, Components.Ai.data())
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z + r, Geometries.Ghost, Materials.Blinky))
            .build(EntityType.Blinky);

        return entity;
    }

    static createPinky(x, y, z)
    {
        let r = Geometries.Ghost.parameters.radius;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Ghost.type, Components.Ghost.data(GhostType.Pinky, r))
            .addComponent(Components.Ai.type, Components.Ai.data())
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z + r, Geometries.Ghost, Materials.Pinky))
            .build(EntityType.Pinky);

        return entity;
    }

    static createInky(x, y, z)
    {
        let r = Geometries.Ghost.parameters.radius;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Ghost.type, Components.Ghost.data(GhostType.Inky, r))
            .addComponent(Components.Ai.type, Components.Ai.data())
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z + r, Geometries.Ghost, Materials.Inky))
            .build(EntityType.Inky);

        return entity;
    }

    static createClyde(x, y, z)
    {
        let r = Geometries.Ghost.parameters.radius;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Ghost.type, Components.Ghost.data(GhostType.Clyde, r))
            .addComponent(Components.Ai.type, Components.Ai.data())
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z + r, Geometries.Ghost, Materials.Clyde))
            .build(EntityType.Clyde);

        return entity;
    }

    static createDot(x, y, z)
    {
        let r = Geometries.Dot.parameters.radius;
        z += Math.max(r, DOT_FLOAT_HEIGHT);

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z, Geometries.Dot, Materials.Dot))
            .addComponent(Components.Collectable.type, Components.Collectable.data(r, DOT_VALUE, CollectableFlags.Dot))
            .addComponent(Components.Dot.type, Components.Dot.data())
            .build(EntityType.Dot);

        return entity;
    }

    static createEnergizer(x, y, z)
    {
        let r = Geometries.Energizer.parameters.radius;
        z += Math.max(r, DOT_FLOAT_HEIGHT);

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z, Geometries.Energizer, Materials.Energizer))
            .addComponent(Components.Collectable.type, Components.Collectable.data(r * 0.6, ENERGIZER_VALUE, CollectableFlags.Energizer))
            .addComponent(Components.Dot.type, Components.Dot.data())
            .addComponent(Components.Energizer.type, Components.Energizer.data())
            .build(EntityType.Energizer);

        return entity;
    }

    static createFruit(x, y, z)
    {
        let entity = ECS.Entity.createBlueprint()
            .build(EntityType.Fruit);

        return entity;
    }

    static createDoor(x, y, z)
    {
        z += Geometries.Door.parameters.depth / 2;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z, Geometries.Door, Materials.Door))
            .build(EntityType.Door);

        return entity;
    }
    
    static createWall(x, y, z)
    {
        let h = (Math.random() * (MAX_WALL_HEIGHT - MIN_WALL_HEIGHT) | 0) + MIN_WALL_HEIGHT;
        let geo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, h);

        z += h / 2;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Mesh.type, Components.Mesh.data(x, y, z, geo, Materials.Wall))
            .build(EntityType.Wall);

        return entity;
    }

    static create(type, x, y, z)
    {
        return EntityFactory.createMap[type](x, y, z);
    }
}

EntityFactory.createMap = new Array(EntityType.count).fill(() => {});
EntityFactory.createMap[EntityType.PacMan]    = EntityFactory.createPacMan;
EntityFactory.createMap[EntityType.Blinky]    = EntityFactory.createBlinky;
EntityFactory.createMap[EntityType.Pinky]     = EntityFactory.createPinky;
EntityFactory.createMap[EntityType.Inky]      = EntityFactory.createInky;
EntityFactory.createMap[EntityType.Clyde]     = EntityFactory.createClyde;
EntityFactory.createMap[EntityType.Energizer] = EntityFactory.createEnergizer;
EntityFactory.createMap[EntityType.Dot]       = EntityFactory.createDot;
EntityFactory.createMap[EntityType.Fruit]     = EntityFactory.createFruit;
EntityFactory.createMap[EntityType.Door]      = EntityFactory.createDoor;
EntityFactory.createMap[EntityType.Wall]      = EntityFactory.createWall;
Object.freeze(EntityFactory.createMap);