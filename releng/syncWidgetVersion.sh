#!/usr/bin/env sh

# Change widget version to match python package version

VERSION=$(pinion --version | cut -d' ' -f3 | cut -d'+' -f1)
releng/updateKey.py pinion-widget/package.json version ${VERSION}
