#/usr/bin/sh

set -e

mkdir -p build
cd build

git clone https://github.com/yaqwsx/PcbDraw-Lib.git || \
    (cd PcbDraw-Lib; git pull)

cd ..

pinion generate plotted \
    -b docs/resources/ArduinoLearningKitStarter.kicad_pcb \
    -s docs/resources/alksSpec.yml \
    --remap docs/resources/alksRemap.json \
    --libs build/PcbDraw-Lib/KiCAD-base \
    docs/resources/alksDemo-plotted

pinion generate rendered \
    -b docs/resources/ArduinoLearningKitStarter.kicad_pcb \
    -s docs/resources/alksSpec.yml \
    --transparent \
    docs/resources/alksDemo-rendered

