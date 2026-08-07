# Frequently asked questions

## Pinion says `kicad-cli not found`

This message means that Pinion cannot locate KiCAD 9 or newer's command-line
tool. Add `kicad-cli` to your `PATH`, or set `KICAD_CLI` to its executable path.
See [installation](installation.md).

## The diagram does not show up!

If the diagram does not show up, there can be several reasons:

- you have either script or source location wrong. Open developer tools in your
  browser and inspect logs what went wrong.
- you open a page from local file system (the URL in browser starts with
  `file://`). In that case `pinion-widget` is not able to load the specification
  as modern browsers prevent from loading local files (due to security reasons).
  Try running `pinion serve -b -d <directory>` with the directory containing
  the diagram.
