declare const window: any

// fix: wasm 在 node 环境执行 browser 代码
window.WASM_NO_NODE_JS = true

export {}
