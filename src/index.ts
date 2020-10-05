type Record<K extends keyof any, T> = {
  [P in K]: T;
};

const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object'
const convert = <T extends unknown>(target: T) => isObject(target) ? reactive(target) : target
const hasOwnProperty = Object.prototype.hasOwnProperty
const hasOwn = (target: any, key: string | symbol) => hasOwnProperty.call(target, key)

// 将值转换为响应式对象
export function reactive<T extends object> (target: T) {
  if (!isObject(target)) return target

  const handler: ProxyHandler<any> = {
    get (target: any, key: string | symbol, receiver: any) {
      // 收集依赖
      track(target, key)
      const result = Reflect.get(target, key, receiver)
      return convert(result)
    },
    set (target: any, key: string | symbol, value: any, receiver: any) {
      const oldValue = Reflect.get(target, key, receiver)
      let result = true
      if (oldValue !== value) {
        result = Reflect.set(target, key, value)
        // 触发更新
        trigger(target, key)
      }
      return result
    },
    deleteProperty (target: any, key: string | symbol) {
      const hasKey = hasOwn(target, key)
      const result = Reflect.deleteProperty(target, key)
      if (hasKey && result) {
        // 触发更新
        trigger(target, key)
      }
      return result
    }
  }

  return new Proxy<T>(target, handler)
}


let activeEffect: Function | null // 当前依赖
export function effect (callback: Function) {
  activeEffect = callback
  callback() // 访问响应式对象的属性时触发收集依赖
  activeEffect = null
}

type Dep = Set<Function>
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

// 收集依赖
export function track (target: any, key: string | symbol) {
  if (activeEffect == null) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  dep.add(activeEffect)
}

// 触发更新
export function trigger (target: any, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effect => effect())
  }
}

export interface Ref<T = any> {
  __v_isRef: boolean,
  value: T
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return Boolean(r && r.__v_isRef === true)
}

export function ref<T>(value: T): Ref<T>
export function ref<T = any>(): Ref<T | undefined>
export function ref (raw?: unknown) {
  if (isRef(raw)) return raw
  let value = convert(raw)
  const r = {
    __v_isRef: true,
    get value () {
      track(r, 'value')
      return value
    },
    set value (newValue) {
      if (newValue !== value) {
        raw = newValue
        value = convert(raw)
        trigger(r, 'value')
      }
    }
  }
  return r
}

export function toRefs (proxy: any) {
  const ret: any = proxy instanceof Array ? new Array(proxy.length) : {}

  for (const key in proxy) {
    ret[key] = toProxyRef(proxy, key)
  }

  return ret
}

function toProxyRef (proxy: any, key: string | symbol) {
  const r = {
    __v_isRef: true,
    get value () {
      return proxy[key]
    },
    set value (newValue) {
      proxy[key] = newValue
    }
  }
  return r
}

export function computed (getter: Function) {
  const result = ref()
  effect(() => {
    result.value = getter()
  })
  return result
}
