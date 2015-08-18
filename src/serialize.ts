export interface Map<K, V> {
    clear(): void;
    delete(key : K): boolean;
    forEach(callbackfn : (value : V, index : K, map : Map<K, V>) => void, thisArg? : any): void;
    get(key : K): V;
    has(key : K): boolean;
    set(key : K, value? : V): Map<K, V>;
    size: number;
}

export interface MapConstructor {
    new (): Map<any, any>;
    new <K, V>(): Map<K, V>;
    prototype: Map<any, any>;
}

declare var Map : MapConstructor;

var TypeMap = new Map();

function getMetaData(array : Array<MetaData>, keyName : string) : MetaData {
    for (var i = 0; i < array.length; i++) {
        if (array[i].keyName === keyName) {
            return array[i];
        }
    }
    array.push(new MetaData(keyName));
    return array[array.length - 1];
}

function getTypeAndKeyName(keyNameOrType : string|Function, keyName : string) : {type: Function, key : string} {
    var type : Function = null;
    var key : string = null;
    if (typeof keyNameOrType === "string") {
        key = <string>keyNameOrType;

    } else if (typeof keyNameOrType === "function") {
        type = <Function>keyNameOrType;
        key = keyName;
    }
    return { key: key, type: type };
}

export function inheritSerialization(childType : Function) : any {
    return function(parentType : Function) {
        var parentMetaData : Array<MetaData> = TypeMap.get(parentType) || [];
        var childMetaData : Array<MetaData> = TypeMap.get(childType) || [];
        for(var i = 0; i < parentMetaData.length; i++) {
            var keyName = parentMetaData[i].keyName;
            if(!MetaData.hasKeyName(childMetaData, keyName)) {
                childMetaData.push(MetaData.clone(parentMetaData[i]));
            }
        }
        TypeMap.set(childType, childMetaData);
    }
}

export function serialize(target : any, keyName : string) : any {
    if (!target || !keyName) return;
    var metaDataList : Array<MetaData> = TypeMap.get(target.constructor) || [];
    var metadata = getMetaData(metaDataList, keyName);
    metadata.serializedKey = keyName;
    TypeMap.set(target.constructor, metaDataList);
}

export function deserialize(target : any, keyName : string) : any {
    if (!target || !keyName) return;
    var metaDataList : Array<MetaData> = TypeMap.get(target.constructor) || [];
    var metadata = getMetaData(metaDataList, keyName);
    metadata.deserializedKey = keyName;
    TypeMap.set(target.constructor, metaDataList);
}

export function autoserialize(target : any, keyName : string) : any {
    if (!target || !keyName) return;
    var metaDataList : Array<MetaData> = TypeMap.get(target.constructor) || [];
    var metadata = getMetaData(metaDataList, keyName);
    metadata.serializedKey = keyName;
    metadata.deserializedKey = keyName;
    TypeMap.set(target.constructor, metaDataList);
}

export function serializeAs(keyNameOrType : string|Function, keyName? : string) : any {
    if (!keyNameOrType) return;
    var { key, type } = getTypeAndKeyName(keyNameOrType, keyName);
    return function (target : any, actualKeyName : string) : any {
        if (!target || !actualKeyName) return;
        var metaDataList : Array<MetaData> = TypeMap.get(target.constructor) || [];
        var metadata = getMetaData(metaDataList, actualKeyName);
        metadata.serializedKey = (key) ? key : actualKeyName;
        metadata.serializedType = type;
        TypeMap.set(target.constructor, metaDataList);
    };
}

export function deserializeAs(keyNameOrType : string|Function, keyName? : string) : any {
    if (!keyNameOrType) return;
    var { key, type } = getTypeAndKeyName(keyNameOrType, keyName);
    return function (target : any, actualKeyName : string) : any {
        if (!target || !actualKeyName) return;
        var metaDataList : Array<MetaData> = TypeMap.get(target.constructor) || [];
        var metadata = getMetaData(metaDataList, actualKeyName);
        metadata.deserializedKey = (key) ? key : actualKeyName;
        metadata.deserializedType = type;
        TypeMap.set(target.constructor, metaDataList);
    };
}

