#!/usr/bin/env sh

mkdir -p build/widget
cd pinion-widget
npm run build
cp build/*.js build/*.css ../build/widget
