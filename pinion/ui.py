import click
import csv
import io

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
@click.option("-c", "--components", type=CliList(), default=None,
    help="Include only specified components in the template")
def template(board, output, components):
    """
    Output a template for pinout specification based on specified board
    """
    # Note that we import inside functions as pcbnew import takes ~1 to load
    # which makes the UI laggy
    from pinion.template import generateTemplate
    import pcbnew

    pcb = pcbnew.LoadBoard(board)
    generateTemplate(pcb, output, components)

@click.command("generate")
@click.argument("outputdir", type=click.Path(file_okay=False, dir_okay=True))
@click.option("-b", "--board",
    type=click.Path(file_okay=True, dir_okay=False, exists=True), required=True,
    help="Source KiCAD board (*.kicad_pcb)")
@click.option("-s", "--specification", type=click.File("r"),
    help="YAML specification of the pinout")
@click.option("--dpi", type=int, default=300,
    help="DPI of the generated board image")
@click.option("--style", help="PcbDraw style specification")
@click.option("--libs", help="PcbDraw library specification")
@click.option("--remap", help="PcbDraw footprint remapping specification")
@click.option("--filter", help="PcbDraw filter specification")
def generate(board, specification, outputdir, dpi, style, libs, remap, filter):
    """
    Generate a pinout diagram
    """
    # Note that we import inside functions as pcbnew import takes ~1 to load
    # which makes the UI laggy
    from pinion.generate import generate
    from ruamel.yaml import YAML
    import pcbnew

    yaml=YAML(typ='safe')

    generate(specification=yaml.load(specification),
             board=pcbnew.LoadBoard(board),
             outputdir=outputdir,
             dpi=dpi,
             pcbdrawArgs={
                 "style": style,
                 "libs": libs,
                 "remap": remap,
                 "filter": filter
             })

@click.group()
def cli():
    """
    Generate beautiful pinout digrams of your PCBs for web.
    """
    pass

cli.add_command(template)
cli.add_command(generate)

if __name__ == "__main__":
    cli()