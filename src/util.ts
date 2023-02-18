
/**
 * Check if objects are null or undefined
 * @param args Objects to check
 * @returns true if ALL objects are neither null, nor undefined.
 */
export function notNU(...args: (any | null | undefined)[]): boolean {
  for(let i in args){
    if(args[i] == null || args[i] == undefined) return false
  }
  return true
}

/**
 * Convenient function to go through objects.
 * @param o The object
 * @param cb The callback function
 */
export function forIn<T>(o: {[key: string]: T}, cb: (value: T, key: string) => void){
  for(let key in o){
    cb(o[key], key)
  }
}