export function autoserializeAs(keyNameOrType : string|Function, keyName? : string) : any {
    if (!keyNameOrType) return;
    var { key, type } = getTypeAndKeyName(keyNameOrType, keyName);
    return function (target : any, actualKeyName : string) : any {
        if (!target || !actualKeyName) return;
        var metaDataList : Array<MetaData> = TypeMap.get(target.constructor) || [];
        var metadata = getMetaData(metaDataList, actualKeyName);
        var serialKey = (key) ? key : actualKeyName;
        metadata.deserializedKey = serialKey;
        metadata.deserializedType = type;
        metadata.serializedKey = serialKey;
        metadata.serializedType = type;
        TypeMap.set(target.constructor, metaDataList);
    };
}

class MetaData {
    public keyName : string;
    public serializedKey : string;
    public deserializedKey : string;
    public serializedType : Function;
    public deserializedType : Function;
    public inheritedType : Function;

    constructor(keyName : string) {
        this.keyName = keyName;
        this.serializedKey = null;
        this.deserializedKey = null;
        this.deserializedType = null;
        this.serializedType = null;
        this.inheritedType = null;
    }

    public static hasKeyName(metadataArray : Array<MetaData>, key : string) : boolean {
        for(var i = 0; i < metadataArray.length; i++) {
            if(metadataArray[i].keyName === key) return true;
        }
        return false;
    }

    public static clone (data : MetaData) : MetaData {
        var metadata = new MetaData(data.keyName);
        metadata.deserializedKey = data.deserializedKey;
        metadata.serializedKey = data.serializedKey;
        metadata.serializedType = data.serializedType;
        metadata.deserializedType = data.deserializedType;
        return metadata;
    }
}

function deserializeArrayInto(source : Array<any>, type : Function, arrayInstance : any) : Array<any> {
    if(!Array.isArray(arrayInstance)) {
        arrayInstance = new Array<any>(source.length);
    }

    arrayInstance.length = source.length;

    for (var i = 0; i < source.length; i++) {
        arrayInstance[i] = DeserializeInto(source[i], type, arrayInstance[i] || new (<any>type)());
    }

    return arrayInstance;
}

function deserializeObjectInto(json : any, type : Function, instance : any) : any {
    var metadataArray : Array<MetaData> = TypeMap.get(type);

    if(!instance) {
        instance = new (<any> type)();
    }

    if (!metadataArray) {
        return instance;
    }

    for (var i = 0; i < metadataArray.length; i++) {
        var metadata = metadataArray[i];
        if (!metadata.deserializedKey) continue;

        var source = json[metadata.deserializedKey];

        if (source === void 0) continue;

        var keyName = metadata.keyName;

        if (Array.isArray(source)) {
            instance[keyName] = deserializeArrayInto(source, metadata.deserializedType, instance[keyName]);
        }
        else if (typeof source === "string" && metadata.deserializedType === Date) {
            var deserializedDate = new Date(source);
            if(instance[keyName] instanceof Date) {
                instance[keyName].setTime(deserializedDate.getTime());
            }
            else {
                instance[keyName] = deserializedDate;
            }
        }
        else if (typeof source === "string" && type === RegExp) {
            instance[keyName] = new RegExp(source);
        }
        else if (source && typeof source === "object") {
            instance[keyName] = deserializeObjectInto(source, metadata.deserializedType, instance[keyName]);
        }
        else {
            instance[keyName] = source;
        }
    }

    if (type && typeof (<any>type).OnDeserialized === "function") {
        (<any>type).OnDeserialized(instance, source);
    }

    return instance;
}

