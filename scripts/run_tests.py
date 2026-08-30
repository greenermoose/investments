#!/usr/bin/env python3
"""Run the repository's test suite.

`unittest discover` cannot walk scripts/tests directly: the directory is not a
package, and making it one would require packaging scripts/ as well, which
would break every script that is run directly by path. This runner does the
discovery explicitly instead, so there is one command that works with nothing
installed beyond the standard library.

    python scripts/run_tests.py
"""

from pathlib import Path
import sys
import unittest


def main(argv=None):
    scripts_dir = Path(__file__).resolve().parent
    tests_dir = scripts_dir / "tests"
    # Tests import the modules under test by their bare names.
    sys.path.insert(0, str(scripts_dir))
    sys.path.insert(0, str(tests_dir))

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    for path in sorted(tests_dir.glob("test_*.py")):
        suite.addTests(loader.loadTestsFromName(path.stem))

    verbosity = 2 if (argv or sys.argv[1:]) and "-v" in (argv or sys.argv[1:]) else 1
    result = unittest.TextTestRunner(verbosity=verbosity).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
