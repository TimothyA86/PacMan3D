class SystemFactory
{
    static createGameControlSystem()
    {
        function onEntityCreated(entity)
        {
            let entities = entityMap.get(entity.tag)

            if (entities === undefined)
            {
                entities = [];
                entityMap.set(entity.tag, entities);
            }

            entities.push(entity);

            if (entity.tag == EntityType.PacMan)
            {
                pacManMesh = entity.getComponent(Components.Mesh.type).mesh;
            }
            else if (entity.tag == EntityType.Blinky)
            {
                blinkyMesh = entity.getComponent(Components.Mesh.type).mesh;
            }
        }

        function onEntityDestroyed(entity)
        {
            let entities = entityMap.get(entity.tag);

            if (entities !== undefined)
            {
                let index = entities.indexOf(entity);

                if (index >= 0)
                {
                    entities.splice(index, 1);
                }
            }
        }

        // Events
        let GameEvent = Object.freeze(
        {
            Starting: new ECS.Event(),
            Started:  new ECS.Event(),
            Ending:   new ECS.Event(),
            Ended:    new ECS.Event()
        });

        let LevelEvent = Object.freeze(
        {
            Starting: new ECS.Event(),
            Started:  new ECS.Event(),
            Ending:   new ECS.Event(),
            Ended:    new ECS.Event()
        });

        let RoundEvent = Object.freeze(
        {
            Starting: new ECS.Event(),
            Started:  new ECS.Event(),
            Ending:   new ECS.Event(),
            Ended:    new ECS.Event()
        });

        let GhostEvent = Object.freeze(
        {
            ReadyToLeavePen: new ECS.Event(),
            LeftPen: new ECS.Event(),
            Revived: new ECS.Event()
        });

        let TotalDotsUpdated = new ECS.Event();
        let AllPacManDied = new ECS.Event();
        let CollectableCollected = new ECS.Event();
        let DotConsumed = new ECS.Event();
        let ScoreUpdated = new ECS.Event();
        let LivesUpdated = new ECS.Event();

        // States
        let clock = new THREE.Clock(false);
        let state = waiting();

        function* waiting() {}

        function* transitionIn(event, delay)
        {
            clock.start();
            event.Starting.trigger();

            let startTime = clock.getElapsedTime();

            while (true)
            {
                if (clock.getElapsedTime() - startTime >= delay)
                {
                    state = waiting();
                    event.Started.trigger();
                }
                yield;
            }
        }

        function* transitionOut(event, delay)
        {
            clock.start();
            event.Ending.trigger();

            let startTime = clock.getElapsedTime();

            while (true)
            {
                if (clock.getElapsedTime() - startTime >= delay)
                {
                    state = waiting();
                    event.Ended.trigger();
                }
                yield;
            }
        }

        let startGame = (transitionTime) => (state = transitionIn(GameEvent, transitionTime)).next();
        let endGame = (transitionTime) => (state = transitionOut(GameEvent, transitionTime)).next();
        let startLevel = (transitionTime) => (state = transitionIn(LevelEvent, transitionTime)).next();
        let endLevel = (transitionTime) => (state = transitionOut(LevelEvent, transitionTime)).next();
        let startRound = (transitionTime) => (state = transitionIn(RoundEvent, transitionTime)).next();
        let endRound = (transitionTime) => (state = transitionOut(RoundEvent, transitionTime)).next();

        // Other functions
        function updateScore(entity, value)
        {
            score += value;
            ScoreUpdated.trigger(score);

            if (entity.hasComponent(Components.Dot.type))
            {
                DotConsumed.trigger(entity);

                if (--totalDots <= 0)
                {
                    endGame(1);
                }
            }
        }

        function onGameStarted()
        {
            score = 0;
            lives = RESPAWNS;
            LivesUpdated.trigger(lives);
            startRound(ROUND_START_DELAY);
        }

        function onAllPacManDied()
        {
            if (lives > 0)
            {
                --lives;
                LivesUpdated.trigger(lives);
                endRound(1);
            }
            else
            {
                endGame(1);
            }
        }

        // Event listening
        GameEvent.Started.addListener(onGameStarted);
        RoundEvent.Ended.addListener(() => startRound(ROUND_START_DELAY));
        AllPacManDied.addListener(onAllPacManDied);
        CollectableCollected.addListener(updateScore);
        TotalDotsUpdated.addListener((total) => totalDots = total);
        
        let entityMap = new Map();
        let lives = 0;
        let score = 0;
        let totalDots = 0;
        let pacManMesh = undefined;
        let blinkyMesh = undefined;
        let system = ECS.System.create();

        Object.defineProperties(system,
        {
            "getEntities": { value: (type) => entityMap.get(type) },
            "GameEvent": { value: GameEvent },
            "LevelEvent": { value: LevelEvent },
            "RoundEvent": { value: RoundEvent },
            "GhostEvent": { value: GhostEvent },
            "TotalDotsUpdated": { value: TotalDotsUpdated },
            "AllPacManDied": { value: AllPacManDied },
            "CollectableCollected": { value: CollectableCollected },
            "DotConsumed": { value: DotConsumed },
            "ScoreUpdated": { value: ScoreUpdated },
            "LivesUpdated": { value: LivesUpdated },
            "startGame": { value: startGame },
            "endGame": { value: endGame },
            "startLevel": { value: startLevel },
            "endLevel": { value: endLevel },
            "startRound": { value: startRound },
            "endRound": { value: endRound },
            "pacManMesh": { get: () => pacManMesh },
            "blinkyPosition": { get: () => blinkyPosition }
        });

        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(onEntityDestroyed);

        system.setUpdate(function()
        {
            state.next();
        });

        return system;
    }

    static createPacManStateSystem()
    {
        let r = Geometries.PacMan.parameters.radius;

        let compositionChangers = // Different state composition changes
        {
            waiting: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Player.type)
                .removeComponent(Components.Movement.type)
                .removeComponent(Components.Dead)
                .addComponent(Components.Collectable.type, Components.Collectable.data, r * 0.8, 0, CollectableFlags.PacMan),
            playing: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Dead.type)
                .addComponent(Components.Player.type, Components.Player.data,
                    Keyboard.Key.A, Keyboard.Key.D, Keyboard.Key.S, Keyboard.Key.W)
                .addComponent(Components.Movement.type, Components.Movement.data, PAC_MAN_SPEED)
                .addComponent(Components.Collectable.type, Components.Collectable.data, r * 0.8, 0, CollectableFlags.PacMan),
            dead: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Player.type)
                .removeComponent(Components.Movement.type)
                .removeComponent(Components.Collectable.type)
                .addComponent(Components.Dead.type, Components.Dead.data)
        };

        function onEntityCreated(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                // Make sure all pacMan start in the waiting state
                waitingSet.add(entity);
                compositionChangers.waiting.setTarget(entity).submit();

                // Record position so we can reset to start later
                let position = entity.getComponent(Components.Mesh.type).mesh.position;
                positionMap.set(entity, { current: position, start: position.clone() });
            }
        }

        function onEntityDestroyed(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                positionMap.delete(entity);
                waitingSet.delete(entity);
                playingSet.delete(entity);
                deadSet.delete(entity);
            }
        }

        function onRoundStarting()
        {
            // Set all waiting back to their start positions
            let position;

            for (let pacMan of waitingSet)
            {
                position = positionMap.get(pacMan);
                position.current.copy(position.start);
            }

            // Set all dead to start positions and waiting
            let waiting = compositionChangers.waiting;

            for (let pacMan of deadSet)
            {
                position = positionMap.get(pacMan);
                position.current.copy(position.start);
                waiting.setTarget(pacMan).submit();
                waitingSet.add(pacMan);
            }

            deadSet.clear();
        }

        function onRoundStarted()
        {
            // Set all waiting to playing
            let playing = compositionChangers.playing;

            for (let pacMan of waitingSet)
            {
                playing.setTarget(pacMan).submit();
                playingSet.add(pacMan);
            }

            waitingSet.clear();
        }

        function onRoundEnding()
        { 
            // Set all playing to waiting
            let waiting = compositionChangers.waiting;

            for (let pacMan of playingSet)
            {
                waiting.setTarget(pacMan).submit();
                waitingSet.add(pacMan);
            }

            playingSet.clear();
        }

        function onCollectableCollected(entity, value)
        {
            if (entity.hasComponent(Components.PacMan.type))
            {
                waitingSet.delete(entity);
                playingSet.delete(entity);
                deadSet.add(entity);
                compositionChangers.dead.setTarget(entity).submit();
                
                if (playingSet.size == 0)
                {
                    gameControlSystem.AllPacManDied.trigger();
                }
            }
        }

        gameControlSystem.GameEvent.Starting.addListener(onRoundStarting);
        gameControlSystem.GameEvent.Ending.addListener(onRoundEnding);
        gameControlSystem.RoundEvent.Starting.addListener(onRoundStarting);
        gameControlSystem.RoundEvent.Started.addListener(onRoundStarted);
        gameControlSystem.RoundEvent.Ending.addListener(onRoundEnding);
        gameControlSystem.CollectableCollected.addListener(onCollectableCollected);

        let positionMap = new WeakMap();
        let waitingSet = new Set();
        let playingSet = new Set();
        let deadSet = new Set();

        let system = ECS.System.create(Components.PacMan.type, Components.Mesh.type);

        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(onEntityDestroyed);

        return system;
    }

    static createGhostStateSystem()
    {
        let r = Geometries.Ghost.parameters.radius;

        let compositionChangers = // Different state composition changes
        {
            waiting: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Movement.type)
                .removeComponent(Components.Collector.type)
                .removeComponent(Components.Collectable.type)
                .removeComponent(Components.Penned.type)
                .removeComponent(Components.LeavePen.type)
                .removeComponent(Components.Dead.type)
                .removeComponent(Components.Chase.type)
                .removeComponent(Components.Frightened.type)
                .removeComponent(Components.Scatter.type),
            penned: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Movement.type)
                .removeComponent(Components.Collector.type)
                .removeComponent(Components.Collectable.type)
                .removeComponent(Components.LeavePen.type)
                .removeComponent(Components.Dead.type)
                .removeComponent(Components.Chase.type)
                .removeComponent(Components.Frightened.type)
                .removeComponent(Components.Scatter.type)
                .addComponent(Components.Penned.type, Components.Penned.data),
            leaving: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Collectable.type)
                .removeComponent(Components.Penned.type)
                .removeComponent(Components.Dead.type)
                .removeComponent(Components.Chase.type)
                .removeComponent(Components.Frightened.type)
                .removeComponent(Components.Scatter.type)
                .addComponent(Components.Movement.type, Components.Movement.data, GHOST_SPEED)
                .addComponent(Components.Collector.type, Components.Collector.data, r * 0.8, CollectableFlags.PacMan)
                .addComponent(Components.LeavePen.type, Components.LeavePen.data),
            reviving: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Collector.type)
                .removeComponent(Components.Collectable.type)
                .removeComponent(Components.Penned.type)
                .removeComponent(Components.LeavePen.type)
                .removeComponent(Components.Chase.type)
                .removeComponent(Components.Frightened.type)
                .removeComponent(Components.Scatter.type)
                .addComponent(Components.Movement.type, Components.Movement.data, GHOST_SPEED)
                .addComponent(Components.Dead.type, Components.Dead.data),
            chasing: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Collectable.type)
                .removeComponent(Components.Penned.type)
                .removeComponent(Components.LeavePen.type)
                .removeComponent(Components.Dead.type)
                .removeComponent(Components.Frightened.type)
                .removeComponent(Components.Scatter.type)
                .addComponent(Components.Movement.type, Components.Movement.data, GHOST_SPEED)
                .addComponent(Components.Collector.type, Components.Collector.data, r * 0.8, CollectableFlags.PacMan)
                .addComponent(Components.Chase.type, Components.Chase.data),
            frightened: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Collector.type)
                .removeComponent(Components.Penned.type)
                .removeComponent(Components.LeavePen.type)
                .removeComponent(Components.Dead.type)
                .removeComponent(Components.Chase.type)
                .removeComponent(Components.Scatter.type)
                .addComponent(Components.Movement.type, Components.Movement.data, GHOST_SPEED)
                .addComponent(Components.Frightened.type, Components.Frightened.data)
                .addComponent(Components.Collectable.type, Components.Collectable.data, r, GHOST_VALUE, CollectableFlags.Ghost),
            scattering: ECS.Entity.createCompositionChanger()
                .removeComponent(Components.Collectable.type)
                .removeComponent(Components.Penned.type)
                .removeComponent(Components.LeavePen.type)
                .removeComponent(Components.Dead.type)
                .removeComponent(Components.Chase.type)
                .removeComponent(Components.Frightened.type)
                .addComponent(Components.Movement.type, Components.Movement.data, GHOST_SPEED)
                .addComponent(Components.Collector.type, Components.Collector.data, r * 0.8, CollectableFlags.PacMan)
                .addComponent(Components.Scatter.type, Components.Scatter.data),
        };

        function onEntityCreated(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                // Make sure all ghost start in the penned state
                pennedSet.add(entity);
                compositionChangers.penned.setTarget(entity).submit();

                // Record position so we can reset to start later
                let position = entity.getComponent(Components.Mesh.type).mesh.position;
                positionMap.set(entity, { current: position, start: position.clone() });
            }
        }

        function onEntityDestroyed(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                positionMap.delete(entity);
                pennedSet.delete(entity);
                waitingSet.delete(entity);
                leavingSet.delete(entity);
                revivingSet.delete(entity);
                chasingSet.delete(entity);
                frightenedSet.delete(entity);
                scatteringSet.delete(entity);
            }
        }

        function onRoundStarting()
        {
            // Set all waiting back to their start positions and pen them
            let position, penned = compositionChangers.penned;

            for (let ghost of waitingSet)
            {
                position = positionMap.get(ghost);
                position.current.copy(position.start);
                pennedSet.add(ghost);
                penned.setTarget(ghost).submit();
            }

            waitingSet.clear();
        }

        function onRoundEnding()
        {
            frightenRoutine = EMPTY_GENERATOR();
            setGhostsToWaiting(pennedSet);
            setGhostsToWaiting(leavingSet);
            setGhostsToWaiting(revivingSet);
            setGhostsToWaiting(chasingSet);
            setGhostsToWaiting(frightenedSet);
            setGhostsToWaiting(scatteringSet);
        }

        function onGhostReadyToLeavePen(entity)
        {
            pennedSet.delete(entity);
            leavingSet.add(entity);
            compositionChangers.leaving.setTarget(entity).submit();
        }

        function onGhostLeftPen(entity)
        {
            leavingSet.delete(entity);
            chasingSet.add(entity);
            compositionChangers.chasing.setTarget(entity).submit();
        }

        function onGhostRevived(entity)
        {
            revivingSet.delete(entity);
            leavingSet.add(entity);
            compositionChangers.leaving.setTarget(entity).submit();
        }

        function onCollectableCollected(entity, value)
        {
            if (entity.hasComponent(Components.Energizer.type))
            {
                frightenRoutine = frightenGhosts();
            }
            else if (entity.hasComponent(Components.Ghost.type))
            {
                frightenedSet.delete(entity);
                revivingSet.add(entity);
                compositionChangers.reviving.setTarget(entity).submit();
            }
        }

        function* frightenGhosts()
        {
            let clock = new THREE.Clock();
            setGhostsToFrightened(chasingSet);
            setGhostsToFrightened(scatteringSet);

            while(clock.getElapsedTime() < FRIGHTEN_DURATION) yield;

            setGhostsToChasing(frightenedSet);
        }

        function scatterGhosts()
        {

        }

        function unscatterGhosts()
        {
            setGhostsToChasing(scatteringSet);
        }

        function setGhostsToChasing(set)
        {
            let chasing = compositionChangers.chasing;

            for (let ghost of set)
            {
                chasingSet.add(ghost);
                chasing.setTarget(ghost).submit();
            }

            set.clear();
        }

        function setGhostsToFrightened(set)
        {
            let frightened = compositionChangers.frightened;

            for (let ghost of set)
            {
                frightenedSet.add(ghost);
                frightened.setTarget(ghost).submit();
            }

            set.clear();
        }

        function setGhostsToWaiting(set)
        {
            let waiting = compositionChangers.waiting;

            for (let ghost of set)
            {
                waitingSet.add(ghost);
                waiting.setTarget(ghost).submit();
            }

            set.clear();
        }

        gameControlSystem.RoundEvent.Starting.addListener(onRoundStarting);
        gameControlSystem.RoundEvent.Ending.addListener(onRoundEnding);
        gameControlSystem.GameEvent.Ending.addListener(onRoundEnding);
        gameControlSystem.GhostEvent.ReadyToLeavePen.addListener(onGhostReadyToLeavePen);
        gameControlSystem.GhostEvent.LeftPen.addListener(onGhostLeftPen);
        gameControlSystem.GhostEvent.Revived.addListener(onGhostRevived);
        gameControlSystem.CollectableCollected.addListener(onCollectableCollected);

        let positionMap = new WeakMap();
        let pennedSet = new Set();
        let waitingSet = new Set();
        let leavingSet = new Set();
        let revivingSet = new Set();
        let chasingSet = new Set();
        let frightenedSet = new Set();
        let scatteringSet = new Set();
        let frightenRoutine = EMPTY_GENERATOR();

        let system = ECS.System.create(Components.Ghost.type, Components.Ai.type, Components.Mesh.type);

        system.setUpdate(function()
        {
            frightenRoutine.next();
        });

        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(onEntityDestroyed);

        return system;
    }

    static createGhostPennedSystem()
    {
        function compositionChangeStarted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let type = entity.getComponent(Components.Ghost.type).ghostType;
                ghosts[type].set.delete(entity);
            }
        }
        
        function compositionChangeCompleted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let type = entity.getComponent(Components.Ghost.type).ghostType;
                ghosts[type].set.add(entity);

                let mesh = entity.getComponent(Components.Mesh.type).mesh;
                mesh.cell.copy(mesh.position).divideScalar(TILE_SIZE).floor();
            }
        }
        
        function onRoundStarting()
        {
            dotsConsumed = 0;
            nextToRelease = 0;
            releaseRoutine = EMPTY_GENERATOR();
        }

        function onRoundStarted()
        {
            releaseGhostType(nextToRelease++);
            releaseRoutine = releaseOnInterval(GHOST_RELEASE_INTERVAL);
        }

        function onDotConsumed()
        {
            ++dotsConsumed;

            if (nextToRelease < ghosts.length &&
                    dotsConsumed >= ghosts[nextToRelease].releaseThreshold)
            {
                releaseGhostType(nextToRelease++);
            }
    
            releaseRoutine = releaseOnInterval(GHOST_RELEASE_INTERVAL);
        }

        
        gameControlSystem.RoundEvent.Starting.addListener(onRoundStarting);
        gameControlSystem.RoundEvent.Started.addListener(onRoundStarted);
        gameControlSystem.DotConsumed.addListener(onDotConsumed);

        function releaseGhostType(type)
        {
            let set = ghosts[type].set;

            for (let ghost of set)
            {
                gameControlSystem.GhostEvent.ReadyToLeavePen.trigger(ghost);
            }
        }

        function* releaseOnInterval(interval)
        {
            let clock = new THREE.Clock();

            while (nextToRelease < ghosts.length)
            {
                if (clock.getElapsedTime() >= interval)
                {
                    clock.start();
                    releaseGhostType(nextToRelease++);
                }
                yield;
            }
        }

        //----
        let ghosts = new Array(GhostType.count);

        for (let i = 0; i < GhostType.count; ++i)
        {
            ghosts[i] = { set: new Set(), releaseThreshold: Math.pow(2 * i, 2) };
        }

        let dotsConsumed = 0;
        let nextToRelease = 0;
        let releaseRoutine = EMPTY_GENERATOR();
        let system = ECS.System.create(Components.Ghost.type, Components.Mesh.type, Components.Ai.type, Components.Penned.type);

        system.setUpdate(function()
        {
            releaseRoutine.next();
        });

        ECS.CompositionChangeStarted.addListener(compositionChangeStarted);
        ECS.CompositionChangeCompleted.addListener(compositionChangeCompleted);

        return system;
    }

    static createGhostLeavingPenSystem()
    {
        function onCompositionChangedStarted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let node = nodeMap.get(entity);

                if (node !== undefined)
                {
                    node.masks[Direction.Up] |= CollisionFlags.Door;
                    nodeMap.delete(entity);
                    nodes.delete(node);
                }
            }
        }

        function onCompositionChangedCompleted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let ai = entity.getComponent(Components.Ai.type);
                let cell = entity.getComponent(Components.Mesh.type).mesh.cell;
                let masks = entity.getComponent(Components.Movement.type).masks;
                let node = { ai: ai, cell: cell, masks: masks };

                ai.target.copy(targetPosition);
                ai.nextIntersection.copy(cell);
                node.masks[Direction.Up] &= ~CollisionFlags.Door;

                nodeMap.set(entity, node);
                nodes.add(node);                
            }
        }

        function onGameStarting()
        {
            let door = gameControlSystem.getEntities(EntityType.Door)[0];
            let doorPosition = door.getComponent(Components.Mesh.type).mesh.position;
            targetPosition.copy(doorPosition).divideScalar(TILE_SIZE).floor();
            targetPosition.y += 1;
        }

        gameControlSystem.GameEvent.Starting.addListener(onGameStarting);

        let targetPosition = new THREE.Vector3();
        let nodeMap = new WeakMap();
        let nodes = new Set();
        let system = ECS.System.create(Components.Ghost.type, Components.Ai.type,
            Components.Mesh.type, Components.Movement.type, Components.LeavePen.type);

        system.setUpdate(function()
        {
            let ai;

            for (let node of nodes)
            {
                ai = node.ai;

                if (ai.target.equals(node.cell))
                {
                    gameControlSystem.GhostEvent.LeftPen.trigger(ai.owner);
                }
            }
        });

        ECS.CompositionChangeStarted.addListener(onCompositionChangedStarted);
        ECS.CompositionChangeCompleted.addListener(onCompositionChangedCompleted);

        return system;
    }

    static createGhostChasingSystem()
    {
        function onCompositionChangedStarted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let node = nodeMap.get(entity);

                if (node !== undefined)
                {
                    nodeMap.delete(entity);
                    nodes.delete(node);
                }
            }
        }

        function onCompositionChangedCompleted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let type = entity.getComponent(Components.Ghost.type).ghostType;
                let ai = entity.getComponent(Components.Ai.type);
                let cell = entity.getComponent(Components.Mesh.type).mesh.cell;
                let node = { type: type, ai: ai, cell: cell };

                nodeMap.set(entity, node);
                nodes.add(node);                
            }
        }

        function onGameStarting()
        {
            pacManPreviousCell = gameControlSystem.pacManMesh.previousCell;
            pacManCell = gameControlSystem.pacManMesh.cell;
        }

        gameControlSystem.GameEvent.Started.addListener(onGameStarting);

        function blinkyLogic()
        {
            return pacManCell;
        }

        function pinkyLogic()
        {
            vector0.copy(pacManCell).sub(pacManPreviousCell).multiplyScalar(2);
            return vector1.copy(pacManCell).add(vector0);
        }

        function inkyLogic()
        {  
            vector1.copy(pacManCell).sub(blinkyCell);
            vector0.copy(pacManCell).sub(pacManPreviousCell).add(vector1);
            return vector1.copy(pacManCell).add(vector0).sub(blinkyCell);
        }

        function clydeLogic()
        {
            return currentGhostCell.distanceToManhattan(pacManCell) > 4 ? pacManCell : vector0.set(-1,-1, 0);
        }

        let logicFunctions = [blinkyLogic, pinkyLogic, inkyLogic, clydeLogic];
        let vector0 = new THREE.Vector3();
        let vector1 = new THREE.Vector3();
        let pacManPreviousCell = new THREE.Vector3();
        let pacManCell = new THREE.Vector3();
        let blinkyCell = new THREE.Vector3();
        let currentGhostCell = new THREE.Vector3();
        let nodeMap = new WeakMap();
        let nodes = new Set();
        let system = ECS.System.create(Components.Ghost.type, Components.Ai.type,
            Components.Mesh.type, Components.Chase.type);

        system.setUpdate(function()
        {
            let ai;

            for (let node of nodes)
            {
                ai = node.ai;
                currentGhostCell.copy(node.cell);

                if (currentGhostCell.equals(ai.nextIntersection))
                {
                    ai.target.copy(logicFunctions[node.type]());
                }
            }
        });

        ECS.CompositionChangeStarted.addListener(onCompositionChangedStarted);
        ECS.CompositionChangeCompleted.addListener(onCompositionChangedCompleted);

        return system;
    }

    static createGhostFrightendSystem()
    {
        function onCompositionChangedStarted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let node = nodeMap.get(entity);

                if (node !== undefined)
                {
                    node.mesh.material = node.material;
                    node.movement.modifier = node.modifier;

                    nodeMap.delete(entity);
                    nodes.delete(node);
                }
            }
        }

        function onCompositionChangedCompleted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let ai = entity.getComponent(Components.Ai.type);
                let mesh = entity.getComponent(Components.Mesh.type).mesh;
                let movement = entity.getComponent(Components.Movement.type);
                let node = { ai: ai, movement: movement, mesh: mesh, modifier: movement.modifier, material: mesh.material };

                mesh.material = Materials.Frightened;
                movement.modifier = 0.5;
                ai.forceReverse = true;

                nodeMap.set(entity, node);
                nodes.add(node);                
            }
        }

        let reverseDirectionMap = [Direction.None, Direction.Left, Direction.Down, Direction.Right, Direction.Up];
        let directionMap = [Direction.Right, Direction.Up, Direction.Left, Direction.Down];
        let nodeMap = new WeakMap();
        let nodes = new Set();
        let system = ECS.System.create(Components.Ghost.type, Components.Mesh.type,
            Components.Ai.type, Components.Movement.type, Components.Frightened.type);

        system.setUpdate(function()
        {
            let ai;

            for (let node of nodes)
            {
                ai = node.ai;

                if (node.mesh.cell.equals(ai.nextIntersection))
                {
                    ai.target.copy(Direction.Vector[directionMap[Math.random() * 4 | 0]]).add(node.mesh.cell);
                }
            }
        });

        ECS.CompositionChangeStarted.addListener(onCompositionChangedStarted);
        ECS.CompositionChangeCompleted.addListener(onCompositionChangedCompleted);

        return system;
    }

    static createGhostRevivingSystem()
    {
        function onCompositionChangedStarted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let node = nodeMap.get(entity);

                if (node !== undefined)
                { 
                    node.mesh.material = node.material;
                    node.movement.masks[Direction.Down] |= CollisionFlags.Door;
                    node.movement.modifier = node.modifier;
                    nodeMap.delete(entity);
                    nodes.delete(node);
                }
            }
        }

        function onCompositionChangedCompleted(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let ai = entity.getComponent(Components.Ai.type);
                let mesh = entity.getComponent(Components.Mesh.type).mesh;
                let movement = entity.getComponent(Components.Movement.type);
                let node = { ai: ai, mesh: mesh, movement: movement, modifier: movement.modifier, material: mesh.material };

                ai.target.copy(targetPosition);
                mesh.material = Materials.DeadGhost;
                movement.masks[Direction.Down] &= ~CollisionFlags.Door;
                movement.modifier = 2;

                nodeMap.set(entity, node);
                nodes.add(node);                
            }
        }

        function onGameStarting()
        {
            let door = gameControlSystem.getEntities(EntityType.Door)[0];
            let doorPosition = door.getComponent(Components.Mesh.type).mesh.position;
            targetPosition.copy(doorPosition).divideScalar(TILE_SIZE).floor();
            targetPosition.y -= 1;
        }

        gameControlSystem.GameEvent.Starting.addListener(onGameStarting);

        let targetPosition = new THREE.Vector3();
        let nodeMap = new WeakMap();
        let nodes = new Set();
        let system = ECS.System.create(Components.Ghost.type, Components.Ai.type,
            Components.Mesh.type, Components.Movement.type, Components.Dead.type);

        system.setUpdate(function()
        {
            let ai;

            for (let node of nodes)
            {
                ai = node.ai;

                if (ai.target.equals(node.mesh.cell))
                {
                    ai.forceReverse = true;
                    gameControlSystem.GhostEvent.Revived.trigger(ai.owner);
                }
            }
        });

        ECS.CompositionChangeStarted.addListener(onCompositionChangedStarted);
        ECS.CompositionChangeCompleted.addListener(onCompositionChangedCompleted);

        return system;
    }

    static createGhostScatteringSystem()
    {   
        let system = ECS.System.create(Components.Ghost.type, Components.Scatter.type);
        return system;
    }

    static createGuiSystem()
    {
        let container = document.createElement("div");
        container.id = "guiContainer";
        document.body.appendChild(container);

        // Main menu
        let gameTitle = document.createElement("div");
        gameTitle.id = "gameTitle";
        gameTitle.classList.add("verticalHidable");
        gameTitle.textContent = "Pac - Man 3D";
        container.appendChild(gameTitle);

        let mainMenu = document.createElement("div");
        mainMenu.id = "mainMenu";
        mainMenu.classList.add("verticalHidable");
        container.appendChild(mainMenu);

        mainMenu.startGame = document.createElement("div");
        mainMenu.startGame.id = "menuItem";
        mainMenu.startGame.textContent = "Start Game";
        mainMenu.startGame.function = () => gameControlSystem.startGame(0);
        mainMenu.appendChild(mainMenu.startGame);

        mainMenu.help = document.createElement("div");
        mainMenu.help.id = "menuItem";
        mainMenu.help.textContent = "Help";
        mainMenu.help.function = () => mainMenu.helpContent.classList.toggle("active");
        mainMenu.appendChild(mainMenu.help);

        mainMenu.helpContent = document.createElement("div");
        mainMenu.helpContent.id = "menuItem";
        mainMenu.helpContent.classList.add("helpContent", "verticalHidable");
        HTML.appendTextLine(mainMenu.helpContent, "Controls", "font40", "colorRed");
        HTML.appendTextLine(mainMenu.helpContent, "W: move up");
        HTML.appendTextLine(mainMenu.helpContent, "A: move left");
        HTML.appendTextLine(mainMenu.helpContent, "S: move down");
        HTML.appendTextLine(mainMenu.helpContent, "D: move right");
        mainMenu.appendChild(mainMenu.helpContent);

        function toggleMainMenu(on)
        {
            if (on ^ gameTitle.classList.contains("active")) gameTitle.classList.toggle("active");
            if (on ^ mainMenu.classList.contains("active")) mainMenu.classList.toggle("active");
            mainMenu.startGame.classList.add("selected");
            mainMenu.helpContent.classList.remove("active");
        }

        // Game
        let countDown = document.createElement("div");
        countDown.id = "simpleMessage";
        countDown.classList.add("verticalHidable", "countDown");
        countDown.style.height = "100px";
        container.appendChild(countDown);

        let score = document.createElement("div");
        score.id = "simpleMessage";
        score.classList.add("verticalHidable", "score");
        score.style.height = "35px";
        container.appendChild(score);

        let lives = document.createElement("div");
        lives.id = "lives";
        lives.classList.add("horizontalHidable");
        container.appendChild(lives);

        function updateScore(value)
        {
            score.textContent = "" + value;
        }

        function updateLives(value)
        {
            lives.style.maxWidth = value * 64 + "px";
        }

        // Events
        function onGameStarting()
        {
            toggleMainMenu(false);

            score.style.maxHeight = score.style.height;
            updateScore(0);

            state = waiting();        
        }

        function onRoundStarting()
        {
            state = startingRound();
        }

        function onRoundStarted()
        {
            countDown.style.maxHeight = "0px";
            state = waiting();
        }

        gameControlSystem.GameEvent.Starting.addListener(onGameStarting);
        gameControlSystem.GameEvent.Ended.addListener(() => state = inMainMenu());
        gameControlSystem.RoundEvent.Starting.addListener(onRoundStarting);
        gameControlSystem.RoundEvent.Started.addListener(onRoundStarted);
        gameControlSystem.ScoreUpdated.addListener(updateScore);
        gameControlSystem.LivesUpdated.addListener(updateLives);

        // States
        let clock = new THREE.Clock(false);
        let state = inMainMenu();

        function* waiting() {}

        function* inMainMenu()
        {
            clock.start();
            let startTime = clock.getElapsedTime();

            while (clock.getElapsedTime() - startTime < 0.7) yield;

            toggleMainMenu(true);

            let menu = [mainMenu.startGame, mainMenu.help];
            let up, down, selected = 0;
            
            while (true)
            {
                up = Keyboard.isPressed(Keyboard.Key.W) ? 1 : 0;
                down = Keyboard.isPressed(Keyboard.Key.S) ? 1 : 0;

                menu[selected].classList.toggle("selected");
                selected = (selected + down - up + menu.length) % menu.length;
                menu[selected].classList.toggle("selected");

                if (Keyboard.isPressed(Keyboard.Key.Enter))
                {
                    menu[selected].function();
                }

                yield;
            }
        }

        function* startingRound()
        {
            clock.start();
            let startTime = clock.getElapsedTime();

            countDown.style.maxHeight = countDown.style.height;
            countDown.style.left = (container.clientWidth - countDown.clientWidth) / 2 + "px";
            countDown.style.top = (container.clientHeight - countDown.clientHeight) / 2 - 120 + "px";

            let intervalCount = 3;
            let intervalLength = ROUND_START_DELAY / (intervalCount + 1);

            let count, interval, previousInterval = -1;

            while (true)
            {
                interval = (clock.getElapsedTime() - startTime) / intervalLength | 0;

                if (previousInterval < interval)
                {
                    previousInterval = interval;
                    count = intervalCount - interval;
                    countDown.textContent = count <= 0 ? "GO!" : "" + count;
                }

                yield;
            }
        }
        
        let system = ECS.System.create();

        system.setUpdate(function()
        {
            state.next();
        });

        return system;
    }

    /**
     * @param {THREE.Scene} scene 
     * @param {Number} fov
     */
    static createMainRenderSystem(scene, fov = 50)
    {
        let w = window.innerWidth;
        let h = window.innerHeight;

        let renderer = new THREE.WebGLRenderer({ antialias: true });
        let camera = new THREE.PerspectiveCamera(fov, w / h);

        renderer.setSize(w, h);
        renderer.setClearColor(Colors.Fog, 1)
        renderer.autoClear = false;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;        
        renderer.setScissorTest(true);
        document.body.appendChild(renderer.domElement);

        function setCameraTarget(target)
        {
            lookAt = target;
        }

        let system = ECS.System.create();
        
        Object.defineProperties(system,
        {
            'renderer': { value: renderer },
            'camera': { value: camera },
            'setCameraTarget': { value: setCameraTarget }
        });

        let cameraPosition = camera.position;
        let desiredPosition = new THREE.Vector3();

        system.setUpdate(function()
        {
            let w = window.innerWidth;
            let h = window.innerHeight;

            renderer.setViewport(0, 0, w, h);
            renderer.setScissor(0, 0, w, h);
            renderer.clear();
            renderer.render(scene, camera);
        });

        window.addEventListener('resize', () => 
        {
            let w = window.innerWidth;
            let h = window.innerHeight;

            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });

        return system;
    }

    /**
     * @param {THREE.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} width 
     * @param {Number} height 
     * @param {THREE.WebGLRenderer} renderer 
     * @param {Number} left 
     * @param {Number} right 
     * @param {Number} top 
     * @param {Number} bottom 
     * @param {THREE.Vector3} cameraPosition
     */
    static createMiniMapSystem(scene, x, y, width, height, renderer,
            left = 0, right = left + renderer.domElement.width, top = 0, bottom = top + renderer.domElement.height,
            cameraPosition = scene.position)
    {
        let camera = new THREE.OrthographicCamera(left, right, top, bottom);
        let viewPort = { x: x, y: y, width: width, height: height };

        // Set up a scene where the minimap texture will be
        // I do this to avoid rendering the scene twice per frame
        // Instead, I only render the scene twice every 5th frame
        let miniMap = new THREE.WebGLRenderTarget(width, height);
        let miniScene = new THREE.Scene();
        let miniMaterial = new THREE.MeshBasicMaterial({ map: miniMap.texture, transparent: true, opacity: 0 });
        let miniPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), miniMaterial);

        miniPlane.scale.set(right - left, top - bottom, 1);
        miniPlane.position.set((left + right) / 2, (bottom + top) / 2, 0);
        miniScene.add(miniPlane);

        camera.position.copy(cameraPosition);

        function setViewport(x, y, width, height)
        {
            viewPort.x = x;
            viewport.y = y;
            viewPort.width = width;
            viewPort.height = height;
            miniMap.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };

        function setFrustum(left, right, top, bottom, near = camera.near, far = camera.far)
        {
            miniPlane.scale.set(right - left, top - bottom, 1);
            camera.left = left;
            camera.right = right;
            camera.top = top;
            camera.bottom = bottom;
            camera.near = near;
            camera.far = far;
            camera.updateProjectionMatrix();
        }

        function *fadeTo(opacity, duration)
        {
            if (duration <= 0)
            {
                miniMap.opacity = opacity;
                return;
            }

            let clock = new THREE.Clock();
            let startOpacity = miniMaterial.opacity;
            let deltaOpacity = opacity - startOpacity;
            let angle = Math.PI / 2;
            let percent = 0;

            while (percent < 1)
            {
                percent = clock.getElapsedTime() / duration;
                miniMaterial.opacity = startOpacity + deltaOpacity * Math.sin(angle * percent);
                yield;
            }
        }

        let fade = EMPTY_GENERATOR();
        let system = ECS.System.create();
        
        Object.defineProperties(system,
        {
            "camera": { value: camera },
            "setViewport": { value: setViewport },
            "setFrustum": { value: setFrustum },
            "fadeTo": { value: (opacity, duration) => fade = fadeTo(opacity, duration) }
        });

        let light = new THREE.AmbientLight();
        light.visible = false;
        scene.add(light);
        
        const updateMiniInterval = 5;
        let updateMini = updateMiniInterval;

        system.setUpdate(function()
        {
            fade.next();

            let x = viewPort.x;
            let y = viewPort.y;
            let w = viewPort.width;
            let h = viewPort.height;

            if (++updateMini >= updateMiniInterval)
            {
                // Only update the mini map texture every 5 frames
                updateMini = 0;
                light.visible = true;
                renderer.render(scene, camera, miniMap);
                light.visible = false;
            }
            
            renderer.setViewport(x, y, w, h);
            renderer.setScissor(x, y, w, h);
            renderer.render(miniScene, camera);
        });

        return system;
    }

    static createCameraFollowSystem(camera, followTarget = new THREE.Vector3(),
            lookAtTarget = new THREE.Vector3(), followOffset = new THREE.Vector3())
    {
        function setCamera(camera)
        {
            controlledCamera = camera;
        }

        function setFollowTarget(target, followOffset = offset)
        {
            follow = target;
            offset.copy(followOffset);
        }

        function setLookAtTarget(target)
        {
            lookAt = target;
        }

        let system = ECS.System.create();
        
        Object.defineProperties(system,
        {
            "setCamera": { value: setCamera },
            "setFollowTarget": { value: setFollowTarget },
            "setLookAtTarget": { value: setLookAtTarget }
        });

        let controlledCamera = camera;
        let follow = followTarget;
        let lookAt = lookAtTarget;
        let offset = followOffset;
        let cameraPosition = camera.position;
        let desiredPosition = new THREE.Vector3();

        system.setUpdate(function()
        {
            desiredPosition.copy(follow).add(offset);
            cameraPosition.x += (desiredPosition.x - cameraPosition.x) * 0.5;
            cameraPosition.y += (desiredPosition.y - cameraPosition.y) * 0.05;
            cameraPosition.z += (desiredPosition.z - cameraPosition.z) * 0.3;

            controlledCamera.lookAt(lookAt);
        });

        return system;
    }

    static createMovementSystem(mapData)
    {
        let collisionMap = mapData.collisionMap;
        let system = ECS.System.create(Components.Mesh.type, Components.Movement.type);
        
        system.setUpdate(function(delta)
        {
            let floor = Math.floor;
            let mesh, movement;
            let position, movementVector, desiredMovementVector, speed;
            let x, y, cell = new THREE.Vector3();

            let negatedMovementVector = new THREE.Vector3();

            for (let node of system.nodes)
            {
                mesh = node.mesh.mesh;
                movement = node.movement;

                position = mesh.position;
                movementVector = Direction.Vector[movement.direction];
                speed = movement.speed * movement.modifier * delta;
                
                mesh.previousPosition.copy(position);
                mesh.translateOnAxis(movementVector, speed);

                cell.copy(mesh.position).divideScalar(TILE_SIZE).floor();

                if (!cell.equals(mesh.cell))
                {
                    mesh.previousCell.copy(mesh.cell);
                }

                mesh.cell.copy(cell);
                movement.screenWrapped = false;

                if (collisionMap.hasFlags(cell.x, cell.y, CollisionFlags.ScreenWrap) &&
                        !collisionMap.hasFlags(mesh.previousCell.x, mesh.previousCell.y, CollisionFlags.ScreenWrap))
                {
                    // Screen wrap (little fudged... but oh well)
                    let amount = movementVector.x != 0 ? mapData.width : mapData.height;
                    mesh.translateOnAxis(movementVector.clone().negate(), (amount - 1) * TILE_SIZE);
                    mesh.cell.copy(position).divideScalar(TILE_SIZE).floor();
                    mesh.previousCell.copy(cell);
                    movement.screenWrapped = true;
                }


                if (movement.direction != movement.desiredDirection)
                {
                    // Attempt to change direction
                    desiredMovementVector = Direction.Vector[movement.desiredDirection];
                    negatedMovementVector.copy(movementVector).negate();

                    if (desiredMovementVector.equals(negatedMovementVector))
                    {
                        // Opposite direction -> no need to worry about collisions or alignment
                        movement.direction = movement.desiredDirection;
                        continue;
                    }
                    
                    if (mesh.isAlignedToGrid(TILE_SIZE, TILE_SIZE) || mesh.didCrossGrid(TILE_SIZE, TILE_SIZE)) // have to cross center to turn
                    {
                        // Turning -> need to worry about collisions and alignment
                        x = floor(position.x / TILE_SIZE + desiredMovementVector.x);
                        y = floor(position.y / TILE_SIZE + desiredMovementVector.y);

                        if (!collisionMap.hasFlags(x, y, movement.masks[movement.desiredDirection]))
                        {
                            movement.direction = movement.desiredDirection;
                            mesh.alignToGrid(TILE_SIZE, TILE_SIZE);
                            continue;
                        }
                    }
                }

                // Continued in same direction
                x = floor(position.x / TILE_SIZE + movementVector.x / 2);
                y = floor(position.y / TILE_SIZE + movementVector.y / 2);

                if (collisionMap.hasFlags(x, y, movement.masks[movement.direction]))
                {
                    mesh.alignToGrid(TILE_SIZE, TILE_SIZE);
                    movement.direction = Direction.None;
                    movement.stop();
                }
            }
        });

        let onEntityCreated = ECS.System.StandardMethods.onEntityCreated(system,
            [['mesh', Components.Mesh.type], ['movement', Components.Movement.type]]);
        let onEntityDestroyed = ECS.System.StandardMethods.onEntityDestroyed(system);

        ECS.System.StandardMethods.init(system)();
        ECS.EntityCreated.addListener(onEntityCreated)
        ECS.EntityDestroyed.addListener(onEntityDestroyed);
        ECS.CompositionChangeStarted.addListener(onEntityDestroyed);
        ECS.CompositionChangeCompleted.addListener(onEntityCreated);

        return system;
    }

    static createPlayerControlSystem()
    {
        gameControlSystem.RoundEvent.Started.addListener(() =>
        {   // Update keys when round starts
            let player, p;

            for (let node of system.nodes)
            {
                player = node.player;
                p = player.priorities;

                if (Keyboard.isDown(player.rightKey)) p.right = ++p.current;
                if (Keyboard.isDown(player.leftKey)) p.left = ++p.current;
                if (Keyboard.isDown(player.downKey)) p.down = ++p.current;
                if (Keyboard.isDown(player.upKey)) p.up = ++p.current;
            }
        });

        function getPriorityKey(player)
        {
            let p = player.priorities;

            if (Keyboard.isPressed(player.rightKey)) p.right = ++p.current;
            else if (!Keyboard.isDown(player.rightKey)) p.right = -1;

            if (Keyboard.isPressed(player.leftKey)) p.left = ++p.current;
            else if (!Keyboard.isDown(player.leftKey)) p.left = -1;

            if (Keyboard.isPressed(player.downKey)) p.down = ++p.current;
            else if (!Keyboard.isDown(player.downKey)) p.down = -1;

            if (Keyboard.isPressed(player.upKey)) p.up = ++p.current;
            else if (!Keyboard.isDown(player.upKey)) p.up = -1;

            return Math.max(p.right, p.left, p.down, p.up, 0);
        }

        let system = ECS.System.create(Components.Player.type, Components.Movement.type);
        let directionMap = new Map();

        system.setUpdate(function()
        {
            let player, movement, priorities, priorityKey;

            for (let node of system.nodes)
            {
                player = node.player;
                movement = node.movement;

                priorities = player.priorities;
                priorityKey = getPriorityKey(player);

                if (priorityKey == 0)
                {
                    movement.desiredDirection = movement.direction;
                    continue;
                }

                directionMap.set(priorities.right, Direction.Right);
                directionMap.set(priorities.left, Direction.Left);
                directionMap.set(priorities.down, Direction.Down);
                directionMap.set(priorities.up, Direction.Up);

                movement.desiredDirection = directionMap.get(priorityKey);
                movement.start();
                directionMap.clear();
            }
        });

        let onEntityCreated = ECS.System.StandardMethods.onEntityCreated(system,
            [['player', Components.Player.type], ['movement', Components.Movement.type]]);
        let onEntityDestroyed = ECS.System.StandardMethods.onEntityDestroyed(system);

        ECS.System.StandardMethods.init(system)();
        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(onEntityDestroyed);
        ECS.CompositionChangeStarted.addListener(onEntityDestroyed);
        ECS.CompositionChangeCompleted.addListener(onEntityCreated);

        return system;
    }

    static createAiControlSystem(collisionMap)
    {
        function getNextIntersection(target, cells, backup)
        {
            let lowestDist = Infinity;
            let lowestCell = undefined, dist;

            for (let cell of cells)
            {
                dist = cell.distanceToSquared(target);

                if (dist < lowestDist)
                {
                    lowestDist = dist;
                    lowestCell = cell;
                }
            }

            return lowestCell === undefined ? backup : lowestCell;
        }

        let system = ECS.System.create(Components.Ai.type, Components.Mesh.type, Components.Movement.type);

        let validCells = new Array(3);
        let cells = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
        let currentCell = new THREE.Vector3();
        let negatedMovementVector = new THREE.Vector3();

        for (let i = 0; i < cells.length; ++i)
        {
            cells[i].relativeDirection = i + 1;
        }

        currentCell.relativeDirection = 0;

        system.setUpdate(function()
        {
            let n = Direction.Vector.length;
            let directionVector, lastIntersection, nextIntersection;
            let ai, mesh, movement, cell;

            for (let node of system.nodes)
            {
                ai = node.ai;
                mesh = node.mesh.mesh;
                movement = node.movement;

                currentCell.copy(mesh.cell);

                if (movement.screenWrapped)
                {
                    ai.nextIntersection.copy(mesh.cell);
                }

                if (ai.forceReverse)
                {
                    ai.forceReverse = false;
                    cell = cells[(movement.direction + 1) % cells.length].copy(currentCell);
                    cell.add(Direction.Vector[cell.relativeDirection]);

                    if (!collisionMap.hasFlags(cell.x, cell.y, movement.masks[cell.relativeDirection]))
                    {
                        ai.nextIntersection.copy(cell);
                        movement.desiredDirection = cell.relativeDirection;
                        continue;
                    }
                }

                if (!currentCell.equals(ai.nextIntersection)) continue;

                lastIntersection = currentCell;
                negatedMovementVector.copy(Direction.Vector[movement.direction]).negate();

                validCells.length = 0;

                for (let i = 1; i < n; ++i)
                {
                    directionVector = Direction.Vector[i];
                    cell = cells[i - 1].copy(currentCell).add(directionVector);

                    if (directionVector.equals(negatedMovementVector))
                    {
                        lastIntersection = cell;
                        continue;
                    }

                    if (!collisionMap.hasFlags(cell.x, cell.y, movement.masks[i]))
                    {
                        validCells.push(cell);
                    }
                }

                nextIntersection = getNextIntersection(ai.target, validCells, lastIntersection);
                ai.nextIntersection.copy(nextIntersection);
                movement.desiredDirection = nextIntersection.relativeDirection;
                movement.start();
            }
        });

        let onEntityCreated = ECS.System.StandardMethods.onEntityCreated(system,
            [["ai", Components.Ai.type], ["mesh", Components.Mesh.type], ["movement", Components.Movement.type]]);
        let onEntityDestroyed = ECS.System.StandardMethods.onEntityDestroyed(system);

        ECS.System.StandardMethods.init(system)();
        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(onEntityDestroyed);
        ECS.CompositionChangeStarted.addListener(onEntityDestroyed);
        ECS.CompositionChangeCompleted.addListener(onEntityCreated);

        return system;
    }

    static createCollectionSystem()
    {
        let collectorNodeMap = new WeakMap();
        let collectableNodeMap = new WeakMap();
        let collectables = new Set();
        let collectors = new Set();
        let signatures =
        {
            collectable: new ECS.Signature([Components.Mesh.type, Components.Collectable.type]),
            collector:   new ECS.Signature([Components.Mesh.type, Components.Collector.type])
        }

        function onEntityCreated(entity)
        {
            if (entity.containsSignature(signatures.collectable))
            {
                let node = 
                {
                    position: entity.getComponent(Components.Mesh.type).mesh.position,
                    collectable: entity.getComponent(Components.Collectable.type)
                };

                if (collectableNodeMap.has(entity)) return;

                collectables.add(node);
                collectableNodeMap.set(entity, node);
            }
            
            if (entity.containsSignature(signatures.collector))
            {
                let node =
                {
                    position: entity.getComponent(Components.Mesh.type).mesh.position,
                    collector: entity.getComponent(Components.Collector.type)
                };

                if (collectorNodeMap.has(entity)) return;
                
                collectors.add(node);
                collectorNodeMap.set(entity, node);
            }
        }

        function onEntityDestroyed(entity)
        {
            let node = collectableNodeMap.get(entity);

            if (node !== undefined)
            {
                collectables.delete(node);
                collectableNodeMap.delete(entity);
            }

            node = collectorNodeMap.get(entity);

            if (node !== undefined)
            {
                collectors.delete(node);
                collectorNodeMap.delete(entity);
            }
        }
        
        let system = ECS.System.create();

        system.setUpdate(function()
        {
            let r, collector, collectable;

            // Just simply iterating instead of using fancy trees or spatial hashing
            // I don't see much benefit for this simple game

            for (let collectorNode of collectors)
            {
                for (let collectableNode of collectables)
                {
                    collector = collectorNode.collector;
                    collectable = collectableNode.collectable;
                    r = collector.radius + collectable.radius;

                    if ((collector.flags & collectable.flags) != 0 &&
                            collectorNode.position.distanceToSquared(collectableNode.position) <= r * r)
                    {
                        collectable.Collected.trigger(collector, collectable);
                        gameControlSystem.CollectableCollected.trigger(collectable.owner, collectable.value);
                    }
                }
            }
            
        });

        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(onEntityDestroyed);
        ECS.CompositionChangeStarted.addListener(onEntityDestroyed);
        ECS.CompositionChangeCompleted.addListener(onEntityCreated);

        return system;
    }

    static createMeshControlSystem(scene)
    {
        let system = ECS.System.create(Components.Mesh.type);

        ECS.EntityCreated.addListener((entity) =>
        {
            if (system.canOperateOnEntity(entity))
            {
                scene.add(entity.getComponent(Components.Mesh.type).mesh);
            }
        });

        ECS.EntityDestroyed.addListener((entity) =>
        {
            if (system.canOperateOnEntity(entity))
            {
                scene.remove(entity.getComponent(Components.Mesh.type).mesh);
            }
        });

        return system;
    }

    static createDotControlSystem()
    {
        function onEntityCreated(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let mesh = entity.getComponent(Components.Mesh.type).mesh;
                let collectable = entity.getComponent(Components.Collectable.type);
                let node = { mesh: mesh, collectable: collectable, flags: collectable.flags };

                nodeMap.set(entity, node);
                nodes.add(node);
            }
        }

        function onEntityDestroyed(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let node = nodeMap.get(entity);

                if (node !== undefined)
                {
                    nodeMap.delete(entity);
                    nodes.delete(node);
                }
            }
        }

        function onDotConsumed(entity)
        {
            let node = nodeMap.get(entity);

            if (node != undefined)
            {
                node.mesh.visible = false;
                node.collectable.flags = CollectableFlags.None;
            }
        }

        function onGameStarted()
        {
            for (let node of nodes)
            {
                node.mesh.visible = true;
                node.collectable.flags = node.flags;
            }

            gameControlSystem.TotalDotsUpdated.trigger(nodes.size);
        }

        gameControlSystem.GameEvent.Started.addListener(onGameStarted);
        gameControlSystem.DotConsumed.addListener(onDotConsumed);

        let nodeMap = new WeakMap();
        let nodes = new Set();
        let system = ECS.System.create(Components.Dot.type, Components.Collectable.type, Components.Mesh.type);

        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(onEntityDestroyed);

        return system;
    }
}