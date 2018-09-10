// TODO: Implement pooling system for entities and components
const ECS = 

(function(){

class ECS_Event
{
    constructor()
    {
        Object.defineProperty(this, "m_listeners", { value: new Set() });
    }

    /**
     * Adds lisenter to the even
     * @param {Function} listeners 
     */
    addListener(listener)
    {
        this.m_listeners.add(listener);
    }

    /**
     * Remove a lisenter from the event
     * @param {Function} listeners 
     */
    removeListener(listener)
    {
        this.m_listeners.delete(listener);
    }

    /**
     * Remove all listeners from the event
     */
    clear()
    {
        this.m_listeners.clear();
    }

    /**
     * Trigger event for all listeners
     * @param {...*} args 
     */
    trigger(...args)
    {
        for (let listener of this.m_listeners)
        {
            listener(...args);
        }
    }
};

class ECS_EntityBlueprint
{
    /**
     * A blueprint from which an entity can be built
     */
    constructor()
    {
        ECS_privateProperties.set(this, { components: [] });
    }

    /**
     * Attaches a component to the blueprint.
     * @param {Number} type 
     * @param {{}} data 
     */
    addComponent(type, data)
    {
        ECS_privateProperties.get(this).components.push([type, Object.assign({}, data)]);
        return this;
    }

    /**
     * Builds the blueprint into an entity.
     * @param {*} tag
     * @returns {ECS_Entity}
     */
    build(tag = "default")
    {
        let entitySignature = new ECS_Signature();
        let entityComponents = new Map();
        let entity = new ECS_Entity(tag, entitySignature, entityComponents);

        let components = ECS_privateProperties.get(this).components;
        let componentArray, component;

        for (let [type, data] of components)
        {
            if (!entitySignature.has(type))
            {
                // The entity did not currently have a componenet of this type
                entitySignature.add(type);
                entityComponents.set(type, []);

                // Map the component type to the entity
                if (!ECS_entityComponentTypeMap.has(type))
                {
                    ECS_entityComponentTypeMap.set(type, new Set());
                }

                ECS_entityComponentTypeMap.get(type).add(entity);

                // If the component map does have an entry of this type, create an empty set
                if (!ECS_componentsMap.has(type))
                {
                    ECS_componentsMap.set(type, new Set());
                }
            }

            // Create the compnent and add it to the entity and component map
            componentArray = entityComponents.get(type);
            component = new ECS_Component(entity, componentArray.length, type, data)
            componentArray.push(component);
            ECS_componentsMap.get(type).add(component);
        }

        ECS_entities.add(entity);
        ECS_EntityCreatedEvent.trigger(entity);

        return entity;
    };
};

class ECS_EntityCompositionChanger
{
    /**
     * Create a composition change blueprint for an entity
     * @param {ECS_Entity} targetEntity 
     */
    constructor(targetEntity)
    {
        ECS_privateProperties.set(this, { addedComponents: [], removedComponents: new Map() });
        Object.defineProperty(this, "m_target", { value: targetEntity, writable: true });
    }

    /**
     * Set the target of the composition change
     * @param {ECS_Entity} entity 
     */
    setTarget(entity)
    {
        this.m_target = entity;
        return this;
    }

    /**
     * Add a component to the composition change
     * @param {Number} type 
     * @param {Function} data 
     * @param {...params} params
     */
    addComponent(type, data, ...params)
    {
        ECS_privateProperties.get(this).addedComponents.push([type, data, params]);
        return this;
    }

    /**
     * 
     * @param {Number} type 
     * @param {Number?} index 
     */
    removeComponent(type, index = 0)
    {
        let removedComponents = ECS_privateProperties.get(this).removedComponents;
        let removeSet = removedComponents.get(type);

        if (removeSet === undefined)
        {
            removeSet = new Set();
            removedComponents.set(type, removeSet);
        }

        removeSet.add(index);

        return this;
    }

    /**
     * Submit the composition change to the target entity
     */
    submit(allowDuplicates = false)
    {
        let removedComponents = ECS_privateProperties.get(this).removedComponents;
        let addedComponents = ECS_privateProperties.get(this).addedComponents;
        let entityComponents = ECS_privateProperties.get(this.m_target).components;
        let entitySignature = ECS_privateProperties.get(this.m_target).signature;

        let componentArray, removeSet, index, component;

        ECS_CompositionChangeStarted.trigger(this.m_target);

        // Remove components from entity
        for (let [type, components] of entityComponents)
        {
            removeSet = removedComponents.get(type);

            if (removeSet === undefined)
            {
                continue;
            }

            index = -1;
            componentArray = [];

            for (component of components)
            {
                if (!removeSet.has(component.index))
                {
                    ECS_privateProperties.get(component).index = ++index;
                    componentArray.push(component);
                }
            }

            if (componentArray.length == 0)
            {
                entitySignature.delete(type);
                entityComponents.delete(type);
                continue;
            }

            entityComponents.set(type, componentArray);
        }

        // Add components to entity
        let add;

        for (let [type, data, params] of addedComponents)
        {
            add = allowDuplicates;

            if (!entitySignature.has(type))
            {
                add = true;

                // The entity did not currently have a componenet of this type
                entitySignature.add(type);
                entityComponents.set(type, []);

                // Map the component type to the entity
                if (!ECS_entityComponentTypeMap.has(type))
                {
                    ECS_entityComponentTypeMap.set(type, new Set());
                }

                ECS_entityComponentTypeMap.get(type).add(this.m_target);

                // If the component map does have an entry of this type, create an empty set
                if (!ECS_componentsMap.has(type))
                {
                    ECS_componentsMap.set(type, new Set());
                }
            }     
            
            // Create the compnent and add it to the entity and component map
            if (add)
            {
                componentArray = entityComponents.get(type);
                component = new ECS_Component(this.m_target, componentArray.length, type, data(...params));
                componentArray.push(component);
                ECS_componentsMap.get(type).add(component);
            }
        }

        ECS_CompositionChangeCompleted.trigger(this.m_target);
    }
};

class ECS_ComponentBlueprint
{
    /**
     * Component blueprint
     * @param {Number} type 
     * @param {Function} data 
     */
    constructor(type, data)
    {
        this.type = type;
        this.data = data;
        Object.freeze(this);
    }
};

class ECS_Entity
{
    /**
     * 
     * @param {*} tag
     * @param {ECS_Signature} signature 
     * @param {Map<*, ECS_Component[]>} components 
     */
    constructor(tag, signature, components)
    {
        Object.defineProperty(this, "m_tag", { value: tag });

        let privateProperties = { signature: signature, components: components };
        ECS_privateProperties.set(this, privateProperties);
    }

    /**
     * Tag attached to this entity
     */
    get tag() { return this.m_tag; }

    /**
     * Get the first component of type from the entity
     * @param {Number} type 
     * @returns {ECS_Component}
     */
    getComponent(type)
    {
        let components = ECS_privateProperties.get(this).components.get(type);
        return components === undefined ? undefined : components[0];
    }
    
    /**
     * Get all components of type from the entity.
     * @param {Number} type
     * @returns {ECS_Component[]}
     */
    getComponents(type)
    {
        let components = ECS_privateProperties.get(this).components.get(type);
        return components === undefined ? [] : [...components];
    }

    /**
     * Check if the entity has a component of type
     * @param {Number} type 
     * @returns {Boolean}
     */
    hasComponent(type)
    {
        let components = ECS_privateProperties.get(this).components.get(type);
        return (components !== undefined)
    }

    /**
     * Create a composition changer targeted towards this entity
     * @returns {ECS_EntityCompositionChanger}
     */
    createCompositionChanger()
    {
        return new ECS_EntityCompositionChanger(this);
    }

    /**
     * Checks if the given signature is a subset of the entity's signature
     * @param {ECS_Signature} signature 
     * @returns {Boolean}
     */
    containsSignature(signature)
    {
        return signature.isSubsetOf(ECS_privateProperties.get(this).signature);
    }
};

class ECS_Component
{
    /**
     * 
     * @param {ECS_Entity} owner
     * @param {Number} index 
     * @param {*} type 
     * @param {{}} data 
     */
    constructor(owner, index, type, data)
    {
        ECS_privateProperties.set(this, { index: index });

        Object.defineProperties(this,
        {
            "m_owner": { value: owner },
            "m_type": { value: type }
        });

        Object.assign(this, data);
    }
    
    /**@type {ECS_Entity} */
    get owner() { return this.m_owner; }
    /**@type {*} */
    get type() { return this.m_type; }
    /**@type {Number} */
    get index() { return ECS_privateProperties.get(this).index; }
};

class ECS_System
{
    /**
     * 
     * @param {ECS_Signature} signature 
     * @param {Function} onUpdate 
     */
    constructor(signature, onUpdate)
    {
        let privateProperties = { signature: signature, onUpdate: onUpdate, active: true };
        ECS_privateProperties.set(this, privateProperties);
        this.update = onUpdate;
    }

    get isActive() { return ECS_privateProperties.get(this).active; }

    /**
     * Sets the update function for the system
     * @param {Function} func
     */
    setUpdate(func)
    {
        ECS_privateProperties.get(this).onUpdate = func;

        if (ECS_privateProperties.get(this).active)
        {
            this.update = func;
        }
    }

    /**
     * Update the system
     * @param {...*} args
     */
    update(...args) {}

    /**
     * Checks if the system can operate on the entity
     * @param {ECS_Entity} entity
     */
    canOperateOnEntity(entity)
    {
        return ECS_privateProperties.get(this).signature.isSubsetOf(ECS_privateProperties.get(entity).signature);
    }

    /**
     * Activates the system. Activated systems can be updated.
     */
    activate()
    {
        let privateProperties = ECS_privateProperties.get(this);
        privateProperties.active = true;
        this.update = privateProperties.onUpdate;
    }

    /**
     * Deactivates the system. Deactivated systems can NOT be updated.
     */
    deactivate()
    {
        ECS_privateProperties.get(this).active = false;
        this.update = ECS_emptyFunction;
    }
};

class ECS_Signature
{
    /**
     * Create a component type signature
     * @param {Number[]?} types
     */
    constructor(types = [])
    {
        ECS_privateProperties.set(this, { masks: [] });
        
        for (let type of types)
        {
            this.add(type);
        }
    }

    /**
     * Add a component type to the signature
     * @param {Number} type 
     */
    add(type)
    {
        let masks = ECS_privateProperties.get(this).masks;
        let index = type >> 5;
        let flag = 1 << (type & 31);

        while (masks.length <= index)
        {
            masks.push(0);
        }
        
        masks[index] |= flag;
    }

    /**
     * Check if this signature contains the component type
     * @param {Number} type 
     */
    has(type)
    {
        let index = type >> 5;
        let flag = 1 << (type & 31);
        let mask = ECS_privateProperties.get(this).masks[index];

        return (mask !== undefined && (mask & flag) != 0);
    }

    /**
     * Delete the component type from the signature
     * @param {Number} type 
     */
    delete(type)
    {
        let masks = ECS_privateProperties.get(this).masks;
        let index = type >> 5;
        let flag = 1 << (type & 31);

        if (masks.length > index)
        {
            masks[index] &= ~flag;

            if (masks.length - 1 == index && masks[index] == 0)
            {
                --masks.length;
            }
        }
    }

    /**
     * Checks if this signature is a subset of the given signature
     * @param {ECS_Signature} signature 
     */
    isSubsetOf(signature)
    {
        let masks = ECS_privateProperties.get(this).masks;
        let otherMasks = ECS_privateProperties.get(signature).masks;
        let n = masks.length;

        if (n > otherMasks.length)
        {
            return false;
        }

        let mask;

        for (let i = 0; i < n; ++i)
        {
            mask = masks[i];

            if ((mask & otherMasks[i]) != mask)
            {
                return false;
            }
        }

        return true;
    }
};

const ECS_emptyFunction = function() {};    // can be used to replace a function temporarily (ie, when system is deactivated)

/**@type {Set<ECS_Entity>} */
let ECS_entities = new Set();

/**@type {Map<Number, Set<ECS_Entity>} */
let ECS_entityComponentTypeMap = new Map();

/**@type {Map<Number, Set<ECS_Component>} */
let ECS_componentsMap = new Map();

/**@type {Set<ECS_System>} */
let ECS_systems = new Set();

/**@type {WeakMap<this, {}>} */
let ECS_privateProperties = new WeakMap();

/**@type {ECS_Event} */
let ECS_EntityCreatedEvent = new ECS_Event();

/**@type {ECS_Event} */
let ECS_EntityDestroyedEvent = new ECS_Event();

/**@type {ECS_Event} */
let ECS_CompositionChangeStarted = new ECS_Event();

/**@type {ECS_Event} */
let ECS_CompositionChangeCompleted = new ECS_Event();

let ECS =
{
    Event: ECS_Event,

    Signature: ECS_Signature,

    Entity:
    {
        /**
         * Creates a blank entity blueprint.
         * @returns {ECS_EntityBlueprint}
         */
        createBlueprint: function()
        {
            return new ECS_EntityBlueprint();
        },

        /**
         * Create a composition changer targeted towards an entity
         * @param {ECS_Entity} targetEntity
         * @returns {ECS_EntityCompositionChanger}
         */
        createCompositionChanger: function(targetEntity = undefined)
        {
            return new ECS_EntityCompositionChanger(targetEntity);
        },

        /**
         * Checks if an entity exists.
         * @param {ECS_Entity} entity
         * @returns {Boolean}
         */
        exists: function(entity)
        {
            return ECS_entities.has(entity);
        },

        /**
         * Destroy entity and all of its components.
         * Does nothing if entity does not exist.
         * @param {ECS_Entity} entity
         */
        destroy: function(entity)
        {
            if (this.exists(entity))
            {
                ECS_EntityDestroyedEvent.trigger(entity);

                let componentsMap = ECS_privateProperties.get(entity).components;
                
                // Remove data from maps
                for (let [type, components] of componentsMap)
                {
                    // Remove entity id from map
                    ECS_entityComponentTypeMap.get(type).delete(entity);

                    // Remove entity's components from map
                    for (let c of components)
                    {
                        ECS_componentsMap.get(type).delete(c);
                    }
                }
    
                ECS_entities.delete(entity);
            }
        },

        /**
         * Get all entity that contain a component of type.
         * @param {Number} type
         * @returns {ECS_Entity[]}
         */
        getAllWithComponentType: function(type)
        {
            let entities = ECS_entityComponentTypeMap.get(type);
            return entities === undefined ? [] : [...entities];
        },

        /**
         * Runs the given function once for each entity and passing the entity as an argument
         * @param {Function} func
         */
        forAll: function(func)
        {
            for (let entity of ECS_entities)
            {
                func(entity);
            }
        }
    },

    Component:
    {

        /**
         * Create a component blueprint
         * @param {Number} type 
         * @param {Function} data 
         */
        createBlueprint: function(type, data)
        {
            return new ECS_ComponentBlueprint(type, data);
        },

        /**
         * Get all components of type.
         * @param {Number} type
         * @returns {ECS_Component[]}
         */
        getComponents: function(type)
        {
            let components = ECS_componentsMap.get(type);
            return components === undefined ? [] : [...components];
        }
    },

    System:
    {
        /**
         * Creates a new system with the given properites.
         * @param {...Number} signature
         * @returns {ECS_System}
         */
        create: function(...signature)
        {
            let system = new ECS_System(new ECS_Signature(signature), ECS_emptyFunction);

            ECS_systems.add(system);

            return system;
        },

        // TODO: Maybe add a system destroy function

        /**
         * Updates all given active systems with provided arguments.
         * @param {...ECS_System} systems
         */
        update: function(arg, ...systems)
        {
            for (let system of systems)
            {
                system.update(arg);
            }
        },

        /**
         * Update all active systems.
         */
        updateAll: function(arg)
        {
            for (let system of ECS_systems)
            {
                system.update(arg);
            }
        },

        StandardMethods:
        {
            /**
             * Builds the standard init function for the the system and returns it.
             * Defines a Set "nodes" and a Map "nodeMap".
             * @param {ECS_System} system
             * @returns {Function}
             */
            init: (system) => function()
            {
                system.nodes = new Set();
                system.nodeMap = new WeakMap();
            },

            /**
             * Builds the standard entity addition function for the system and returns it.
             * @param {ECS_System} system
             * @param {Map<String, Number>} propertyComponentTypeMap
             * @returns {Function}
             */
            onEntityCreated: (system, propertyComponentTypeMap) => function(entity)
            {
                if (system.canOperateOnEntity(entity))
                {
                    let node = {};

                    for (let [p, c] of propertyComponentTypeMap)
                    {
                        node[p] = entity.getComponent(c);
                    }
    
                    system.nodes.add(node);
                    system.nodeMap.set(entity, node);
                }
            },

            /**
             * Builds the standard entity removel for the system and returns it.
             * @param {ECS_System} system
             * @returns {Function}
             */
            onEntityDestroyed: (system) => function(entity)
            {
                let node = system.nodeMap.get(entity);

                if (node !== undefined)
                {
                    system.nodes.delete(node);
                    system.nodeMap.delete(entity);
                }
            }
        }
    },

    EntityCreated:
    {
        /**
         * Add a new listener to the event
         * @param {Function} listener
         */
        addListener: (listener) => ECS_EntityCreatedEvent.addListener(listener),

        /**
         * Remove the listener from the even
         * @param {Function} listener
         */
        removeListener: (listener) => ECS_EntityCreatedEvent.removeListener(listener)
    },

    EntityDestroyed:
    {
        /**
         * Add a new listener to the event
         * @param {Function} listener
         */
        addListener: (listener) => ECS_EntityDestroyedEvent.addListener(listener),

        /**
         * Remove the listener from the even
         * @param {Function} listener
         */
        removeListener: (listener) => ECS_EntityDestroyedEvent.removeListener(listener)
    },

    CompositionChangeStarted:
    {
        /**
         * Add a new listener to the event
         * @param {Function} listener
         */
        addListener: (listener) => ECS_CompositionChangeStarted.addListener(listener),

        /**
         * Remove the listener from the even
         * @param {Function} listener
         */
        removeListener: (listener) => ECS_CompositionChangeStarted.removeListener(listener)
    },
    
    CompositionChangeCompleted:
    {
        /**
         * Add a new listener to the event
         * @param {Function} listener
         */
        addListener: (listener) => ECS_CompositionChangeCompleted.addListener(listener),

        /**
         * Remove the listener from the even
         * @param {Function} listener
         */
        removeListener: (listener) => ECS_CompositionChangeCompleted.removeListener(listener)
    }
};

return Object.freeze(ECS);

})();

// export default ECS;