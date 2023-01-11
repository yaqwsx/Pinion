from pathlib import Path
from pcbnewTransition import pcbnew, isV6, isV7
import json

from typing import Tuple, Callable, Dict, Optional

from pcbdraw.plot import (PcbPlotter, PlotComponents, PlotSubstrate,
                          load_remapping, mm2ki)
from pcbdraw import convert

from pinion import __version__

def dmil2ki(val):
    """
    Convert KiCAD decimils to native units
    """
    return val * 2540

def ki2mm(val):
    return val / 1000000.0

def mm2ki(val):
    return val * 1000000

def padOutline(pad):
    """
    Given a pad return list of points forming a polygon for the pad shape
    """
    p = pcbnew.SHAPE_POLY_SET()
    if isV6() or isV7():
        p = pad.GetEffectivePolygon()
    else:
        pad.TransformShapeWithClearanceToPolygon(p, 0, 16, 1.0)
    outline = p.Outline(0)
    points = [outline.CPoint(i) for i in range(outline.PointCount())]
    return [(ki2mm(p.x), ki2mm(p.y)) for p in points]

def serializeEdaRect(rect):
    return {
        "tl": (ki2mm(rect.GetX()), ki2mm(rect.GetY())),
        "br": (ki2mm(rect.GetX() + rect.GetWidth()), ki2mm(rect.GetY() + rect.GetHeight()))
    }

def intervalIntersection(a, b):
    """
    Compute interval intersection, return it as tuple or None
    """
    a = (min(a[0], a[1]), max(a[0], a[1]))
    b = (min(b[0], b[1]), max(b[0], b[1]))
    if b[0] > a[0]:
        a, b = b, a
    # The intervals are sorted from left to right
    if b[0] > a[1] or b[1] < a[0]:
        return None
    return b[0], min(a[1], b[1])

def overlappingRectComparator(a, b):
    """
    Compare two serialized rects based on which one contains more of the other
    one. Since such an ordering is incomplete, the function returns the
    following:
    - -1 if a is below b
    - 1 if b is below a
    - 0 if the order doesn't matter
    """
    xIntersection = intervalIntersection(
        (a["tl"][0], a["br"][0]),
        (b["tl"][0], b["br"][0]))
    yIntersection = intervalIntersection(
        (a["tl"][1], a["br"][1]),
        (b["tl"][1], b["br"][1]))
    if xIntersection is None or yIntersection is None:
        return 0
    aArea = (a["br"][0] - a["tl"][0]) * (a["br"][1] - a["tl"][1])
    bArea = (b["br"][0] - b["tl"][0]) * (b["br"][1] - b["tl"][1])
    iArea = (xIntersection[1] - xIntersection[0]) * (yIntersection[1] - yIntersection[0])
    if iArea / aArea > iArea / bArea:
        return -1
    return 1

def sortByRectangles(items):
    """
    Implementation of insert sort on partial ordering for overlapping
    rectangles.
    """
    for i in range(1, len(items)):
        for j in reversed(range(i)):
            cmp = overlappingRectComparator(items[j]["bbox"], items[j+1]["bbox"])
            if cmp == 1:
                break
            items[j], items[j + 1] = items[j + 1], items[j]
    return items


def pinDefinition(spec, pad, footprint):
    """
    Given a pin specification and pad, construct description
    """
    # There is a bug in SWIG wrapper so we can't call test on layer set
    layers = list(pad.GetLayerSet().CuStack())
    pos = pad.GetPosition()
    return {
        "shape": padOutline(pad),
        "bbox": serializeEdaRect(pad.GetBoundingBox()),
        "pos": [ki2mm(pos.x), ki2mm(pos.y)],
        "front": pcbnew.F_Cu in layers,
        "back": pcbnew.B_Cu in layers,
        "name": spec["name"],
        "description": spec.get("description", ""),
        "alias": spec.get("alias", False),
        "groups": getGroup(spec)
    }

