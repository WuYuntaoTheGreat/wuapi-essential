import { forIn, notNU } from "./util"

/**
 * Parent of classes that have comment.
 */
export class $Commentable {
  /**
   * The comment
   */
  comment: string = ""

  /**
   * The configuration map of this field.
   */
  config: { [key: string]: string } | null = null
}

export enum $ReqMethod {
  // HTTP
  GET,
  HEAD,
  POST,
  PUT,
  DELETE,
  CONNECT,
  OPTIONS,
  TRACE,
  PATCH,

  // SOCKET or MQTT
  SOCKET,
  MQTT,
}

/**
 * A class to represent an element (entity or enumeration) path
 * inside a project.
 */
export class $ElementPath {
  /**
   * Constructor of ElementPath
   * @param module The module name
   * @param name The element name
   */
  constructor(
    public module: string | null,
    public name: string | null,
  ){}

  /**
   * Compare with another ElementPath object
   * @param another Another ElementPath object.
   * @returns true if the other is identitcal to this ElementPath, false otherwise.
   */
  equals(another: $ElementPath | null | undefined): boolean {
    if(!another) return false
    return another.module == this.module && another.name == this.name
  }

  /**
   * Returns the entity in the project, designated by the path.
   * @param project The project where to find the Entity.
   * @returns The entity found.
   */
  asEntityOf(project: $Project | null | undefined): $Entity | null {
    if(!project) return null
    if(this.module == null || this.name == null) return null
    return project.modules[this.module]?.entities[this.name] ?? null
  }

  /**
   * Returns the enumeration in the project, designated by the path.
   * @param project The project where to find the Entity.
   * @returns The enumeration found.
   */
  asEnumOf(project: $Project | null | undefined): $Enum | null {
    if(!project) return null
    if(this.module == null || this.name == null) return null
    return project.modules[this.module]?.enums[this.name] ?? null
  }

  /**
   * Create $ElementPath instance from json data.
   * @param data Json data
   * @returns The $ElementPath instance
   */
  static load(data: any): $ElementPath {
    return new $ElementPath(data.module ?? null, data.name ?? null)
  }
}

/**
 * Item of enumeration entity.
 */
export class $EnumItem extends $Commentable {
  /**
   * The real (json) name may differ from the display name.
   * For example, the json name may violet forbidden key rules.
   */
  realname: string | null = null

  /**
   * The constructor of enumeration item.
   * @param value The number id of the item.
   */
  constructor(
    public value    : number,
  ){
    super()
  }

  /**
   * Create $EnumItem instance from json data.
   * @param data Json data
   * @returns The $EnumItem instance
   */
  static load(data: any): $EnumItem | null {
    if(!notNU(data.value)) return null
    const item = new $EnumItem(data.value)
    item.comment    = data.comment ?? ""
    item.config     = data.config
    item.realname   = data.realname ?? null
    return item
  }
}

/**
 * Enumeration entity.
 */
export class $Enum extends $Commentable {
  /**
   * Map of string names to enum items.
   */
  enumMap: {[key: string]: $EnumItem} = {}

  /**
   * Get the first item.
   * @returns The first item (by number value) of this Enumeration
   */
  first(): $EnumItem | null {
    const k = this.firstName()
    return null == k ? null : this.enumMap[k]
  }

  /**
   * Get the name of the first item.
   * @returns The name of the first (by number value) item of this Enumeration.
   */
  firstName(): string | null {
    var i: number | null = null
    var k: string | null = null
    for(const key in this.enumMap){
      const item = this.enumMap[key]
      if(i == null || item.value < i){
        i = item.value
        k = key
      }
    }
    // return k == null ? null : this.enumMap[k]
    return k
  }

  /**
   * Flat an enumeration's items.
   * @returns List of name, item. Order is not defined.
   */
  flat(): {name: string, item: $EnumItem}[] {
    let result: {name: string, item: $EnumItem}[] = [] 
    forIn(this.enumMap, (item, name) => {
      result.push({
        name,
        item,
      })
    })
    return result
  }

