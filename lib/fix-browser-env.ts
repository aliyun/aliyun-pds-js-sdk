declare const window: any

// fix: js-sha1 和 wasm 在 node 环境执行 browser 代码
window.JS_SHA1_NO_NODE_JS = true
// fix: js-sha256 和 wasm 在 node 环境执行 browser 代码
window.JS_SHA256_NO_NODE_JS = true

export {}
