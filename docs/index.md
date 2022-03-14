# Pinion — Nice-looking interactive diagrams for KiCAD PCBs

Pinion is a simple tool that allows you to make a nice-looking pinout diagrams
for your PCBs like this (see also [a standalone version](alksStandalone.html)).
For the sake of clarity what is documentation and what is the diagram, we put it
inside a frame — in production, you can seamlessly include it in your page.

<div style="width: 100%; border: solid 2px #2563EB; border-radius: 10px;" id="pinionDemo-plot"></div>
<script src="releases/latest/pinion.js"></script>
<link rel="stylesheet" href="releases/latest/pinion.css">
<script>
    pinion.setup(document.getElementById("pinionDemo-plot"), {
        source: "resources/alksDemo-plotted"
    });
</script>

The diagrams are static HTML & Javascript files that you can easily include in
your documentation. You do not need any backend, so you can easily serve them on
your web page or Github pages. It is really simple!

You can also use a 3D-rendered preview of the board instead of the stylized one:
<div style="width: 100%; border: solid 2px #2563EB; border-radius: 10px;" id="pinionDemo-render"></div>
<script src="releases/latest/pinion.js"></script>
<link rel="stylesheet" href="releases/latest/pinion.css">
<script>
    pinion.setup(document.getElementById("pinionDemo-render"), {
        source: "resources/alksDemo-rendered"
    });
</script>


## Making your first diagram

...is easy. Just [install Pinion](installation.md) and then follow the
[walkthrough](diagramWalkthrough.md).

## Pinion is broken. What can I do about it?

If something is not working as expected, please open an [issue on
GitHub](https://github.com/yaqwsx/Pinion/issues). Please, provide as many
resources as possible and clear instructions on reproduction of the bug.

If you have a proposal for a new feature or you are just unsure about Pinion
usage, you can start a [discussion on
GitHub](https://github.com/yaqwsx/Pinion/discussions).

## Do you enjoy Pinion or does it save your time?

Then definitely consider [**supporting me on GitHub
Sponsors**](https://github.com/sponsors/yaqwsx) or buy me a coffee:

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E2181LU)

You support will allow me to allocate time to properly maintain my projects like
this.

PS: Be sure to check out my other KiCAD & PCB related projects:

- [KiKit](https://github.com/yaqwsx/KiKit/)
- [PcbDraw](https://github.com/yaqwsx/PcbDraw/)
- [JlcParts](https://github.com/yaqwsx/jlcparts)
