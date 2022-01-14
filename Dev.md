# ALIYUN-PDS-JS-SDK 开发文档

## 运行测试 Case

### UT

```
make ut
```

### FT

先配置 conf.js
```
make lib  # 看 tests/ft/index.js 是否需要 make lib
make ft
```

### 覆盖率 (ut + ft)

```
make cov
```

### 前端测试

先配置 conf.js 中的 tokenInfo
```
make web
```


## API 文档

PDS API: https://help.aliyun.com/document_detail/180676.html

SDK： https://help.aliyun.com/document_detail/393346.html
