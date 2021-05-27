#!/usr/bin/env sh

set -e

releng/buildWidget.sh
cp build/widget/pinion.js pinion/resources/
cp build/widget/pinion.css pinion/resources/