  /**
   * Create $Enum instance from json data.
   * @param data Json data
   * @returns The $Enum instance
   */
  static load(data: any): $Enum | null {
    if(!notNU(data.enumMap)) return null
    const enu = new $Enum()
    enu.comment = data.comment ?? ""
    enu.config  = data.config

    for(let i in data.enumMap){
      const item = $EnumItem.load(data.enumMap[i])
      if(notNU(item)){
        enu.enumMap[i] = item!
      }
    }
    return enu
  }
}

/**
 * The entity field type.
 */
export class $FieldType {

  /**
   * Constructor of FieldType
   * @param type The name of this type
   */
  constructor(
    public type: string
  ) {}

  /**
   * Check if this type equals with another.
   * @param another Another type, or null
   * @returns true if this type is the same with another type
   */
  equals(another: $FieldType | null | undefined) : boolean {
    if(!another) return false
    if(another.type != this.type) return false
    switch(this.type ){
      case 'TObject': {
        const _self = (this as any) as $TObject
        const _other = another as $TObject
        return _self?.entity?.equals(_other?.entity) == true
      }
      case 'TEnum': {
        const _self = (this as any) as $TEnum
        const _other = another as $TEnum
        return _self?.enu?.equals(_other?.enu) == true
      }
      case 'TUnknown': {
        const _self = (this as any) as $TUnknown
        const _other = another as $TUnknown
        return _self?.unknown == _other?.unknown
      }
      case 'TList': {
        const _self = (this as any) as $TList
        const _other = another as $TList 
        return _self?.member?.equals(_other?.member)
      }
      default: {
        return true
      }
    }
  }

  /**
   * Check if this type equals with another. 
   * If the other field type is list, check it's member.
   * 
   * @param another Another type, or null
   * @returns true if this type is the same with another type
   */
  equalsEvenInList(another: $FieldType | null | undefined) : boolean {
    if(this.type == 'TList') throw "List field shall not use quealsInList!"
    if(!notNU(another)) return false
    if(another?.type == 'TList'){
      return this.equalsEvenInList((another as $TList).member)
    } else {
      return this.equals(another)
    }
  }

  /**
   * Create $FieldType instance from json data.
   * @param data Json data
   * @returns The $FieldType instance
   */
  static load(data: any): $FieldType | null {
    if(!notNU(data.type)) return null
    switch(data.type){
      case 'TInteger'  : return new $TInteger()
      case 'TLong'     : return new $TLong()
      case 'TDouble'   : return new $TDouble()
      case 'TID'       : return new $TID()
      case 'TURL'      : return new $TURL()
      case 'TDateTime' : return new $TDateTime()
      case 'TBoolean'  : return new $TBoolean()
      case 'TString'   : return new $TString()
      case 'TSSMap'    : return new $TSSMap()

      case 'TObject' : {
        if(!notNU(data.entity)) return null
        const path = $ElementPath.load(data.entity)
        if(!notNU(path)) return null
        return new $TObject(path)
      }

      case 'TEnum' : {
        if(!notNU(data.enu)) return null
        const path = $ElementPath.load(data.enu)
        if(!notNU(path)) return null
        return new $TEnum(path)
      }
      
      case 'TList' : {
        if(!notNU(data.member)) return null
        const member = $FieldType.load(data.member)
        if(!notNU(member)) return null
        return new $TList(member!)
      }

      case 'TUnknown' : {
        if(!notNU(data.unknown)) return null
        return new $TUnknown(data.unknown)
      }

      default: return null
    }
  }
}

export class $TObject    extends $FieldType{ constructor(public entity : $ElementPath ){ super('TObject'  ) } }
export class $TEnum      extends $FieldType{ constructor(public enu    : $ElementPath ){ super('TEnum'    ) } }
export class $TList      extends $FieldType{ constructor(public member : $FieldType   ){ super('TList'    ) } }
export class $TUnknown   extends $FieldType{ constructor(public unknown: string       ){ super('TUnknown' ) } }

