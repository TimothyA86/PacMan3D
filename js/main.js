if (false) // Just for vs code intellisense
{
    const THREE = require('three');
}

window.onload = loadResources;

const gameControlSystem = SystemFactory.createGameControlSystem();

function loadResources()
{
    // Set up loading manager
    let loader, manager = new THREE.LoadingManager();

    manager.onLoad = () =>
    {
        Object.freeze(Textures);
        init();
    }

    manager.onProgress = (url, current, total) =>
    {
        console.log("loading", url, "\n", current, "/", total);
    }

    // Textures
    loader = new THREE.TextureLoader(manager);

    loader.load("textures/Map.png", (texture) =>
    {
        Textures.Map = texture;
    });
}

function init()
{
    let scene = new THREE.Scene();
    scene.background = new THREE.Color(Colors.Fog);
    scene.fog = new THREE.FogExp2(scene.background, 0.0008);

    let mapData = MapData.createDataFromTexture(Textures.Map);
    let w = mapData.width * TILE_SIZE;
    let h = mapData.height * TILE_SIZE;
    let mapPosition = new THREE.Vector3(w / 2, h / 2, 0);

    let mainRenderSystem = SystemFactory.createMainRenderSystem(scene, 60);
    let miniMapSystem = SystemFactory.createMiniMapSystem(scene, 20, 20,
        mapData.width * MINI_MAP_TILE_SIZE, mapData.height * MINI_MAP_TILE_SIZE, mainRenderSystem.renderer,
        0, w, h, 0, new THREE.Vector3(0, 0, Math.max(MAX_WALL_HEIGHT, TILE_SIZE) + 1));

    createAnonymousSystems(scene, mapData);
    setSceneFromMapData(scene, mapData);
    setupLights(scene, mapPosition, w, h);
    
    mainRenderSystem.camera.position.copy(mapPosition.clone().add(MAIN_CAMERA_STARTING_OFFSET));

    let menuPosition = mainRenderSystem.camera.position.clone();
    let menuLookAt = mapPosition.clone();
    let pacManPosition = gameControlSystem.getEntities(EntityType.PacMan)[0]
        .getComponent(Components.Mesh.type).mesh.position;

    let cameraFollowSystem = SystemFactory.createCameraFollowSystem(mainRenderSystem.camera,
        menuPosition, menuLookAt);

    gameControlSystem.GameEvent.Starting.addListener(() =>
    {
        cameraFollowSystem.setFollowTarget(pacManPosition, MAIN_CAMERA_FOLLOW_OFFSET);
        cameraFollowSystem.setLookAtTarget(pacManPosition);
    });

    gameControlSystem.GameEvent.Ended.addListener(() =>
    {
        miniMapSystem.fadeTo(0, 1);
        
        mainRenderSystem.camera.up.set(0, 0, 1);
        cameraFollowSystem.setFollowTarget(menuPosition, new THREE.Vector3());
        cameraFollowSystem.setLookAtTarget(menuLookAt);
    });

    gameControlSystem.RoundEvent.Started.addListener(() =>
    {
        mainRenderSystem.camera.up.set(0, 1, 0);
        miniMapSystem.fadeTo(0.6, 1);
    });
    
    let clock = new THREE.Clock();

    function loop()
    {
        requestAnimationFrame(loop);
        ECS.System.updateAll(clock.getDelta());
        Keyboard.update();
    }

    loop();
}

function createAnonymousSystems(scene, mapData)
{
    SystemFactory.createMeshControlSystem(scene);
    SystemFactory.createGuiSystem();
    SystemFactory.createMovementSystem(mapData);

    SystemFactory.createPacManStateSystem();

    SystemFactory.createGhostStateSystem();
    SystemFactory.createGhostPennedSystem();
    SystemFactory.createGhostLeavingPenSystem();
    SystemFactory.createGhostChasingSystem();
    SystemFactory.createGhostFrightendSystem();
    SystemFactory.createGhostRevivingSystem();
    SystemFactory.createGhostScatteringSystem();

    SystemFactory.createPlayerControlSystem();
    SystemFactory.createAiControlSystem(mapData.collisionMap);
    SystemFactory.createCollectionSystem();
    SystemFactory.createDotControlSystem();
}

function setupLights(scene, mapPosition, mapWidth, mapHeight)
{
    let light, d = Math.max(mapWidth, mapHeight) / 2;

    let target = new THREE.Object3D();
    target.position.set(0, 0, 0).add(mapPosition);
    scene.add(target);

    light = new THREE.DirectionalLight(Colors.SunLight);
    light.position.set(-mapWidth / 3, mapHeight / 2, 100).add(mapPosition);
    light.castShadow = true;
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.left = -d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000;
    light.target = target;
    scene.add(light);
    
    light = new THREE.DirectionalLight(Colors.SunLight, 0.3);
    light.position.set(-mapWidth / 3, -mapHeight / 2, 100).add(mapPosition);
    light.target = target;
    scene.add(light); 

    light = new THREE.HemisphereLight(Colors.Sky, Colors.Ground, 1);
    scene.add(light);
}

function setSceneFromMapData(scene, mapData)
{
    let w = mapData.width * TILE_SIZE;
    let h = mapData.height * TILE_SIZE;

    let groundPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 10, h * 10),
        Materials.Ground);
    groundPlane.position.set(w / 2, h / 2, 0);
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    let snapshot = mapData.snapshot;
    let x, y;

    for (let o of snapshot)
    {
        x = o.x * TILE_SIZE + TILE_SIZE / 2;
        y = o.y * TILE_SIZE + TILE_SIZE / 2;

        EntityFactory.create(o.type, x, y, 0);
    }
}