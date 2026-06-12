from generate_pilot_households import main as generate_households
from generate_monthly_water_data import main as generate_water
from calculate_statement_charges import main as calculate_charges
from build_render_inputs import main as build_render_inputs
from render_batch import main as render_batch


def main() -> None:
    generate_households()
    generate_water()
    calculate_charges()
    build_render_inputs()
    successes, failures = render_batch()
    if failures:
        raise SystemExit(f"Rendered {len(successes)} PDFs with {len(failures)} failures.")


if __name__ == "__main__":
    main()
