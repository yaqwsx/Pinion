import click
import csv
import io
import functools
from pathlib import Path
from typing import Dict, Tuple
from pinion import __version__
from pinion.generate import generateDrawnImages

def splitStr(delimiter, escapeChar, s):
    """
    Splits s based on delimiter that can be escaped via escapeChar
    """
    # Let's use csv reader to implement this
    reader = csv.reader(io.StringIO(s), delimiter=delimiter, escapechar=escapeChar)
    # Unpack first line
    for x in reader:
        return x


class CliList(click.ParamType):
    """
    A CLI argument type for specifying comma separated list of strings
    """
    name = "list"

    def __init__(self, separator=",", escape="\\", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.separator = separator
        self.escape = escape

    def convert(self, value, param, ctx):
        if len(value.strip()) == 0:
            self.fail(f"{value} is not a valid argument specification",
                param, ctx)
        return list(splitStr(self.separator, self.escape, value))


@click.command("template")
@click.option("-b", "--board",
    type=click.Path(file_okay=True, dir_okay=False, exists=True), required=True,
    help="Source KiCAD board (*.kicad_pcb)")
@click.option("-o", "--output", type=click.File("w"), required=True,
    help="Filepath or stdout (when '-' specified) for the resulting template")
@click.option("-c", "--components", type=str, default=None, multiple=True,
    help="Include only components mathing regex in the template")
def template(board, output, components):
    """
    Output a template for pinout specification based on specified board
    """
    # Note that we import inside functions as pcbnew import takes ~1 to load
    # which makes the UI laggy
    from pinion.template import generateTemplate
    from pcbnewTransition import pcbnew

    pcb = pcbnew.LoadBoard(board)
    generateTemplate(pcb, output, components)


def generateCommandArgs(func):
    @click.argument("outputdir", type=click.Path(file_okay=False, dir_okay=True))
    @click.option("-b", "--board",
    type=click.Path(file_okay=True, dir_okay=False, exists=True), required=True,
    help="Source KiCAD board (*.kicad_pcb)")
    @click.option("-s", "--specification", type=click.File("r"), required=True,
    help="YAML specification of the pinout")
    @click.option("--pack/--no-pack", default=True,
    help="Pack pinion-widget with the source")

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper


@click.command("plotted")
@generateCommandArgs
@click.option("--dpi", type=int, default=300,
    help="DPI of the generated board image")
@click.option("--style", help="PcbDraw style specification")
@click.option("--libs", type=CliList(),
    help="PcbDraw library specification")
@click.option("--remap", help="PcbDraw footprint remapping specification")
@click.option("--filter", help="PcbDraw filter specification")
def generatePlotted(board, specification, outputdir, dpi, pack, style, libs, remap, filter):
    """
    Generate a pinout diagram with stylized image of the board
    """
    # Note that we import inside functions as pcbnew import takes ~1 to load
    # which makes the UI laggy
    from pinion.generate import generate, generateDrawnImages
    from ruamel.yaml import YAML
    from pcbnewTransition import pcbnew

    yaml=YAML(typ='safe')

    def generateImages(board: pcbnew.BOARD, outputdir: Path) -> Tuple[Dict[str, Tuple[int, int]]]:
        return generateDrawnImages(board, outputdir, dpi, {
                 "style": style,
                 "libs": libs,
                 "remap": remap,
                 "filter": filter
             })

    generate(specification=yaml.load(specification),
             board=pcbnew.LoadBoard(board),
             outputdir=outputdir,
             pack=pack,
             imageGenerator=generateImages)

@click.command("rendered")
@generateCommandArgs
@click.option("--renderer", type=click.Choice(["raytrace", "normal"]), default="raytrace",
    help="Specify what renderer to use")
@click.option("--projection", type=click.Choice(["orthographic", "perspective"]), default="orthographic",
    help="Specify projection")
@click.option("--no-components", is_flag=True, default=False,
    help="Disable component rendering")
@click.option("--transparent", is_flag=True,
    help="Make transparent background of the image")
def generateRendered(board, specification, pack, outputdir, renderer,
                     projection, no_components, transparent):
    """
    Generate a pinout diagram with 3D rendered image of the board
    """
    # Note that we import inside functions as pcbnew import takes ~1 to load
    # which makes the UI laggy
    from pinion.generate import generate, generateRenderedImages
    from ruamel.yaml import YAML
    from pcbnewTransition import pcbnew

    yaml=YAML(typ='safe')

    def generateImages(board: pcbnew.BOARD, outputdir: Path) -> Tuple[Dict[str, Tuple[int, int]]]:
        return generateRenderedImages(board, outputdir,
            componets=(not no_components),
            transparent=transparent,
            orthographic=(projection == "orthographic"),
            raytraced=(renderer == "raytrace"),
            baseResolution=(3000, 3000))

    generate(specification=yaml.load(specification),
             board=pcbnew.LoadBoard(board),
             outputdir=outputdir,
             pack=pack,
             imageGenerator=generateImages)


@click.group()
def generate():
    """
    Generate the diagram using one of the following strategies
    """
    pass

generate.add_command(generatePlotted)
generate.add_command(generateRendered)

@click.command("get")
@click.argument("what", type=str)
@click.argument("output", type=click.File("w"))
def get(what, output):
    """
    Get Pinion resource files - e.g., template, pinion-widget javascript or
    pinion-widget styles.

    Available options: js css template
    """
    import pinion.get
    return pinion.get.get(what, output)

@click.command("serve")
@click.option("--directory", "-d", type=click.Path(dir_okay=True, file_okay=False),
    default="./", help="Directory to serve")
@click.option("--port", "-p", type=int, default=3333,
    help="Port on which to run a webserver")
@click.option("--browser", "-b", is_flag=True,
    help="Automatically open web browser")
def serve(directory, port, browser):
    """
    Serve pinion digram generated with the '--pack' option.
    """
    from pinion.serve import serve
    return serve(directory, port, browser)

@click.group()
@click.version_option(__version__)
def cli():
    """
    Generate beautiful pinout digrams of your PCBs for web.
    """
    pass

cli.add_command(template)
cli.add_command(generate)
cli.add_command(get)
cli.add_command(serve)

if __name__ == "__main__":
    cli()
