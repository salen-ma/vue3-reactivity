const isObject = (val: any) => val !== null && typeof val === 'object'
const convert = (target: any) => isObject(target) ? reactive(target) : target
const hasOwnProperty = Object.prototype.hasOwnProperty
const hasOwn = (target: any, key: string | symbol) => hasOwnProperty.call(target, key)

// 将值转换为响应式对象
export function reactive (target: any) {
  if (!isObject(target)) return target

  const handler: ProxyHandler<any> = {
    get (target: any, key: string | symbol, receiver: any) {
      // 收集依赖
      console.log('get', key)
      const result = Reflect.get(target, key, receiver)
      return convert(result)
    },
    set (target: any, key: string | symbol, value: any, receiver: any) {
      const oldValue = Reflect.get(target, key, receiver)
      let result = true
      if (oldValue !== value) {
        result = Reflect.set(target, key, value)
        // 触发更新
        console.log('set', key, value)
      }
      return result
    },
    deleteProperty (target: any, key: string | symbol) {
      const hasKey = hasOwn(target, key)
      const result = Reflect.deleteProperty(target, key)
      if (hasKey && result) {
        // 触发更新
        console.log('delete', key)
      }
      return result
    }
  }

  return new Proxy(target, handler)
}
