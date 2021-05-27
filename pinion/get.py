from pinion.common import RESOURCES
import os

def get(what, output):
    mapping = {
        "js": "pinion.js",
        "css": "pinion.css",
        "template": "indexTemplate.html"
    }

    if what not in mapping:
        raise RuntimeError(f"Uknown resource '{what}' specified")

    with open(os.path.join(RESOURCES, mapping[what])) as f:
        output.write(f.read())