export class $TInteger   extends $FieldType{ constructor(){ super('TInteger'  ) } }
export class $TLong      extends $FieldType{ constructor(){ super('TLong'     ) } }
export class $TDouble    extends $FieldType{ constructor(){ super('TDouble'   ) } }
export class $TID        extends $FieldType{ constructor(){ super('TID'       ) } }
export class $TURL       extends $FieldType{ constructor(){ super('TURL'      ) } }
export class $TDateTime  extends $FieldType{ constructor(){ super('TDateTime' ) } }
export class $TBoolean   extends $FieldType{ constructor(){ super('TBoolean'  ) } }
export class $TString    extends $FieldType{ constructor(){ super('TString'   ) } }
export class $TSSMap     extends $FieldType{ constructor(){ super('TSSMap'    ) } }

/**
 * The entity field.
 */
export class $Field extends $Commentable {
  /**
   * The real (json) name may differ from the display name.
   * For example, the json name may violet forbidden key rules.
   */
  realname: string | null = null

  /**
   * True if this field is optional
   */
  isOptional: boolean = false

  /**
   * True if this field would appear inside path.
   */
  isPathParameter: boolean = false

  /**
   * The optional fixed value of this field.
   */
  fixedValue: any | null = null

  /**
   * Constructor of Entity Field.
   * @param type The type of this field
   */
  constructor(
    public type: $FieldType,
  ){
    super()
  }

  /**
   * Create $Field instance from json data.
   * @param data Json data
   * @returns The $Field instance
   */
  static load(data: any): $Field | null {
    if(!notNU(data.type, data.isOptional, data.isPathParameter)) return null
    const filedType = $FieldType.load(data.type)
    if(!notNU(filedType)) return null
    const field = new $Field(filedType!)
    field.comment           = data.comment    ?? ""
    field.config            = data.config
    field.realname          = data.realname   ?? null
    field.isOptional        = data.isOptional
    field.isPathParameter   = data.isPathParameter
    field.fixedValue        = data.fixedValue
    field.config            = data.config
    return field
  }
}

/**
 * Type of entities.
 */
export enum $EntityType {
  OBJECT,
  REQUEST,
  RESPONSE,
}

/**
 * Entity
 */
export class $Entity extends $Commentable {
  /**
   * True if this entity is abstract (shall not instantiate)
   */
  isAbstract: boolean = false

  /**
   * The path of the parent entity, optional.
   */
  parent: $ElementPath | null = null

  /**
   * The path of corresponding response entity, if this entity is a request.
   */
  response: $ElementPath | null = null

  /**
   * The URL path, if this entity is a request.
   */
  path: string | null = null

  /**
   * The Request method, if this entity is a request.
   */
  method: $ReqMethod | null = null

  /**
   * List of fields defined inside current entity.
   * (no field from parent)
   */
  fieldsLocal: {[key: string]: $Field} = {}

  /**
   * List of generic parameters defined inside current entity.
   * (no generic from parent)
   */
  getGenericLocal(): string[] {
    let result: string[] = []
    for(let k in this.fieldsLocal){
      const field = this.fieldsLocal[k]
      if(field.type.type == 'TUnknown'){
        result.push((field.type as $TUnknown).unknown)
      }
    }
    return result
  }

  /**
   * The map of definitions of generic parameters, till this entity.
   */
  genericMap: {[key: string]: $Field} = {}

  /**
   * Return a list of names of generics that are unsolved until this entity.
   * @param project The project, from where to get generic unsolved.
   * @returns A list of names of unsolved generics.
   */
  getGenericUnsolved(project: $Project | null | undefined): string[] {
    if(!project) return []
    let pg = this.parent?.asEntityOf(project)?.getGenericUnsolved(project) ?? []
    pg = pg.concat(this.getGenericLocal())
    return pg.filter((o) => !this.genericMap[o])
  }

  /**
   * Traverse from the eldest ancestor all down to this entity.
   * @param project The project from where to traverse.
   * @param block The callback function
   */
  fromAncestorToMe(project: $Project, block: (entity: $Entity)=>void) {
    this.parent?.asEntityOf(project)?.fromAncestorToMe(project, block)
    block(this)
  }

