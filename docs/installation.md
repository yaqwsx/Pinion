# Installation of Pinion

Pinion is a Python program. You can simply install it via pip:

```
pip3 install pinion
```

To run pinion, you will also need KiCAD 6 installed on your computer. On
Windows, you have to make sure that you run all Pinion commands inside **KiCAD
Command Prompt**, not in the regular command prompt. Also note that the 3D
rendered models currently work only on Linux. Optionally, you can use [Windows
subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
or suitable Docker image for running pinion.

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

First, download the [Python package](/releases/latest/pinion-latest.whl). Then
install it via pip:

```
pip3 install pinion-latest.whl
```