def pinsDefinition(spec, footprint):
    """
    Given a pins definition and a footprint, construct description
    """
    if spec is None:
        return []
    return [
        pinDefinition(spec[pad.GetName()], pad, footprint)
        for pad in footprint.Pads()
        if pad.GetName() in spec.keys()
    ]

def componentsDefinition(spec, board):
    """
    Given a specification, construct component description
    """
    defs = []
    for ref, s in spec.items():
        footprint = board.FindFootprintByReference(ref)
        highlightBoth = s.get("highlightBoth", False)
        defs.append({
            "ref": ref,
            "description": s["description"],
            "front": highlightBoth or footprint.GetLayer() == pcbnew.F_Cu,
            "back": highlightBoth or footprint.GetLayer() == pcbnew.B_Cu,
            "highlight": s.get("highlight", False),
            "bbox": serializeEdaRect(footprint.GetBoundingBox(False, False)),
            "groups": getGroup(s),
            "pins": pinsDefinition(s.get("pins", None), footprint)
        })
    # Sort the components so overlapping components are placed on top of each
    # other
    sortByRectangles(defs)
    return defs

def generateImage(boardfilename, outputfilename, dpi, pcbdrawArgs, back):
    """
    Generate board image for the diagram. Returns bounding box (top let, bottom
    right) active areas of the images in KiCAD native units.
    """

    plotter = PcbPlotter(boardfilename)
    plotter.setup_arbitrary_data_path(".")
    plotter.setup_env_data_path()
    plotter.setup_builtin_data_path()
    plotter.setup_global_data_path()

    plotter.yield_warning = print


    plotter.libs = pcbdrawArgs["libs"]
    plotter.render_back = back
    plotter.svg_precision = 5
    if pcbdrawArgs["style"] is not None:
        plotter.resolve_style(pcbdrawArgs["style"])

    # Prepare components
    remapping = load_remapping(pcbdrawArgs["remap"])
    def remapping_fun(ref: str, lib: str, name: str) -> Tuple[str, str]:
        if ref in remapping:
            remapped_lib, remapped_name = remapping[ref]
            if name.endswith('.back'):
                return remapped_lib, remapped_name + '.back'
            else:
                return remapped_lib, remapped_name
        return lib, name

    plot_components = PlotComponents(remapping=remapping_fun)
    if pcbdrawArgs["filter"] is not None:
        filter_set = set(pcbdrawArgs["filter"])
        def filter_fun(ref: str) -> bool:
            return ref in filter_set
        plot_components.filter = filter_fun

    plotter.plot_plan = [
        PlotSubstrate(drill_holes=True, outline_width=mm2ki(0.2)),
        plot_components]

    image = plotter.plot()

    convert.save(image, outputfilename, dpi)

    tlx, tly, w, h = map(float, image.getroot().attrib["viewBox"].split())
    return {
        "tl": (ki2mm(plotter.svg2ki(tlx)), ki2mm(plotter.svg2ki(tly))),
        "br": (ki2mm(plotter.svg2ki(tlx + w)), ki2mm(plotter.svg2ki(tly + h)))
    }

def collectGroups(components):
    groups = set()
    for c in components.values():
        groups.update(getGroup(c))
        pins = c.get("pins", None)
        if pins is not None:
            for p in pins.values():
                groups.update(getGroup(p))
    groups = list(groups)
    groups.sort()
    return { g: [] for g in groups }

def validateGroupStructure(struct):
    """
    Validate structure and transform it into a canonical form
    """
    newStruct = {}
    if not isinstance(struct, dict):
        raise RuntimeError(f"{struct} is not a dictionary")
    for key, value in struct.items():
        if not isinstance(key, str):
            raise RuntimeError(f"{key} is not a string")
        if value is None:
            newStruct[key] = {}
            continue
        if isinstance(value, dict):
            newStruct[key] = validateGroupStructure(value)
        if isinstance(value, list):
            newStruct[key] = { v: {} for v in value }
    return newStruct

