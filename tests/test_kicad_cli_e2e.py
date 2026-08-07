"""End-to-end coverage for the pcbnew-free Pinion command paths."""

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).parents[1]
BOARD = ROOT / "docs/resources/ArduinoLearningKitStarter.kicad_pcb"
SPEC = ROOT / "docs/resources/alksSpec.yml"


pytestmark = pytest.mark.skipif(
    shutil.which("kicad-cli") is None, reason="kicad-cli is required for E2E tests"
)


def run_pinion(*arguments: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "pinion.ui", *arguments], cwd=ROOT,
        capture_output=True, text=True, timeout=180,
    )


def test_template_and_plotted_generation_use_kicad_cli_only(tmp_path):
    template = tmp_path / "template.yml"
    result = run_pinion("template", "--board", str(BOARD), "--output", str(template))
    assert result.returncode == 0, result.stderr
    content = template.read_text(encoding="utf-8")
    assert "C1:" in content
    assert "Net-(C1-Pad2)" in content

    output = tmp_path / "diagram"
    result = run_pinion(
        "generate", "plotted", "--board", str(BOARD), "--specification", str(SPEC),
        "--no-pack", "--side", "front", str(output),
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
    )
    assert result.returncode == 0, result.stderr
    assert (output / "front.png").is_file()
    specification = json.loads((output / "spec.json").read_text(encoding="utf-8"))
    assert specification["front"]["area"]["br"][0] > specification["front"]["area"]["tl"][0]


def test_pinion_sources_do_not_import_pcbnew():
    offenders = []
    for source in (ROOT / "pinion").glob("*.py"):
        content = source.read_text(encoding="utf-8")
        if "import pcbnew" in content or "from pcbnew" in content:
            offenders.append(source.name)
    assert offenders == []
