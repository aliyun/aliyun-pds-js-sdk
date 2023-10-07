ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ 

i:
	ELECTRON_MIRROR=$(ELECTRON_MIRROR) ELECTRON_BUILDER_BINARIES_MIRROR=$(ELECTRON_BUILDER_BINARIES_MIRROR) npm i  --registry=https://registry.npmmirror.com
run:
	DEBUG=PDS* npm start
	
clean:
	rm -rf node_modules package-lock.json