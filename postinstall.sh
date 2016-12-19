mkdir src/framer
cd ./node_modules/framerjs
npm install --only=dev
make
cp -a ./build/. ../../src/framer/
cd ../..
