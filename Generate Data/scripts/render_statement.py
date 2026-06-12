import json
import shutil
import subprocess
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "sample_statement.json"
TEMPLATE_DIR = ROOT / "templates"
TEMPLATE_NAME = "municipal_statement.tex.j2"
GENERATED_TEX_DIR = ROOT / "output" / "generated_tex"
PDF_DIR = ROOT / "output" / "pdf"
OUTPUT_TEX = GENERATED_TEX_DIR / "municipal_statement.tex"
OUTPUT_PDF = PDF_DIR / "municipal_statement.pdf"


LATEX_REPLACEMENTS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def latex_escape(value: object) -> str:
    text = str(value)
    return "".join(LATEX_REPLACEMENTS.get(character, character) for character in text)


def render_statement(data_file: Path = DATA_FILE, output_pdf: Path = OUTPUT_PDF) -> Path:
    GENERATED_TEX_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    data = json.loads(Path(data_file).read_text(encoding="utf-8"))

    environment = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(disabled_extensions=("tex", "j2")),
        block_start_string="<%",
        block_end_string="%>",
        variable_start_string="<<",
        variable_end_string=">>",
        comment_start_string="<#",
        comment_end_string="#>",
        trim_blocks=True,
        lstrip_blocks=True,
    )
    environment.filters["latex"] = latex_escape

    template = environment.get_template(TEMPLATE_NAME)
    rendered = template.render(data=data)
    OUTPUT_TEX.write_text(rendered, encoding="utf-8")

    try:
        subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", OUTPUT_TEX.name],
            cwd=OUTPUT_TEX.parent,
            check=True,
        )
        generated_pdf = OUTPUT_TEX.with_suffix(".pdf")
        shutil.copy2(generated_pdf, output_pdf)
        print(f"Generated PDF: {output_pdf}")
        return output_pdf
    except subprocess.CalledProcessError as exc:
        print("LaTeX compilation failed.")
        raise SystemExit(exc.returncode) from exc


def main() -> None:
    render_statement(DATA_FILE, OUTPUT_PDF)


if __name__ == "__main__":
    main()
