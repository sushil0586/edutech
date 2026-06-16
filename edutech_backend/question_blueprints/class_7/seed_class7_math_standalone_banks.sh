#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <INSTITUTE_CODE> [PYTHON_BIN]"
  echo "Example: $0 DLI001 .venv/bin/python"
  exit 1
fi

INSTITUTE_CODE="$1"
PYTHON_BIN="${2:-.venv/bin/python}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python binary not found or not executable: $PYTHON_BIN"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

seed_bank() {
  local file_path="$1"
  local topic_name="$2"

  echo "Seeding: $topic_name"
  "$PYTHON_BIN" manage.py seed_class7_math_standalone_bank "$INSTITUTE_CODE" \
    --file "$file_path" \
    --topic-name "$topic_name" \
    --replace-existing
}

seed_bank "question_blueprints/class_7/CLASS_7_INTEGERS_50_QUESTION_BANK.md" "Integers"
seed_bank "question_blueprints/class_7/CLASS_7_FRACTIONS_AND_DECIMALS_50_QUESTION_BANK.md" "Fractions and Decimals"
seed_bank "question_blueprints/class_7/CLASS_7_DATA_HANDLING_50_QUESTION_BANK.md" "Data Handling"
seed_bank "question_blueprints/class_7/CLASS_7_SIMPLE_EQUATIONS_50_QUESTION_BANK.md" "Simple Equations"
seed_bank "question_blueprints/class_7/CLASS_7_LINES_AND_ANGLES_50_QUESTION_BANK.md" "Lines and Angles"
seed_bank "question_blueprints/class_7/CLASS_7_THE_TRIANGLE_AND_ITS_PROPERTIES_50_QUESTION_BANK.md" "The Triangle and Its Properties"
seed_bank "question_blueprints/class_7/CLASS_7_CONGRUENCE_OF_TRIANGLES_50_QUESTION_BANK.md" "Congruence of Triangles"
seed_bank "question_blueprints/class_7/CLASS_7_PRACTICAL_GEOMETRY_50_QUESTION_BANK.md" "Practical Geometry"
seed_bank "question_blueprints/class_7/CLASS_7_PERIMETER_AND_AREA_50_QUESTION_BANK.md" "Perimeter and Area"
seed_bank "question_blueprints/class_7/CLASS_7_SYMMETRY_50_QUESTION_BANK.md" "Symmetry"
seed_bank "question_blueprints/class_7/CLASS_7_VISUALISING_SOLID_SHAPES_50_QUESTION_BANK.md" "Visualising Solid Shapes"

echo "Completed seeding all available standalone Class 7 Math banks for institute: $INSTITUTE_CODE"
