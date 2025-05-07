@echo off
echo Cleaning up project dependencies...

echo Removing node_modules folder...
rmdir /s /q node_modules

echo Removing package-lock.json...
del package-lock.json

echo Reinstalling dependencies...
npm install

echo Done!
pause