export function DeserializeInto(source : any, type : Function, target : any) : any {

    if (Array.isArray(source)) {
        return deserializeArrayInto(source, type, target || []);
    }
    else if(source && typeof source === "object") {
        return deserializeObjectInto(source, type, target || new (<any>type)());
    }
    else {
        return target || new (<any>type)();
    }
}

function deserializeArray(source : Array<any>, type : Function) : Array<any> {
    var retn : Array<any> = new Array(source.length);
    for (var i = 0; i < source.length; i++) {
        retn[i] = Deserialize(source[i], type);
    }
    return retn;
}

function deserializeObject(json : any, type : Function) : any {
    var metadataArray : Array<MetaData> = TypeMap.get(type);

    if (!metadataArray) {
        return new (<any>type)();
    }

    var instance = new (<any>type)();

    for (var i = 0; i < metadataArray.length; i++) {
        var metadata = metadataArray[i];
        if (!metadata.deserializedKey) continue;

        var source = json[metadata.deserializedKey];

        if (source === void 0) continue;

        if (Array.isArray(source)) {
            instance[metadata.keyName] = deserializeArray(source, metadata.deserializedType);
        }
        else if (typeof source === "string" && metadata.deserializedType === Date) {
            instance[metadata.keyName] = new Date(source);
        }
        else if (typeof json === "string" && type === RegExp) {
            instance[metadata.keyName] = new RegExp(json);
        }
        else if (source && typeof source === "object") {
            instance[metadata.keyName] = deserializeObject(source, metadata.deserializedType);
        }
        else {
            instance[metadata.keyName] = source;
        }
    }

    if (type && typeof (<any>type).OnDeserialized === "function") {
        (<any>type).OnDeserialized(instance, json);
    }

    return instance;
}

export function Deserialize(json : any, type? : Function) : any {

    if (Array.isArray(json)) {
        return deserializeArray(json, type);
    }
    else if (json && typeof json === "object") {
        return deserializeObject(json, type);
    }
    else if (typeof json === "string" && type === Date) {
        return new Date(json);
    }
    else if (typeof json === "string" && type === RegExp) {
        return new RegExp(json);
    }
    else {
        return json;
    }

}

function serializeArray(source : Array<any>, type : Function) : Array<any> {
    var serializedArray : Array<any> = new Array(source.length);
    for (var j = 0; j < source.length; j++) {
        serializedArray[j] = Serialize(source[j], type);
    }
    return serializedArray;
}

function serializeTypedObject(instance : any) : any {

    var json : any = {};

    var metadataArray : Array<MetaData> = TypeMap.get(instance.constructor);

    for (var i = 0; i < metadataArray.length; i++) {
        var metadata = metadataArray[i];

        if (!metadata.serializedKey) continue;

        var source = instance[metadata.keyName];

        if (source === void 0) continue;

        if (Array.isArray(source)) {

            json[metadata.serializedKey] = serializeArray(source, metadata.serializedType);

        } else {
            var value = Serialize(source, metadata.serializedType);
            if (value !== void 0) {
                json[metadata.serializedKey] = value;
            }
        }
    }

    if (typeof (<any>instance.constructor).OnSerialized === "function") {
        (<any>instance.constructor).OnSerialized(instance, json);
    }

    return json;
}

export function Serialize(instance : any, type? : any) : any {
    if (!instance) return null;

    if (Array.isArray(instance)) {
        return serializeArray(instance, type);
    }

    if (instance.constructor && TypeMap.has(instance.constructor)) {
        return serializeTypedObject(instance);
    }

    if (instance instanceof Date || instance instanceof RegExp) {
        return instance.toString();
    }

    if (instance && typeof instance === 'object' || typeof instance === 'function') {
        var keys = Object.keys(instance);
        var json : any = {};
        for (var i = 0; i < keys.length; i++) {
            json[keys[i]] = Serialize(instance[keys[i]]);
        }
        return json;
    }

    if (instance === void 0) {
        return null;
    }

    return instance;
}

export { TypeMap as __TypeMap }