def groupStructure(structure, components):
    """
    If a group structure is provided, validate it and return it. If not, build a
    flat structure from components.
    """
    if structure is None:
        return collectGroups(components)
    return validateGroupStructure(structure)

def getGroup(spec):
    g = spec.get("groups", [])
    if g is None:
        return []
    return g

def packPinion(outputdir):
    from pinion.get import get
    with open(outputdir / "pinion.js", "w") as f:
        get("js", f)
    with open(outputdir / "pinion.css", "w") as f:
        get("css", f)
    with open(outputdir / "template.html", "w") as f:
        get("template", f)

ImageGenerator = Callable[[pcbnew.BOARD, Path], Tuple[Dict[str, Tuple[int, int]]]]

def generateDrawnImages(board: pcbnew.BOARD, outputdir: Path, dpi: int, pcbdrawArgs: any) \
        -> Tuple[Dict[str, Tuple[int, int]]]:
    fSource = generateImage(board.GetFileName(), outputdir / "front.png",
        dpi, pcbdrawArgs, False)
    bSource = generateImage(board.GetFileName(), outputdir / "back.png",
        dpi, pcbdrawArgs, True)
    return fSource, bSource

def generateRenderedImages(board: pcbnew.BOARD, outputdir: Path,
                     orthographic: bool, raytraced: bool, componets: bool,
                     transparent: bool, baseResolution: Tuple[int, int]):
    from pcbdraw.renderer import (RenderAction, renderBoard, Side, postProcessCrop,
                                  validateExternalPrerequisites, GuiPuppetError)

    validateExternalPrerequisites()

    postProcess = postProcessCrop(board, pcbnew.FromMM(2), pcbnew.FromMM(2), transparent)

    renderPlan = [
        RenderAction(
            side=Side.FRONT,
            components=componets,
            raytraced=raytraced,
            orthographic=orthographic,
            postprocess=postProcess
        ),
        RenderAction(
            side=Side.BACK,
            components=componets,
            raytraced=raytraced,
            orthographic=orthographic,
            postprocess=postProcess
        )
    ]

    try:
        images = renderBoard(board.GetFileName(), renderPlan,
                            baseResolution=baseResolution,
                            bgColor1=(255, 255, 255), bgColor2=(255, 255, 255))
    except GuiPuppetError as e:
        e.img.save("error.png")
        e.message = "The following GUI error ocurred; image saved in error.png:\n" + e.message

    images[0][0].save(outputdir / "front.png")
    images[1][0].save(outputdir / "back.png")

    fArea = images[0][1]
    fAreaRect = {
        "tl": (ki2mm(fArea[0]), ki2mm(fArea[1])),
        "br": (ki2mm(fArea[2]), ki2mm(fArea[3]))
    }
    bArea = images[0][1]
    bWidth = bArea[2] - bArea[0]
    bAreaRect = {
        "tl": (ki2mm(-bArea[0] - bWidth), ki2mm(bArea[1])),
        "br": (ki2mm(-bArea[2] + bWidth), ki2mm(bArea[3]))
    }
    return fAreaRect, bAreaRect


def generate(board: pcbnew.BOARD, specification: any, outputdir, pack: bool,
             imageGenerator: ImageGenerator):
    """
    Generate board pinout diagram
    """
    outputdir = Path(outputdir)
    outputdir.mkdir(parents=True, exist_ok=True)

    fSource, bSource = imageGenerator(board, outputdir)

    specification = {
        "pinionVersion": __version__,
        "name": specification["name"],
        "description": specification["description"],
        "front": {
            "file": "front.png",
            "area": fSource
        },
        "back": {
            "file": "back.png",
            "area": bSource
        },
        "components": componentsDefinition(specification["components"], board),
        "groups": groupStructure(specification.get("groups", None), specification["components"])
    }

    with open(outputdir / "spec.json", "w") as f:
        f.write(json.dumps(specification, indent=4))

    if pack:
        packPinion(outputdir)
