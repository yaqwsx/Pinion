#/usr/bin/sh

set -e

mkdir -p build
cd build
git clone https://github.com/RoboticsBrno/ArduinoLearningKitStarter.git || \
    (cd ArduinoLearningKitStarter; git pull)

git clone https://github.com/yaqwsx/PcbDraw-Lib.git || \
    (cd PcbDraw-Lib; git pull)


cd ..
pinion generate \
    -b build/ArduinoLearningKitStarter/ArduinoLearningKitStarter.kicad_pcb \
    -s docs/resources/alksSpec.yml \
    --remap docs/resources/alksRemap.json \
    --libs build/PcbDraw-Lib/KiCAD-base \
    docs/resources/alksDemo