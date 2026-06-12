from pathlib import Path

from render_statement import render_statement


ROOT = Path(__file__).resolve().parents[1]
RENDER_DIR = ROOT / "data" / "render_inputs"
PDF_DIR = ROOT / "output" / "pdf"


def render_batch() -> tuple[list[Path], list[tuple[Path, str]]]:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    successes = []
    failures = []

    for json_file in sorted(RENDER_DIR.glob("*.json")):
        output_pdf = PDF_DIR / f"{json_file.stem}.pdf"
        try:
            render_statement(json_file, output_pdf)
            successes.append(output_pdf)
        except SystemExit as exc:
            failures.append((json_file, f"LaTeX exited with status {exc.code}"))
        except Exception as exc:
            failures.append((json_file, str(exc)))

    print("Batch render summary")
    print(f"  successes: {len(successes)}")
    print(f"  failures: {len(failures)}")
    for json_file, error in failures:
        print(f"  failed: {json_file.name}: {error}")
    return successes, failures


def main() -> tuple[list[Path], list[tuple[Path, str]]]:
    return render_batch()


if __name__ == "__main__":
    main()
