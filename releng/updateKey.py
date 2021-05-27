#!/usr/bin/env python3

import json
import sys

with open(sys.argv[1]) as f:
    jFile = json.load(f)

obj = jFile
path = sys.argv[2].split(".")
for x in path[:-1]:
    obj = obj[x]
obj[path[-1]] = sys.argv[3]

with open(sys.argv[1], "w") as f:
    json.dump(jFile, f, indent=2)
