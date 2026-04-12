# Frequently asked questions

## Pinion says `pcbnew: no module found`

This message probably means that you don't have KiCAD 9 or newer installed. On
Windows, make sure you run all Pinion commands inside **KiCAD Command Prompt**,
not in the regular command prompt. See [installation](installation.md).

## The diagram does not show up!

If the diagram does not show up, there can be several reasons:

- you have either script or source location wrong. Open developer tools in your
  browser and inspect logs what went wrong.
- you open a page from local file system (the URL in browser starts with
  `file://`). In that case `pinion-widget` is not able to load the specification
  as modern browsers prevent from loading local files (due to security reasons).
  Try running `pinion server -b -d <directory>` with the directory containing
  the diagram.
