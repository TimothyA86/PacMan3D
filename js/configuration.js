const TILE_SIZE = 32;
const MINI_MAP_TILE_SIZE = 8;
const MIN_WALL_HEIGHT = TILE_SIZE * 0.3;
const MAX_WALL_HEIGHT = TILE_SIZE * 0.7;
const DOT_FLOAT_HEIGHT = TILE_SIZE * 0.8 / 2;
const PAC_MAN_SPEED = TILE_SIZE * 2;
const GHOST_SPEED = PAC_MAN_SPEED * 0.9;
const MAIN_CAMERA_STARTING_OFFSET = Object.freeze(new THREE.Vector3(0, -2000, 200));
const MAIN_CAMERA_FOLLOW_OFFSET = Object.freeze(new THREE.Vector3(0, -TILE_SIZE * 3, TILE_SIZE * 7));

const RESPAWNS = 3;

const DOT_VALUE = 10;
const ENERGIZER_VALUE = 50;
const GHOST_VALUE = 200;

const ROUND_START_DELAY = 3;
const GHOST_RELEASE_INTERVAL = 4;
const FRIGHTEN_DURATION = 5;

const EMPTY_FUNCTION = () => {};
const EMPTY_GENERATOR = function*() {};

const EntityType = Object.freeze(
{
    None:      0,
    PacMan:    1,
    Blinky:    2,
    Pinky:     3,
    Inky:      4,
    Clyde:     5,
    Energizer: 6,
    Dot:       7,
    Fruit:     8,
    Door:      9,
    Wall:      10,
    count:     11
});

const GhostType = Object.freeze(
{
    Blinky: 0,
    Pinky:  1,
    Inky:   2,
    Clyde:  3,
    count: 4
});

const Direction = Object.freeze(
{
    None:  0,
    Right: 1,
    Up:    2,
    Left:  3,
    Down:  4,
    Vector: Object.freeze(
    [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, -1, 0)
    ])
});

const CollisionFlags = Object.freeze(
{
    None: 0,
    Wall: 1,
    Door: 2,
    ScreenWrap: 4,
    All:  7
});

const CollectableFlags = Object.freeze(
{
    None:      0,
    PacMan:    1,
    Dot:       2,
    Energizer: 4,
    Ghost:     8,
    All:       15
});

const Colors = Object.freeze(
{
    PacMan:   0xffff00,
    Blinky:   0xfe2500,
    Pinky:    0xfeb2af,
    Inky:     0x00dee1,
    Clyde:    0xfea000,
    Wall:     0x0000ff,
    SunLight: 0xffffff,
    Sky:      0xffffff,
    Ground:   0x2c2c2c,
    Fog:      0xffffff
});

const Textures =
{
    Map: undefined
};

const Geometries = Object.freeze(
{
    PacMan:    new THREE.SphereGeometry(TILE_SIZE * 0.8 / 2, 32, 32),
    Ghost:     new THREE.SphereGeometry(TILE_SIZE * 0.8 / 2, 32, 32),
    Dot:       new THREE.SphereGeometry(TILE_SIZE * 0.2 / 2, 32, 32),
    Energizer: new THREE.SphereGeometry(TILE_SIZE * 0.4 / 2, 32, 32),
    Door:      new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE * 0.2, MAX_WALL_HEIGHT),
});

const Materials = Object.freeze(
{
    PacMan:     new THREE.MeshStandardMaterial({ color: Colors.PacMan, roughness: 0, metalness: 0 }),
    Blinky:     new THREE.MeshStandardMaterial({ color: Colors.Blinky, roughness: 0, metalness: 0 }),
    Pinky:      new THREE.MeshStandardMaterial({ color: Colors.Pinky, roughness: 0, metalness: 0 }),
    Inky:       new THREE.MeshStandardMaterial({ color: Colors.Inky, roughness: 0, metalness: 0 }),
    Clyde:      new THREE.MeshStandardMaterial({ color: Colors.Clyde, roughness: 0, metalness: 0 }),
    Dot:        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0 }),
    Energizer:  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0 }),
    Door:       new THREE.MeshStandardMaterial({ color: Colors.Pinky, roughness: 0, metalness: 0 }),
    Wall:       new THREE.MeshStandardMaterial({ color: Colors.Wall, roughness: 0, metalness: 0 }),
    Ground:     new THREE.MeshStandardMaterial({ color: Colors.Ground, roughness: 0, metalness: 0 }),
    Frightened: new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0, metalness: 0 }),
    DeadGhost:  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transparent: true, opacity: 0.3 })
});