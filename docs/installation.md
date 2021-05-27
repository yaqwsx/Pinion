# Installation of Pinion

Pinion is a Python program. You can simply install it via pip:

```
pip3 install pinion
```

To run pinion, you will also need KiCAD installed on your computer. Note that
until KiCAD 6 is officially released, Pinion will **not** work on Windows or Mac.
Please use either a [Windows subsystem for
Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10) or suitable
Docker image for running pinion.

Once you have Pinion installed, you can verify it by running:

```
pinion --help
```

If everything is working, proceed to [making your first
diagram](diagramWalkthrough.md).
