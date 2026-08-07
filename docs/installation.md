# Installation of Pinion

Pinion is a Python program. You can simply install it via pip:

```
pip3 install pinion
```

To run Pinion, install KiCad 9 or 10 with `kicad-cli` available on your
`PATH`. You can alternatively set the
`KICAD_CLI` environment variable to the executable path.

Pinion uses PcbDraw's `kicad-cli` annotation API to inspect components, pads,
nets, tracks, and copper zones. It does not require KiCad's `pcbnew` Python
module or KiCad's bundled Python environment.

Once you have Pinion installed, you can verify it by running:

```
pinion --help
```

If everything is working, proceed to [making your first
diagram](diagramWalkthrough.md).

## Installing the nightly version of Pinion

If you are interested in getting the latest features, you can install the
nightly version of Pinon. This version is built automatically from the master
branch and comes with newest features, however, it is not guaranteed to be
stable.

First, download the [Python package](https://nightly.link/yaqwsx/Pinion/workflows/build/main/pinion-package.zip). Then
install it via pip:

```
pip3 install pinion-latest.whl
```
