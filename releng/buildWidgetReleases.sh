#!/usr/bin/env sh

# TBA build all package versions here

releng/buildWidget.sh
mkdir -p docs/releases/latest

cp build/widget/* docs/releases/latest/
