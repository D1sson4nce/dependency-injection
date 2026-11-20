import "reflect-metadata"

const MODULE_KEY = Symbol("module")
const INJECTABLE_KEY = Symbol("injectable")

export interface Type<T> extends Function {
    new (...args: any[]): T
}

export interface InjectableConfig {
    global?: boolean
}

export interface ModuleConfig extends InjectableConfig {
    injects?: Type<any>[]
}

export function Injectable(config?: InjectableConfig) {
    config ??= {}
    return <T extends Type<any>>(constructor: T) => {
        Reflect.defineMetadata(INJECTABLE_KEY, config, constructor)
    }
}

export function Module(config?: ModuleConfig) {
    config ??= {}
    config.injects ??= []
    return <T extends Type<any>>(constructor: T) => {
        Reflect.defineMetadata(MODULE_KEY, config, constructor)
    }
}

interface Scope {
    injected: Map<Type<any>, unknown>
    inScope: (type: Type<any>) => boolean
}

const globalScope: Scope = {
    injected: new Map(),
    inScope: isGlobal
}

function isGlobal(type: Type<any>) {
    const config = Reflect.getOwnMetadata(MODULE_KEY, type) ?? Reflect.getOwnMetadata(INJECTABLE_KEY, type)
    return config?.global === true
}

function getArguements(type: Type<any>): Type<any>[] {
    return Reflect.getMetadata("design:paramtypes", type) ?? []
}

function stringifyChain(...chain: Type<any>[] | [Type<any>[]]) {
    return chain.flat().map(c => c.name).join(" -> ")
}

function resolveInjection<T>(type: Type<T>, scope: Scope, chain: Type<any>[]): T | undefined {
    if (!type) throw new Error(`Circular dependency: ${stringifyChain(...chain)} -> ?`)

    const exist = <T>scope.injected.get(type)
    if(exist) return exist
    
    if(chain.includes(type)) {
        throw new Error(`Circular dependency: ${stringifyChain(...chain, type)}`)
    }

    if(scope !== globalScope && isGlobal(type)) {
        const instance = resolveInjection(type, globalScope, chain)
        return instance
    }

    if(!scope.inScope(type)) return undefined 

    const module = Reflect.getOwnMetadata(MODULE_KEY, type)
    if(module) {
        const instance = resolveModule(type, chain)
        scope.injected.set(type, instance)
        return instance
    }
    
    const arguements = getArguements(type).map(a => {
        if(!a) throw new Error(`Circular dependency: ${stringifyChain(...chain, type)} -> ? (${type.name} contain circular dependencies)`) // hate this chud error
        return resolveInjection(a, scope, [...chain, type])
    })

    const instance = new type(...arguements)
    scope.injected.set(type, instance)
    return instance
}

function resolveModule<T>(module: Type<T>, chain: Type<any>[] = []) {
    const config: ModuleConfig = Reflect.getOwnMetadata(MODULE_KEY, module)
    if(!config) throw new Error(`${module.name} is not a @Module`)

    const scope: Scope = {
        injected: new Map(),
        inScope: type => config.injects!.includes(type)
    }
    
    const arguements = getArguements(module).map(a => resolveInjection(a, scope, [...chain, module]))
    return new module(...arguements)
}

export function buildModule<T>(module: Type<T>) {
    return resolveModule(module)
}