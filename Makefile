
i:
	npm i --registry=https://registry.npmmirror.com

build:b f
b:
	PKG_NAME=aliyun-pds-js-sdk npm run build
doc:
	npm run doc:node
doc2:
	npm run doc:web

ut:ut_node
ut_node:
	npm run test:node:ut
ut2:ut_browser
ut_browser:
	npm run test:browser:ut

ft:ft_node
ft_node:
	npm run test:node:ft
ft2:ft_browser
ft_browser:
	npm run test:browser:ft


cov:cov_node
cov_node:
	npm run cov:node
cov2:cov_browser
cov_browser:
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

build2: b2 f
b2:
	PKG_NAME=@ali/pds-js-sdk npm run build
pub2: b2 f
	tnpm publish --tag=beta
publish2: b2 f
	tnpm publish

# 命令和目录名称冲突
.PHONY:doc lib dist tests