  /**
   * Constructor of Entity class.
   * @param type The type of this entity
   */
  constructor(
    public type: $EntityType = $EntityType.OBJECT,
  ){
    super()
  }

  /**
   * Create $Entity instance from json data.
   * @param data Json data
   * @returns The $Entity instance
   */
  static load(data: any): $Entity | null {
    if(!notNU(data.type, data.isAbstract, 
      data.fieldsLocal, data.genericMap)) return null
    const entity = new $Entity(data.type) // enum as number
    entity.comment      = data.comment    ?? ""
    entity.config       = data.config
    entity.isAbstract   = data.isAbstract!
    entity.path         = data.path       ?? null
    entity.method       = data.method     ?? null // enum as number

    if(notNU(data.parent)){
      entity.parent = $ElementPath.load(data.parent)
    }

    if(notNU(data.response)){
      entity.response = $ElementPath.load(data.response)
    }

    for(let i in data.fieldsLocal){
      const field = $Field.load(data.fieldsLocal[i])
      if(notNU(field)){
        entity.fieldsLocal[i] = field!
      }
    }

    for(let i in data.genericMap){
      const field = $Field.load(data.genericMap[i])
      if(notNU(field)){
        entity.genericMap[i] = field!
      }
    }

    return entity
  }
}

/**
 * The module object
 */
export class $Module {
  /**
   * The map of entities inside this module.
   */
  entities: {[key: string]: $Entity} = {}

  /**
   * The map of enumerations inside this module.
   */
  enums: {[key: string]: $Enum} = {}

  /**
   * Create $Module instance from json data.
   * @param data Json data
   * @returns The $Module instance
   */
  static load(data: any): $Module | null {
    if(!notNU(data.entities, data.enums)) return null
    const module = new $Module()
    for(let i in data.entities){
      const entity = $Entity.load(data.entities[i])
      if(notNU(entity)){
        module.entities[i] = entity!
      }
    }
    for(let i in data.enums){
      const enu = $Enum.load(data.enums[i])
      if(notNU(enu)){
        module.enums[i] = enu!
      }
    }
    return module
  }
}

/**
 * The project object
 */
export class $Project {

  /**
   * The map of modules.
   */
  modules: {[key: string]: $Module} = {}

  /**
   * The constructor of entity project.
   * @param name The name of the project
   * @param version The version of the project
   * @param targetPackage The package (for Java & Kotlin) into which the entities 
   * will be generated
   */
  constructor(
    public name         : string,
    public version      : string,
    public targetPackage: string,
  ){}

  /**
   * Flat the project into list of entities.
   * @returns list of path, entity. Order is not defined!
   */
  flatEntities(): {path: $ElementPath, entity: $Entity}[] {
    let result: {path: $ElementPath, entity: $Entity}[] = []
    forIn(this.modules, (moduleInstance, module) => {
      forIn(moduleInstance.entities, (entityInstance, name) => {
        result.push({
          path: new $ElementPath(module, name),
          entity: entityInstance
        })
      })
    })
    return result
  }

  /**
   * Flat the project into list of enumerations.
   * @returns list of path, enumerations. Order is not defined!
   */
  flatEnums(): {path: $ElementPath, enu: $Enum}[] {
    let result: {path: $ElementPath, enu: $Enum}[] = []
    forIn(this.modules, (moduleInstance, module) => {
      forIn(moduleInstance.enums, (enumInstance, name) => {
        result.push({
          path: new $ElementPath(module, name),
          enu: enumInstance
        })
      })
    })
    return result
  }

  /**
   * Create $Project instance from json data.
   * @param data Json object
   * @returns Generated $Project instance.
   */
  static load(data: any): $Project | null {
    if(!notNU(data.name, data.version, data.targetPackage, data.modules)) return null
    const project = new $Project(data.name, data.version, data.targetPackage)
    for(let i in data.modules){
      const module = $Module.load(data.modules[i])
      if(notNU(module)){
        project.modules[i] = module!
      }
    }
    return project
  }
}

