# Frequently asked questions

## Pinion says `pcbnew: no module found`

This message probably means that you either:

- you are running Windows or Mac. In that case until KiCAD 6 is released, you
  have to use one of the alternative methods of usage - see
  [installation](installation.md).
- you are running Linux, but you don't have KiCAD installed

## The diagram does not show up!

If the diagram does not show up, there can be several reasons:

- you have either script or source location wrong. Open developer tools in your
  browser and inspect logs what went wrong.
- you open a page from local file system (the URL in browser starts with
  `file://`). In that case `pinion-widget` is not able to load the specification
  as modern browsers prevent from loading local files (due to security reasons).
  Try running `python3 -m http.server 8000` in the directory and then open
  `http://localhost:8000` in your browser.
