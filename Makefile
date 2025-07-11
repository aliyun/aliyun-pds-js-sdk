
i:
	npm i --registry=https://registry.npmmirror.com

build:b f
b:
	PKG_NAME=aliyun-pds-js-sdk npm run build
doc:
	npm run doc:node
doc2:
	npm run doc:web
test:
	npm run test:node
test2:
	npm run test:browser
cov:
	npm run cov:node
cov2:
	npm run cov:browser
f:format
format:
	npm run format
clean:
	rm -rf node_modules package-lock.json pnpm-lock.yaml dist doc coverage/node coverage/browser tests/ut/tmp/*
token:
	npm run token

publish:build
	npm publish
pub:build
	npm publish --tag=beta

build2:
	PKG_NAME=@ali/pds-js-sdk npm run build
pub2:
	PKG_NAME=@ali/pds-js-sdk npm run build
	tnpm publish --tag=beta


# 命令和目录名称冲突
.PHONY:doc lib dist tests
