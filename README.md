# README
Basic dependency injection

## tsconfig
Make sure to set *experimentalDecorators* and *emitDecoratorMetadata* to **true** in *tsconfig.json*
```json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,       
    }
}
```
## Usage
### Settings
```typescript
DISettings.set({ 
    //If set to true, it will throw an error if circular dependencies happen.
    //if set to false, circular dependencies converts to undefined.
    //default: true 
    throwCircular: true
})
```

### Setup Module
Use the *@Module* decorator, and add the classes you need in the *dependencies* list.
```typescript
@Module({
    dependencies: [
        Users
    ]
})
class Login {
    constructor(private users: Users) { }
}
```
Make sure to mark injectable classes with *Injectable*
```typescript
@Injectable()
class Users { }
```

You build a module using *buildModule*
```typescript
const login = buildModule(Login)
```

### Injecting Modules
Modules are also injectable, so one module can have another as a dependency.
```typescript
@Module({
    dependencies: [
        Login
    ]
})
class Session {
    constructor(private login: Login) { }
}
```
Different modules have their own instances of injected dependancies, even if one is injected in another.

### Global dependencies
You can mark any class or module as global with the *global* option.

Global dependencies has the same instance throughout all modules, and does not need to part of a module's dependency list to be injected.
```typescript
@Module({
    dependencies: [
        Login
    ],
    global: true
})
class Session {
    constructor(
        private login: Login,
        private languages: Languages
    ) { }
}

@Injectable({ global: true })
class Languages { }
```