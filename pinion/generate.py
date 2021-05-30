from pathlib import Path
from pcbnewTransition import pcbnew, isV6
import json
import tempfile
import os
import subprocess
from pcbnewTransition.transition import isV6

from wand.api import library
from wand.color import Color
from wand.image import Image

from lxml import etree
from pcbdraw.pcbdraw import svg2ki

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
    if isV6():
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
        defs.append({
            "ref": ref,
            "description": s["description"],
            "front": footprint.GetLayer() == pcbnew.F_Cu,
            "back": footprint.GetLayer() == pcbnew.B_Cu,
            "highlight": s.get("highlight", False),
            "bbox": serializeEdaRect(footprint.GetBoundingBox(False, False)),
            "groups": getGroup(s),
            "pins": pinsDefinition(s.get("pins", None), footprint)
        })
    return defs

def svgToBitmap(infilename, outfilename, dpi):
    with Image(resolution=dpi) as image:
        with Color('transparent') as background_color:
            library.MagickSetBackgroundColor(image.wand,
                                            background_color.resource)
        image.read(filename=infilename, resolution=dpi)
        _, ext = os.path.splitext(outfilename)
        if ext.lower() == ".png":
            type = "png32"
        elif ext.lower() in [".jpg", ".jpeg"]:
            type = "jpeg"
        else:
            raise RuntimeError(f"Unsupported output image type {ext}")
        binaryBlob = image.make_blob(type)
        with open(outfilename, "wb") as out:
            out.write(binaryBlob)

def generateImage(boardfilename, outputfilename, dpi, pcbdrawArgs, back):
    """
    Generate board image for the diagram. Returns bounding box (top let, bottom
    right) active areas of the images in KiCAD native units.
    """
    # For now, use PcbDraw as a process until we rewrite the tool so it can be
    # used as a library. Also note that we always generate SVG first as we can
    # easily read the active area from it. Then we manually convert it to PNG
    with tempfile.TemporaryDirectory() as d:
        tmpdir = Path(d)
        svgfilename = tmpdir / "img.svg"
        command = ["pcbdraw", "--shrink", "0"]
        if back:
            command.append("--back")
        if pcbdrawArgs["style"] is not None:
            command.extend(["--style", pcbdrawArgs["style"]])
        if pcbdrawArgs["libs"] is not None:
            command.extend(["--libs", pcbdrawArgs["libs"]])
        if pcbdrawArgs["remap"] is not None:
            command.extend(["--remap", pcbdrawArgs["remap"]])
        if pcbdrawArgs["filter"] is not None:
            command.extend(["--filter", pcbdrawArgs["filter"]])
        command.append(boardfilename)
        command.append(str(svgfilename))
        subprocess.run(command, check=True)

        svgToBitmap(svgfilename, outputfilename, dpi)

        document = etree.parse(str(svgfilename))
        tlx, tly, w, h = map(float, document.getroot().attrib["viewBox"].split())
        return {
            "tl": (ki2mm(svg2ki(tlx)), ki2mm(svg2ki(tly))),
            "br": (ki2mm(svg2ki(tlx + w)), ki2mm(svg2ki(tly + h)))
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

def generate(board, specification, outputdir, dpi, pack, pcbdrawArgs):
    """
    Generate board pinout diagram
    """
    outputdir = Path(outputdir)
    outputdir.mkdir(parents=True, exist_ok=True)

    fSource = generateImage(board.GetFileName(), outputdir / "front.png",
        dpi, pcbdrawArgs, False)
    bSource = generateImage(board.GetFileName(), outputdir / "back.png",
        dpi, pcbdrawArgs, True)

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
