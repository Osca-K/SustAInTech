import argparse
from pathlib import Path

from extract_statement import default_output_path, extract_to_json, print_summary
from validate_extracted_statement import validate_extracted_statement


def process_one_statement(input_pdf: Path, output_path: Path | None = None) -> dict:
    output_path = output_path or default_output_path(input_pdf)
    data = extract_to_json(input_pdf, output_path, run_validation=False)
    data = validate_extracted_statement(data)
    output_path.write_text(__import__("json").dumps(data, indent=2), encoding="utf-8")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Process one municipal statement PDF into validated JSON.")
    parser.add_argument("--input", required=True, help="Path to one municipal statement PDF.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    input_pdf = Path(args.input)
    output_path = Path(args.output) if args.output else default_output_path(input_pdf)
    data = process_one_statement(input_pdf, output_path)
    print_summary(data, output_path)


if __name__ == "__main__":
    main()
