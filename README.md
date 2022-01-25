# ALIYUN-PDS-JS-SDK

> PDS SDK for both Node.js and Javascript in browser.


详细帮助文档: https://help.aliyun.com/document_detail/393346.html

## Usage

```
npm i -S aliyun-pds-js-sdk
```

### In Node.js

```js
const {PDSClient} = require('aliyun-pds-js-sdk')
```

### In Browser

```html
<script src="/path/to/dist/aliyun-pds-js-sdk.min.js"></script>
```
```js
const {PDSClient} = window.PDS_SDK
```

### ES Import

```js
import {PDSClient} from 'aliyun-pds-js-sdk'
```

## Example

`PDS` API 的功能都集成在 `PDSClient` 类实例方法上，使用时只需 `new` 一个 `PDSClient` 实例，即可通过该实例的方法来调用 `PDS` 的各种 API。

```js
const client = new PDSClient({
  token_info,
  api_endpoint: `https://${domain_id}.api.aliyunpds.com`,
  auth_endpoint: `https://${domain_id}.auth.aliyunpds.com`,
  // path_type: 'StandardMode'
})

const {items = [], next_marker} = await client.listFiles({
  drive_id: '1',
  parent_file_id: 'root'
})
```

更加详细的介绍，请看[帮助文档](https://help.aliyun.com/document_detail/393346.html)。

## Release notes

[RELEASE-NOTES.md](RELEASE-NOTES.md)

## LICENSE

[The MIT License](LICENSE)

