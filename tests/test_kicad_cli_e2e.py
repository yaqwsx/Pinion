"""End-to-end coverage for the pcbnew-free Pinion command paths."""

import ast
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional

import pytest


ROOT = Path(__file__).parents[1]
BOARD = ROOT / "docs/resources/ArduinoLearningKitStarter.kicad_pcb"
SPEC = ROOT / "docs/resources/alksSpec.yml"


pytestmark = pytest.mark.skipif(
    shutil.which("kicad-cli") is None, reason="kicad-cli is required for E2E tests"
)


def run_pinion(*arguments: str, block_pcbnew: bool = False,
               site_directory: Optional[Path] = None) -> subprocess.CompletedProcess:
    environment = os.environ.copy()
    if block_pcbnew:
        assert site_directory is not None
        (site_directory / "sitecustomize.py").write_text(
            """import sys
class BlockPcbnew:
    def find_spec(self, name, path=None, target=None):
        if name == 'pcbnew':
            raise ImportError('pcbnew is intentionally unavailable in this test')
        return None
sys.meta_path.insert(0, BlockPcbnew())
""", encoding="utf-8")
        environment["PYTHONPATH"] = os.pathsep.join(filter(None, (
            str(site_directory), environment.get("PYTHONPATH"),
        )))
    return subprocess.run(
        [sys.executable, "-m", "pinion.ui", *arguments], cwd=ROOT,
        capture_output=True, text=True, timeout=180, env=environment,
    )


def test_template_and_plotted_generation_use_kicad_cli_only(tmp_path):
    template = tmp_path / "template.yml"
    result = run_pinion(
        "template", "--board", str(BOARD), "--output", str(template),
        block_pcbnew=True, site_directory=tmp_path,
    )
    assert result.returncode == 0, result.stderr
    content = template.read_text(encoding="utf-8")
    assert "C1:" in content
    assert "Net-(C1-Pad2)" in content

    output = tmp_path / "diagram"
    result = run_pinion(
        "generate", "plotted", "--board", str(BOARD), "--specification", str(SPEC),
        "--no-pack", "--side", "front", str(output), block_pcbnew=True,
        site_directory=tmp_path,
    )
    assert result.returncode == 0, result.stderr
    specification = json.loads((output / "spec.json").read_text(encoding="utf-8"))
    assert "front" in specification
    assert (output / "front.png").is_file()
    assert any(component["pins"] for component in specification["components"])


def test_rendered_generation_uses_the_kicad_cli_renderer(tmp_path):
    output = tmp_path / "rendered"
    result = run_pinion(
        "generate", "rendered", "--board", str(BOARD), "--specification", str(SPEC),
        "--no-pack", "--side", "front", "--renderer", "normal", str(output),
        block_pcbnew=True, site_directory=tmp_path,
    )
    assert result.returncode == 0, result.stderr
    assert (output / "front.png").is_file()
    specification = json.loads((output / "spec.json").read_text(encoding="utf-8"))
    assert specification["front"]["area"]["br"][0] > specification["front"]["area"]["tl"][0]


def test_pinion_sources_do_not_import_pcbnew():
    offenders = []
    for source in (ROOT / "pinion").glob("*.py"):
        tree = ast.parse(source.read_text(encoding="utf-8"), filename=str(source))
        imports_pcbnew = any(
            (isinstance(node, ast.Import) and any(
                alias.name == "pcbnew" for alias in node.names)) or
            (isinstance(node, ast.ImportFrom) and node.module == "pcbnew")
            for node in ast.walk(tree)
        )
        if imports_pcbnew:
            offenders.append(source.name)
    assert offenders == []
