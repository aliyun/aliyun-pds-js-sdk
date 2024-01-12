
i:
	npm i --registry=https://registry.npmmirror.com

build:b f
b:
	npm run build
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
	rm -rf node_modules package-lock.json dist coverage tests/ut/tmp/*
token:
	npm run token

publish:build format
	npm publish
pub:build
	npm publish --tag=beta

# 命令和目录名称冲突
.PHONY:lib dist tests
