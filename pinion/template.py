import os
import re
from ruamel.yaml import YAML
from ruamel.yaml.comments import Comment, CommentedSeq, CommentedMap

yaml=YAML()
yaml.default_flow_style=False
yaml.width=80
yaml.indent=4

def collectPins(footprint):
    pins = CommentedMap()
    for i, pad in enumerate(footprint.Pads()):
        p = CommentedMap()
        p.insert(0, "name", f"{footprint.GetReference()}.{pad.GetName()}")
        p.insert(1, "description", "")
        p.insert(2, "groups", [])
        pins.insert(i, pad.GetName(), p, f"Connected to {pad.GetNetname()}")
    return pins

def collectComponents(board, components=None):
    """
    Collect components template from the board. Include only footprints in
    components if specified
    """
    d = CommentedMap()
    footprints = [f for f in board.GetFootprints()
        if components is None or len(components) == 0 or any([re.match(c, f.GetReference()) for c in components])]
    footprints.sort(key=lambda f: f.GetReference())
    for i, f in enumerate(footprints):
        description = CommentedMap()
        description.insert(0, "description", f.GetValue(), "Arbitrary comment")
        description.insert(1, "groups", [], "Specify component groups")
        description.insert(2, "pins", collectPins(f))
        description.insert(3, "highlight", False, "Make the component active")
        d.insert(i, f.GetReference(), description)
    return d

def generateTemplate(board, output, components):
    """
    Given a board and output file, generate template. Template includes all
    components and all pins.
    """
    d = CommentedMap()
    name = os.path.basename(board.GetFileName())
    name = os.path.splitext(name)[0]
    d.insert(0, "name", name, "Put the name of diagram here")
    d.insert(1, "description", "Example diagram", "Put a short description of the diagram here")
    d.insert(2, "components", collectComponents(board, components))

    yaml.dump(data=d, stream=output)

