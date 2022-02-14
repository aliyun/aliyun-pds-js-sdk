i:
	npm i

build:lib dist
dist:
	rm -rf dist
	npm run build:dist

lib:
	rm -rf lib
	npm run build:lib
ut:
	npm run test:ut
ft:
	npm run test:ft
js:
	npm run test:js
web:
	npm run test:web
cov:
	npm run cov
	open coverage/lcov-report/index.html
format:
	npm run format
clean:
	rm -rf dist lib coverage .nvc_output tests/ft/tmp/tmp-* tests/ut/tmp/tmp-* package-lock.json  node_modules
	cd examples/vue/ && rm -rf package-lock.json node_modules public/*-token.json
	cd examples/electron/ && rm -rf package-lock.json node_modules bin/tmp-* bin/*-token.json
	echo 'done'
# 命令和目录名称冲突
.PHONY:lib dist tests build
