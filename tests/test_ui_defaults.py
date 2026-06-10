import tempfile
import unittest
from pathlib import Path

import click

from pinion.ui import (
    defaultBoardPath,
    defaultSpecificationPath,
    defaultTemplateOutputPath,
    resolveTemplateOutput,
)


class DefaultPathTest(unittest.TestCase):
    def test_board_prefers_project_name(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()
            preferred = cwd / "Board.kicad_pcb"
            preferred.touch()
            (cwd / "Other.kicad_pcb").touch()

            self.assertEqual(defaultBoardPath(cwd), preferred)

    def test_board_uses_only_candidate(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()
            only = cwd / "Other.kicad_pcb"
            only.touch()

            self.assertEqual(defaultBoardPath(cwd), only)

    def test_board_fails_on_ambiguous_candidates(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()
            (cwd / "First.kicad_pcb").touch()
            (cwd / "Second.kicad_pcb").touch()

            with self.assertRaises(click.ClickException):
                defaultBoardPath(cwd)

    def test_specification_prefers_project_yaml(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()
            preferred = cwd / "Board_pinion.yaml"
            preferred.touch()
            (cwd / "Other_pinion.yaml").touch()

            self.assertEqual(defaultSpecificationPath(cwd), preferred)

    def test_specification_supports_project_yml(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()
            preferred = cwd / "Board_pinion.yml"
            preferred.touch()

            self.assertEqual(defaultSpecificationPath(cwd), preferred)

    def test_specification_fails_on_ambiguous_candidates(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()
            (cwd / "First_pinion.yaml").touch()
            (cwd / "Second_pinion.yml").touch()

            with self.assertRaises(click.ClickException):
                defaultSpecificationPath(cwd)

    def test_template_output_uses_project_name(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()

            self.assertEqual(
                defaultTemplateOutputPath(cwd),
                cwd / "Board_pinion.yaml")

    def test_inferred_template_output_does_not_overwrite(self):
        with tempfile.TemporaryDirectory(prefix="pinion-test-") as directory:
            cwd = Path(directory) / "Board"
            cwd.mkdir()
            (cwd / "Board_pinion.yaml").touch()
            oldCwd = Path.cwd()
            try:
                import os
                os.chdir(cwd)
                with self.assertRaises(click.ClickException):
                    resolveTemplateOutput(None)
            finally:
                os.chdir(oldCwd)


if __name__ == "__main__":
    unittest.main()
