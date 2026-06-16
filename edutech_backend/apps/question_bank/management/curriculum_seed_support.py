from decimal import Decimal

from apps.academics.models import TopicDifficulty
from apps.question_bank.models import QuestionType


SUBJECT_CODE_MAP = {
    "math": "CLS7-MATH",
    "science": "CLS7-SCI",
}

DIFFICULTY_SEQUENCE = (
    [TopicDifficulty.FOUNDATION] * 20
    + [TopicDifficulty.INTERMEDIATE] * 30
    + [TopicDifficulty.ADVANCED] * 50
)


def ordered_options(values, *, correct_index):
    return [
        {"option_text": value, "is_correct": index == correct_index}
        for index, value in enumerate(values)
    ]


def true_false_options(*, is_true):
    return [
        {"option_text": "True", "is_correct": is_true},
        {"option_text": "False", "is_correct": not is_true},
    ]


def _pick_variant(sequence_number, variants):
    return variants[(sequence_number - 1) % len(variants)]()


def _topic_family(topic_code):
    token = (topic_code or "").upper()
    if token.startswith("MATH-ARITH"):
        return "math_arithmetic"
    if token.startswith("MATH-FRACTIONS"):
        return "math_fractions"
    if token.startswith("MATH-ALGEBRA"):
        return "math_algebra"
    if token.startswith("MATH-NUMBERS"):
        return "math_numbers"
    if token.startswith("MATH-LOGIC"):
        return "math_logic"
    if token.startswith("MATH-GEOMETRY"):
        return "math_geometry"
    if token.startswith("SCI-MATTER"):
        return "science_matter"
    if token.startswith("SCI-HEALTH"):
        return "science_health"
    if token.startswith("SCI-SPACE"):
        return "science_space"
    if token.startswith("SCI-PHYSICS"):
        return "science_physics"
    if token.startswith("SCI-LIFE"):
        return "science_life"
    if token.startswith("SCI-MOTION"):
        return "science_motion"
    return "science_exploration"


def _math_foundation(topic, sequence_number):
    family = _topic_family(topic.code)

    if family == "math_arithmetic":
        def score_balance():
            total = 40 + sequence_number
            step_one = 7 + (sequence_number % 5)
            step_two = 3 + (sequence_number % 4)
            answer = total - step_one + step_two
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A student starts with {total} points, loses {step_one} points, and then gains "
                        f"{step_two} points. What is the final score?"
                    ),
                    "explanation": f"The score is {total} - {step_one} + {step_two} = {answer}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(answer - 1), str(answer), str(answer + 1), str(total - step_one - step_two)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "olympiad_arithmetic_balance"},
                },
            )

        def school_supply_total():
            notebooks = 14 + (sequence_number % 6)
            pencils = 8 + (sequence_number % 5)
            erasers = 3 + (sequence_number % 4)
            answer = notebooks + pencils + erasers
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A class shop sold {notebooks} notebooks, {pencils} pencils, and {erasers} erasers "
                        "in one hour. How many items were sold altogether?"
                    ),
                    "explanation": f"Add all sold items: {notebooks} + {pencils} + {erasers} = {answer}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(answer), str(answer - erasers), str(answer + 2), str(notebooks + pencils)],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_arithmetic_total_items"},
                },
            )

        def wallet_change():
            money = 100 + 10 * (sequence_number % 5)
            spend = 28 + 2 * (sequence_number % 6)
            left = money - spend
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"Riya has ₹{money}. She buys stationery worth ₹{spend}. "
                        "How much money is left with her?"
                    ),
                    "explanation": f"Remaining money = {money} - {spend} = ₹{left}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(left - 10), str(left), str(spend), str(money + spend)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_arithmetic_money_left"},
                },
            )

        return _pick_variant(sequence_number, [score_balance, school_supply_total, wallet_change])

    if family == "math_fractions":
        def equivalent_fraction():
            numerator = 2 + (sequence_number % 4)
            denominator = numerator + 2
            factor = 2 + (sequence_number % 3)
            correct = f"{numerator * factor}/{denominator * factor}"
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": f"Which fraction is equivalent to {numerator}/{denominator}?",
                    "explanation": (
                        f"Multiplying numerator and denominator by {factor} gives "
                        f"{numerator * factor}/{denominator * factor}."
                    ),
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [
                            correct,
                            f"{numerator + factor}/{denominator + factor}",
                            f"{numerator * factor}/{denominator + factor}",
                            f"{numerator + 1}/{denominator}",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_fraction_equivalence"},
                },
            )

        def shaded_part():
            shaded = 2 + (sequence_number % 3)
            total = shaded + 3
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A strip is divided into {total} equal parts and {shaded} parts are shaded. "
                        "Which fraction represents the shaded part?"
                    ),
                    "explanation": f"Shaded fraction = shaded parts / total parts = {shaded}/{total}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [f"{shaded}/{total}", f"{total}/{shaded}", f"{shaded + 1}/{total}", f"{shaded}/{total + 1}"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_fraction_shaded_part"},
                },
            )

        def part_of_group():
            total_items = 12 + 2 * (sequence_number % 5)
            red_items = total_items // 3
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A basket contains {total_items} apples, and {red_items} of them are red. "
                        "What fraction of the apples are red?"
                    ),
                    "explanation": f"The fraction is red apples / total apples = {red_items}/{total_items}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [f"{red_items}/{total_items}", f"{total_items}/{red_items}", f"{red_items + 1}/{total_items}", f"{red_items}/{total_items + 1}"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_fraction_part_of_group"},
                },
            )

        def compare_simple_fraction():
            numerator_a = 1 + (sequence_number % 2)
            denominator_a = 3 + (sequence_number % 2)
            numerator_b = numerator_a + 1
            denominator_b = denominator_a + 2
            correct = f"{numerator_a}/{denominator_a} < {numerator_b}/{denominator_b}"
            return (
                QuestionType.TRUE_FALSE,
                {
                    "question_text": (
                        f"True or False: {numerator_a}/{denominator_a} is less than {numerator_b}/{denominator_b}."
                    ),
                    "explanation": (
                        "Compare the fraction values carefully; the second fraction represents a larger portion."
                    ),
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": true_false_options(is_true=True),
                    "metadata": {"question_pattern": "practical_fraction_compare_simple"},
                },
            )

        return _pick_variant(sequence_number, [equivalent_fraction, shaded_part, part_of_group, compare_simple_fraction])

    if family == "math_algebra":
        def reverse_linear():
            value = 6 + (sequence_number % 6)
            result = 2 * value + 5
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": f"If 2n + 5 = {result}, what is the value of n?",
                    "explanation": f"Subtract 5 to get 2n = {result - 5}, then divide by 2 to get n = {value}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "metadata": {
                        "accepted_answers": [str(value)],
                        "question_pattern": "olympiad_algebra_reverse",
                    },
                },
            )

        def age_variable():
            age = 8 + (sequence_number % 5)
            total = age + 7
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"Aman is x years old. After 7 years, his age will be {total}. What is x?"
                    ),
                    "explanation": f"If x + 7 = {total}, then x = {total} - 7 = {age}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(age - 1), str(age), str(age + 1), str(total)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_algebra_age_variable"},
                },
            )

        return _pick_variant(sequence_number, [reverse_linear, age_variable])

    if family == "math_numbers":
        def digit_sum_question():
            number = 3000 + 111 * (sequence_number % 7)
            digit_sum = sum(int(digit) for digit in str(number))
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": f"What is the sum of the digits of {number}?",
                    "explanation": f"Add the digits of {number} to get {digit_sum}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(digit_sum - 1), str(digit_sum), str(digit_sum + 2), str(len(str(number)))],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "olympiad_number_sense"},
                },
            )

        def place_value_question():
            number = 42735 + 101 * (sequence_number % 4)
            digit = int(str(number)[1])
            place_value = digit * 1000
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"In the number {number}, what is the place value of the digit {digit}?"
                    ),
                    "explanation": (
                        f"The digit {digit} is in the thousands place, so its place value is {place_value}."
                    ),
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(digit), str(place_value), str(digit * 100), str(place_value * 10)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_number_place_value"},
                },
            )

        def predecessor_successor():
            number = 50999 + 37 * sequence_number
            successor = number + 1
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": f"Which number is the immediate successor of {number}?",
                    "explanation": f"The immediate successor is one more than the number, so it is {successor}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(number - 1), str(number), str(successor), str(successor + 1)],
                        correct_index=2,
                    ),
                    "metadata": {"question_pattern": "practical_number_successor"},
                },
            )

        def indian_system_reading():
            lakh = 3 + (sequence_number % 6)
            thousand = 12 + (sequence_number % 8)
            number = lakh * 100000 + thousand * 1000 + 45
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": f"How is {number:,} written in the Indian place-value system?",
                    "explanation": (
                        f"{number:,} is read as {lakh} lakh {thousand} thousand 45 in the Indian system."
                    ),
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [
                            f"{lakh} lakh {thousand} thousand forty-five",
                            f"{lakh} million {thousand} thousand forty-five",
                            f"{lakh} thousand {thousand} lakh forty-five",
                            f"{lakh} lakh {thousand} hundred forty-five",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_number_indian_reading"},
                },
            )

        return _pick_variant(
            sequence_number,
            [digit_sum_question, place_value_question, predecessor_successor, indian_system_reading],
        )

    if family == "math_logic":
        def increasing_jumps():
            start = 3 + (sequence_number % 4)
            pattern = [start, start + 3, start + 8]
            next_value = pattern[-1] + 7
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A pattern begins {pattern[0]}, {pattern[1]}, {pattern[2]}. "
                        f"If the jumps increase by 2 each time, what is the next number?"
                    ),
                    "explanation": (
                        f"The jumps are {pattern[1] - pattern[0]} and {pattern[2] - pattern[1]}; "
                        f"the next jump is {next_value - pattern[-1]}."
                    ),
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(next_value - 1), str(next_value), str(next_value + 2), str(pattern[-1] + 3)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "olympiad_pattern_step"},
                },
            )

        def seating_pattern():
            tables = 2 + (sequence_number % 4)
            chairs = 4 * tables + 2
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"In an activity hall, the number of chairs follows the pattern 10, 14, 18, ... "
                        f"How many chairs will be needed for arrangement number {tables}?"
                    ),
                    "explanation": f"This increases by 4 each time, so arrangement {tables} needs {chairs} chairs.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(chairs - 2), str(chairs), str(chairs + 2), str(4 * tables)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_logic_seating_pattern"},
                },
            )

        def missing_term_basic():
            start = 6 + (sequence_number % 3)
            sequence = [start, start + 4, start + 8, None, start + 16]
            missing = start + 12
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"Find the missing number in the pattern: {sequence[0]}, {sequence[1]}, {sequence[2]}, __, {sequence[4]}."
                    ),
                    "explanation": f"The pattern increases by 4 each time, so the missing number is {missing}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [str(missing - 2), str(missing), str(missing + 2), str(sequence[4] - 2)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_logic_missing_term_basic"},
                },
            )

        return _pick_variant(sequence_number, [increasing_jumps, seating_pattern, missing_term_basic])

    perimeter = 24 + 2 * (sequence_number % 5)
    equal_side = 5 + (sequence_number % 4)
    base = perimeter - 2 * equal_side
    return (
        QuestionType.MCQ_SINGLE,
        {
            "question_text": (
                f"An isosceles triangle has perimeter {perimeter} cm and two equal sides of "
                f"{equal_side} cm each. What is the length of the third side?"
            ),
            "explanation": f"The third side is {perimeter} - 2 x {equal_side} = {base} cm.",
            "default_marks": Decimal("1.00"),
            "negative_marks": Decimal("0.25"),
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "options": ordered_options(
                [str(base), str(equal_side), str(perimeter - equal_side), str(base + 2)],
                correct_index=0,
            ),
            "metadata": {"question_pattern": "olympiad_geometry_perimeter"},
        },
    )


def _math_intermediate(topic, sequence_number):
    family = _topic_family(topic.code)

    if family == "math_arithmetic":
        def order_of_operations():
            base = 80 + 3 * sequence_number
            expression = f"{base} - 2 x 7 + 18 / 3"
            answer = base - 14 + 6
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": f"Evaluate {expression} using the correct order of operations.",
                    "explanation": f"Compute multiplication and division first: {base} - 14 + 6 = {answer}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(answer), str((base - 2) * 7 + 6), str(base - 2 * (7 + 18) / 3), str(base - 2 * 7 + 18)],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_order_of_operations"},
                },
            )

        def discount_purchase():
            price = 240 + 10 * (sequence_number % 6)
            discount = 20 + 5 * (sequence_number % 3)
            saved = price * discount // 100
            pay = price - saved
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A school bag costs ₹{price}. During a sale, a discount of {discount}% is offered. "
                        "How much does the customer pay?"
                    ),
                    "explanation": f"Discount = ₹{saved}, so amount paid = ₹{price} - ₹{saved} = ₹{pay}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(pay), str(saved), str(price + saved), str(price - discount)],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_arithmetic_discount"},
                },
            )

        return _pick_variant(sequence_number, [order_of_operations, discount_purchase])

    if family == "math_fractions":
        def remaining_fraction():
            denominator = 3 + (sequence_number % 4)
            whole = denominator * (6 + (sequence_number % 4))
            fraction = (2 + (sequence_number % 2), denominator)
            remaining_num = fraction[1] - fraction[0]
            correct = whole * remaining_num // fraction[1]
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A rope is {whole} m long. If {fraction[0]}/{fraction[1]} of it is used, "
                        f"how many metres remain?"
                    ),
                    "explanation": (
                        f"The unused part is {remaining_num}/{fraction[1]} of {whole}, which is {correct} m."
                    ),
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(correct - 2), str(correct), str(whole * fraction[0] // fraction[1]), str(whole - fraction[0])],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "olympiad_fraction_remaining"},
                },
            )

        def class_pizza_share():
            slices = 24 + 6 * (sequence_number % 3)
            fraction_num = 1 + (sequence_number % 3)
            fraction_den = 4
            eaten = slices * fraction_num // fraction_den
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"At a class celebration, {fraction_num}/{fraction_den} of {slices} pizza slices were eaten. "
                        "How many slices were eaten?"
                    ),
                    "explanation": f"{fraction_num}/{fraction_den} of {slices} = {eaten}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(eaten - 2), str(eaten), str(slices - eaten), str(slices // fraction_den)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_fraction_share"},
                },
            )

        def compare_fraction_context():
            water_a = 2 + (sequence_number % 3)
            water_b = water_a + 1
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"One bottle is {water_a}/5 full and another is {water_b}/6 full. "
                        "Which bottle contains more water?"
                    ),
                    "explanation": "Compare the actual fractional quantities rather than only numerators.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        ["The second bottle", "The first bottle", "Both contain the same amount", "It cannot be compared"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_fraction_compare_context"},
                },
            )

        def misconception_fraction():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student says that 3/8 is greater than 1/2 because 3 is greater than 1. "
                        "Which is the best correction?"
                    ),
                    "explanation": "Fractions must be compared as parts of wholes, not by numerators alone.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Fractions should be compared by their full values, not only numerators.",
                            "Any fraction with numerator 3 is always greater than 1/2.",
                            "A larger numerator always means a larger fraction.",
                            "Only denominators matter while comparing fractions.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "misconception_correction_fraction"},
                },
            )

        return _pick_variant(sequence_number, [remaining_fraction, class_pizza_share, compare_fraction_context, misconception_fraction])

    if family == "math_algebra":
        def linear_setup():
            x = 4 + (sequence_number % 5)
            y = x + 3
            total = 3 * x + 2 * y
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"Two numbers differ by 3. If three times the smaller plus two times the larger is "
                        f"{total}, what is the smaller number?"
                    ),
                    "explanation": f"Let the smaller number be x. Then 3x + 2(x + 3) = {total}, so x = {x}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(x - 1), str(x), str(x + 1), str(y)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "olympiad_linear_setup"},
                },
            )

        def taxi_fare():
            rides = 3 + (sequence_number % 4)
            fare = 25 + 5 * (sequence_number % 3)
            fixed = 40
            total = fixed + rides * fare
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": (
                        f"A taxi charges a fixed booking fee of ₹{fixed} and ₹{fare} per kilometre. "
                        f"What is the total fare for {rides} km?"
                    ),
                    "explanation": f"Total fare = ₹{fixed} + ₹{fare} x {rides} = ₹{total}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "metadata": {
                        "accepted_answers": [str(total), f"₹{total}"],
                        "question_pattern": "practical_algebra_taxi_fare",
                    },
                },
            )

        return _pick_variant(sequence_number, [linear_setup, taxi_fare])

    if family == "math_numbers":
        def divisibility_truth():
            number = 4 + (sequence_number % 4)
            square = number * number
            cube = number * number * number
            return (
                QuestionType.TRUE_FALSE,
                {
                    "question_text": (
                        f"True or False: For the number {number}, the difference between its cube and its square "
                        f"is divisible by {number}."
                    ),
                    "explanation": f"{cube} - {square} = {square * (number - 1)}, which is divisible by {number}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": true_false_options(is_true=True),
                    "metadata": {"question_pattern": "olympiad_divisibility_truth"},
                },
            )

        def greatest_number_from_digits():
            digits = [7, 0, 5, 3 + (sequence_number % 3)]
            greatest = int("".join(map(str, sorted(digits, reverse=True))))
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"Using the digits {', '.join(map(str, digits))} exactly once, "
                        "which is the greatest 4-digit number that can be formed?"
                    ),
                    "explanation": f"Arrange digits in descending order to get {greatest}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(greatest), str(int(''.join(map(str, sorted(digits))))), str(greatest - 9), str(greatest - 90)],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_number_greatest_formed"},
                },
            )

        def international_place_value():
            millions = 2 + (sequence_number % 5)
            thousands = 35 + (sequence_number % 10)
            number = millions * 1000000 + thousands * 1000 + 204
            answer = millions * 1000000
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"In the number {number:,}, what is the value of the digit in the millions place?"
                    ),
                    "explanation": f"The digit in the millions place represents {answer}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(millions), str(answer), str(thousands * 1000), str(answer * 10)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_number_millions_place"},
                },
            )

        return _pick_variant(
            sequence_number,
            [divisibility_truth, greatest_number_from_digits, international_place_value],
        )

    if family == "math_logic":
        def pattern_total():
            a = 1 + (sequence_number % 4)
            b = a + 2
            c = b + 3
            total = a + b + c
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": (
                        f"Three consecutive puzzle scores increase by 2 and then by 3. "
                        f"If the smallest score is {a}, what is the total of the three scores?"
                    ),
                    "explanation": f"The scores are {a}, {b}, and {c}, so their total is {total}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "metadata": {
                        "accepted_answers": [str(total)],
                        "question_pattern": "olympiad_pattern_total",
                    },
                },
            )

        def rule_identification():
            start = 2 + (sequence_number % 4)
            sequence = [start, start + 5, start + 10, start + 15]
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"Which rule matches the pattern {sequence[0]}, {sequence[1]}, {sequence[2]}, {sequence[3]}?"
                    ),
                    "explanation": "The numbers increase by 5 each time.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        ["Add 5 each time", "Multiply by 2 each time", "Subtract 5 each time", "Add 2 and then 3 alternately"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_logic_rule_identification"},
                },
            )

        def arrangement_logic():
            rows = 3 + (sequence_number % 3)
            seats_each = 4 + (sequence_number % 2)
            total = rows * seats_each
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A school arranges {rows} rows with {seats_each} seats in each row for a quiz. "
                        "How many seats are arranged in total?"
                    ),
                    "explanation": f"Multiply rows by seats per row: {rows} x {seats_each} = {total}.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [str(total - rows), str(total), str(total + seats_each), str(rows + seats_each)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "practical_logic_arrangement_case"},
                },
            )

        return _pick_variant(sequence_number, [pattern_total, rule_identification, arrangement_logic])

    angle = 30 + 5 * (sequence_number % 6)
    exterior = 180 - angle
    return (
        QuestionType.MCQ_SINGLE,
        {
            "question_text": (
                f"An exterior angle of a triangle is {exterior} degrees. "
                f"If one remote interior angle is {angle} degrees, what is the other remote interior angle?"
            ),
            "explanation": (
                f"Exterior angle = sum of remote interior angles, so the other angle is "
                f"{exterior} - {angle} = {exterior - angle} degrees."
            ),
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.25"),
            "difficulty_level": TopicDifficulty.INTERMEDIATE,
            "options": ordered_options(
                [str(exterior - angle - 5), str(exterior - angle), str(angle), str(exterior)],
                correct_index=1,
            ),
            "metadata": {"question_pattern": "olympiad_triangle_reasoning"},
        },
    )


def _math_advanced(topic, sequence_number):
    family = _topic_family(topic.code)

    if family == "math_arithmetic":
        number = 200 + 5 * sequence_number
        q, r = divmod(number, 9)
        options = [
            {"option_text": f"The remainder when {number} is divided by 9 is {r}.", "is_correct": True},
            {"option_text": f"The quotient when {number} is divided by 9 is {q}.", "is_correct": True},
            {"option_text": f"{number} is divisible by 9.", "is_correct": r == 0},
            {"option_text": f"The digit sum of {number} is 9.", "is_correct": sum(map(int, str(number))) == 9},
        ]
        return (
            QuestionType.MCQ_MULTIPLE,
            {
                "question_text": f"Select all statements that are true about the number {number}.",
                "explanation": "Check each claim using division and digit-sum reasoning.",
                "default_marks": Decimal("3.00"),
                "negative_marks": Decimal("0.50"),
                "difficulty_level": TopicDifficulty.ADVANCED,
                "options": options,
                "metadata": {"question_pattern": "olympiad_arithmetic_multi_truth"},
            },
        )

    if family == "math_fractions":
        def fraction_composite():
            a = 1 + (sequence_number % 3)
            b = a + 2
            c = b + 2
            numerator = a + c
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"If x = {a}/{b} and y = {b}/{c}, what is the value of x + 1/y?"
                    ),
                    "explanation": f"1/y = {c}/{b}, so x + 1/y = {a}/{b} + {c}/{b} = {numerator}/{b}.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            f"{numerator}/{b}",
                            f"{numerator + 1}/{b}",
                            f"{a + b}/{c}",
                            f"{a + c}/{c}",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_fraction_composite"},
                },
            )

        def fraction_case_decision():
            whole = 48 + 12 * (sequence_number % 3)
            used = 2 + (sequence_number % 3)
            total_parts = 5 + (sequence_number % 2)
            remaining = whole * (total_parts - used) // total_parts
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A canteen had {whole} juice cartons. If {used}/{total_parts} of them were sold in the morning, "
                        "how many cartons remained?"
                    ),
                    "explanation": f"The remaining part is {total_parts - used}/{total_parts} of {whole}, which is {remaining}.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [str(remaining), str(whole * used // total_parts), str(remaining + total_parts), str(whole - used)],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "fraction_case_based_decision"},
                },
            )

        def fraction_multiselect_truths():
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": (
                        "Select all statements that are correct about fractions."
                    ),
                    "explanation": "Fractions can be compared, simplified, and interpreted as equal parts of a whole.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": [
                        {"option_text": "Equivalent fractions represent the same value.", "is_correct": True},
                        {"option_text": "A larger denominator always means a larger fraction.", "is_correct": False},
                        {"option_text": "Fractions can represent parts of a set or a whole.", "is_correct": True},
                        {"option_text": "1/2 and 2/4 represent different values.", "is_correct": False},
                    ],
                    "metadata": {"question_pattern": "fraction_multiselect_truths"},
                },
            )

        def assertion_reason_fraction():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Assertion (A): 2/4 and 1/2 are equal fractions. "
                        "Reason (R): Both represent the same part of a whole.\n\n"
                        "Choose the correct option."
                    ),
                    "explanation": "Both statements are true, and the reason correctly explains the assertion.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Both A and R are true, and R is the correct explanation of A.",
                            "Both A and R are true, but R is not the correct explanation of A.",
                            "A is true, but R is false.",
                            "A is false, but R is true.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "assertion_reason_fraction"},
                },
            )

        return _pick_variant(sequence_number, [fraction_composite, fraction_case_decision, fraction_multiselect_truths, assertion_reason_fraction])

    if family == "math_algebra":
        n = 3 + (sequence_number % 4)
        return (
            QuestionType.MCQ_SINGLE,
            {
                "question_text": (
                    f"For n = {n}, what is the value of n(n + 2) - (n - 1)(n + 1)?"
                ),
                "explanation": "Expand both products or substitute directly to compare them carefully.",
                "default_marks": Decimal("3.00"),
                "negative_marks": Decimal("0.50"),
                "difficulty_level": TopicDifficulty.ADVANCED,
                "options": ordered_options(
                    [str(2 * n - 1), str(2 * n + 1), str(2 * n), str(n + 1)],
                    correct_index=1,
                ),
                "metadata": {"question_pattern": "olympiad_algebra_identity"},
            },
        )

    if family == "math_numbers":
        def consecutive_even_product():
            a = 10 + sequence_number
            b = a + 2
            c = a + 4
            product = a * b * c
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": (
                        f"Three consecutive even numbers are {a}, {b}, and {c}. "
                        f"What is the value of their product?"
                    ),
                    "explanation": f"The product is {a} x {b} x {c} = {product}.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "metadata": {
                        "accepted_answers": [str(product)],
                        "question_pattern": "olympiad_even_product",
                    },
                },
            )

        def indian_international_compare():
            number = 43852671 + 1111 * sequence_number
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"Which option correctly expresses {number:,} in the Indian system?"
                    ),
                    "explanation": (
                        "Place commas from the right: first after three digits, then after every two digits."
                    ),
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            f"{number // 10000000} crore {(number // 100000) % 100} lakh {(number // 1000) % 100} thousand {number % 1000}",
                            f"{number // 1000000} million {(number // 1000) % 1000} thousand {number % 1000}",
                            f"{number // 100000} lakh {(number // 1000) % 100} thousand {number % 1000}",
                            f"{number // 10000000} crore {(number // 100000) % 10} lakh {number % 100000}",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_number_indian_conversion"},
                },
            )

        def statement_set():
            number = 72036 + 9 * sequence_number
            digit_sum = sum(map(int, str(number)))
            options = [
                {"option_text": f"The sum of the digits of {number} is {digit_sum}.", "is_correct": True},
                {"option_text": f"{number} is an even number.", "is_correct": number % 2 == 0},
                {"option_text": f"The predecessor of {number} is {number + 1}.", "is_correct": False},
                {"option_text": f"The digit 3 is in the tens place in {number}.", "is_correct": str(number)[-2] == '3'},
            ]
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": f"Select all true statements about the number {number}.",
                    "explanation": "Check digit sum, parity, predecessor, and place value one by one.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": options,
                    "metadata": {"question_pattern": "advanced_number_multi_truth"},
                },
            )

        return _pick_variant(
            sequence_number,
            [consecutive_even_product, indian_international_compare, statement_set],
        )

    if family == "math_logic":
        def second_difference():
            first = 2 + (sequence_number % 4)
            sequence = [first, first + 2, first + 6, first + 12]
            next_term = sequence[-1] + 8
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A sequence is {sequence[0]}, {sequence[1]}, {sequence[2]}, {sequence[3]}, ... "
                        "Each jump increases by 2. What is the next term?"
                    ),
                    "explanation": "The jumps are 2, 4, 6, so the next jump is 8.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [str(next_term - 2), str(next_term), str(next_term + 2), str(sequence[-1] + 10)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "olympiad_second_difference"},
                },
            )

        def logic_multiselect():
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": (
                        "Select all statements that correctly describe number patterns."
                    ),
                    "explanation": "Patterns can grow by a constant amount or by changing steps; the rule must fit all terms.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": [
                        {"option_text": "A pattern may increase by equal differences.", "is_correct": True},
                        {"option_text": "A rule should match all terms in the sequence.", "is_correct": True},
                        {"option_text": "Any random numbers automatically form the same pattern.", "is_correct": False},
                        {"option_text": "Patterns cannot be represented in tables.", "is_correct": False},
                    ],
                    "metadata": {"question_pattern": "pattern_multiselect_truths"},
                },
            )

        def code_style_logic():
            base = 3 + (sequence_number % 4)
            coded = base * 2 + 1
            next_number = base + 2
            next_code = next_number * 2 + 1
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"In a code, a number is changed by doubling it and adding 1. "
                        f"If {base} becomes {coded}, what will {next_number} become?"
                    ),
                    "explanation": f"Double {next_number} and add 1 to get {next_code}.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [str(next_code - 1), str(next_code), str(next_code + 1), str(next_number * 2)],
                        correct_index=1,
                    ),
                    "metadata": {"question_pattern": "cryptarithm_or_code_style"},
                },
            )

        def short_answer_logic():
            start = 4 + (sequence_number % 3)
            sequence = [start, start + 3, start + 8]
            next_term = sequence[-1] + 7
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": (
                        f"A pattern starts as {sequence[0]}, {sequence[1]}, {sequence[2]}. "
                        "If the jumps keep increasing by 2, what is the next number?"
                    ),
                    "explanation": f"The jumps are 3 and 5, so the next jump is 7, giving {next_term}.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "metadata": {
                        "accepted_answers": [str(next_term)],
                        "question_pattern": "short_answer_logic_extension",
                    },
                },
            )

        return _pick_variant(sequence_number, [second_difference, logic_multiselect, code_style_logic, short_answer_logic])

    side = 4 + (sequence_number % 5)
    area_square = side * side
    triangle_area = area_square // 2
    return (
        QuestionType.MCQ_SINGLE,
        {
            "question_text": (
                f"A square has side {side} cm. A diagonal divides it into two congruent triangles. "
                f"What is the area of one triangle?"
            ),
            "explanation": (
                f"The square area is {area_square} square cm, so each triangle has area {triangle_area} square cm."
            ),
            "default_marks": Decimal("3.00"),
            "negative_marks": Decimal("0.50"),
            "difficulty_level": TopicDifficulty.ADVANCED,
            "options": ordered_options(
                [str(triangle_area - 1), str(triangle_area), str(area_square), str(side * 2)],
                correct_index=1,
            ),
            "metadata": {"question_pattern": "olympiad_area_partition"},
        },
    )


def build_math_payload(*, topic, difficulty_level, sequence_number):
    if difficulty_level == TopicDifficulty.FOUNDATION:
        return _math_foundation(topic, sequence_number)
    if difficulty_level == TopicDifficulty.INTERMEDIATE:
        return _math_intermediate(topic, sequence_number)
    return _math_advanced(topic, sequence_number)


def _science_foundation(topic, sequence_number):
    family = _topic_family(topic.code)

    if family == "science_matter":
        def litmus_indicator():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Blue litmus paper turns red in one liquid and remains blue in another. "
                        "What can you conclude about the first liquid?"
                    ),
                    "explanation": "Turning blue litmus red shows that the liquid is acidic.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["It is acidic.", "It is basic.", "It is neutral.", "It is metallic."],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_matter_indicator"},
                },
            )

        def kitchen_change():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Which of the following is a chemical change that commonly happens in a kitchen?"
                    ),
                    "explanation": "Cooking food forms new substances, so it is a chemical change.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["Cooking rice", "Cutting an apple", "Melting ice", "Breaking chalk"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_matter_kitchen_change"},
                },
            )

        def material_use():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why is copper commonly used for electrical wiring in homes?"
                    ),
                    "explanation": "Copper is a good conductor of electricity.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["It conducts electricity well.", "It absorbs all heat instantly.", "It is always non-metallic.", "It dissolves in water easily."],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "material_use_selection"},
                },
            )

        def acid_base_everyday():
            return (
                QuestionType.TRUE_FALSE,
                {
                    "question_text": "True or False: Soap solution is generally basic in nature.",
                    "explanation": "Soap solution usually shows basic behavior.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": true_false_options(is_true=True),
                    "metadata": {"question_pattern": "acid_base_everyday_example"},
                },
            )

        return _pick_variant(sequence_number, [litmus_indicator, kitchen_change, material_use, acid_base_everyday])

    if family == "science_health":
        def health_stage_identification():
            age = 11 + (sequence_number % 4)
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"A student aged {age} notices rapid height increase and voice changes. "
                        "Which stage best explains these changes?"
                    ),
                    "explanation": "These are typical changes associated with adolescence.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["Adolescence", "Old age", "Infancy", "Dormancy"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "health_stage_identification"},
                },
            )

        def healthy_habit_selection():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Which daily habit best supports healthy growth during adolescence?"
                    ),
                    "explanation": "Healthy growth depends on balanced food, rest, and regular physical activity.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["Eating balanced meals and sleeping on time", "Skipping breakfast every day", "Sleeping very little to study more", "Avoiding all outdoor activity"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "healthy_habit_selection"},
                },
            )

        def nutrient_need_basic():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A growing adolescent feels tired after skipping breakfast. Which nutrient group is the quickest source of energy?"
                    ),
                    "explanation": "Carbohydrates are the main quick source of energy for the body.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["Carbohydrates", "Minerals", "Water", "Fibre only"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "basic_nutrient_need"},
                },
            )

        def hygiene_basic():
            return (
                QuestionType.TRUE_FALSE,
                {
                    "question_text": "True or False: Good personal hygiene becomes especially important during adolescence.",
                    "explanation": "Body changes during adolescence make hygiene and self-care more important.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": true_false_options(is_true=True),
                    "metadata": {"question_pattern": "personal_hygiene_basics"},
                },
            )

        return _pick_variant(
            sequence_number,
            [health_stage_identification, healthy_habit_selection, nutrient_need_basic, hygiene_basic],
        )

    if family == "science_space":
        def reflection():
            return (
                QuestionType.TRUE_FALSE,
                {
                    "question_text": (
                        "True or False: The Moon appears bright mainly because it reflects sunlight."
                    ),
                    "explanation": "The Moon does not produce its own light; it reflects sunlight.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": true_false_options(is_true=True),
                    "metadata": {"question_pattern": "olympiad_space_reflection"},
                },
            )

        def source_of_daylight():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Which celestial body is the main natural source of light and heat for Earth?"
                    ),
                    "explanation": "The Sun is the main natural source of light and heat for Earth.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["The Sun", "The Moon", "Mars", "A distant star cluster"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_space_source_of_daylight"},
                },
            )

        def phase_visibility():
            visible = 1 + (sequence_number % 4)
            names = {
                1: "a small curved part",
                2: "half of its face",
                3: "more than half but not full",
                4: "its full round face",
            }
            answers = {
                1: "Crescent phase",
                2: "Half-moon phase",
                3: "Gibbous phase",
                4: "Full moon phase",
            }
            correct = answers[visible]
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"On a certain night, a student observes {names[visible]} of the Moon. "
                        "Which option best describes this observation?"
                    ),
                    "explanation": f"That description matches the {correct.lower()}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [correct, "Solar eclipse", "No moonlight", "Planetary shadow"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_space_phase_visibility"},
                },
            )

        return _pick_variant(sequence_number, [reflection, source_of_daylight, phase_visibility])

    if family == "science_physics":
        def close_switch():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A bulb glows only when a switch is closed in a simple circuit. "
                        "What does closing the switch do?"
                    ),
                    "explanation": "Closing the switch completes the circuit, allowing current to flow.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [
                            "It completes the circuit.",
                            "It removes the cell from the circuit.",
                            "It changes the bulb into a conductor.",
                            "It stops all charges from moving.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_physics_circuit"},
                },
            )

        def conductor_choice():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student wants to connect a simple electric circuit at home for a model. "
                        "Which material is most suitable for the connecting wire?"
                    ),
                    "explanation": "Metals like copper conduct electricity well.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["Copper", "Rubber", "Plastic", "Dry wood"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_physics_conductor_choice"},
                },
            )

        def light_shadow_basic():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why is a shadow formed when an opaque object is placed in the path of light?"
                    ),
                    "explanation": "An opaque object blocks light, so a shadow forms behind it.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        ["Because the object blocks light", "Because the object creates new light", "Because air stops moving", "Because light becomes a solid"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "light_shadow_basics"},
                },
            )

        return _pick_variant(sequence_number, [close_switch, conductor_choice, light_shadow_basic])

    if family == "science_life":
        def root_hair_absorption():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why do root hair cells help a plant more than smooth root cells during water absorption?"
                    ),
                    "explanation": "Root hairs increase surface area, so absorption becomes more effective.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [
                            "They provide larger surface area for absorption.",
                            "They produce food for the plant.",
                            "They transport oxygen to leaves directly.",
                            "They convert water into minerals.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_life_surface_area"},
                },
            )

        def lunch_break_breathing():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "During a race, a student starts breathing faster than usual. Why does this happen?"
                    ),
                    "explanation": "The body needs more oxygen and must remove carbon dioxide faster during exercise.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.FOUNDATION,
                    "options": ordered_options(
                        [
                            "The body needs more oxygen for energy release.",
                            "The lungs stop working normally.",
                            "Blood stops carrying gases.",
                            "The heart stops pumping.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_life_breathing_rate"},
                },
            )

        return _pick_variant(sequence_number, [root_hair_absorption, lunch_break_breathing])

    return (
        QuestionType.MCQ_SINGLE,
        {
            "question_text": (
                "A cyclist covers equal distances in unequal time intervals. "
                "Which quantity must be compared to decide whether the motion is uniform?"
            ),
            "explanation": "Uniform motion is decided by comparing distance covered per unit time.",
            "default_marks": Decimal("1.00"),
            "negative_marks": Decimal("0.25"),
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "options": ordered_options(
                ["Speed in each interval", "Colour of the bicycle", "Direction of sunlight", "Type of road sign"],
                correct_index=0,
            ),
            "metadata": {"question_pattern": "olympiad_motion_uniformity"},
        },
    )


def _science_intermediate(topic, sequence_number):
    family = _topic_family(topic.code)

    if family == "science_matter":
        def neutralisation():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student mixes an acid and a base until the indicator shows neutrality. "
                        "Which process has most likely taken place?"
                    ),
                    "explanation": "Acid and base reacting to form a neutral solution indicates neutralisation.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        ["Neutralisation", "Sublimation", "Condensation", "Rusting"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_matter_neutralisation"},
                },
            )

        def antacid_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why is an antacid often given to a person suffering from acidity?"
                    ),
                    "explanation": "An antacid is basic in nature and helps neutralise excess acid in the stomach.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "It neutralises excess stomach acid.",
                            "It increases the acid content further.",
                            "It freezes the stomach lining.",
                            "It converts acid into metal.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_matter_antacid_reasoning"},
                },
            )

        def material_property_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why are the handles of many cooking utensils made from wood or plastic?"
                    ),
                    "explanation": "Wood and plastic are poor conductors of heat, so they help protect the hand.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "They are poor conductors of heat.",
                            "They increase the flame temperature.",
                            "They melt food faster.",
                            "They conduct electricity better than metals.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "material_property_reasoning"},
                },
            )

        def compare_changes():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "One student melts ice, while another burns paper. Which statement is correct?"
                    ),
                    "explanation": "Melting ice is a physical change, while burning paper is a chemical change.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Melting ice is physical, but burning paper is chemical.",
                            "Both are only physical changes.",
                            "Both are only chemical changes.",
                            "Burning paper is physical, but melting ice is chemical.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "physical_vs_chemical_compare"},
                },
            )

        return _pick_variant(sequence_number, [neutralisation, antacid_reasoning, material_property_reasoning, compare_changes])

    if family == "science_health":
        def nutrition_cause_effect():
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": (
                        "A teenager skips meals and feels weak during sports practice. "
                        "Which nutrient group should be improved first for energy supply?"
                    ),
                    "explanation": "Carbohydrates are the body's main quick source of energy.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "metadata": {
                        "accepted_answers": ["carbohydrates", "Carbohydrates", "carbohydrate", "Carbohydrate"],
                        "question_pattern": "nutrition_cause_effect",
                    },
                },
            )

        def routine_comparison():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Rohan sleeps on time, eats balanced meals, and exercises regularly. "
                        "Karan sleeps late, skips breakfast, and avoids physical activity. "
                        "Whose routine is more likely to support healthy adolescent growth?"
                    ),
                    "explanation": "A balanced routine with proper food, rest, and exercise supports healthier growth.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        ["Rohan's routine", "Karan's routine", "Both are equally healthy", "It depends only on age"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "routine_comparison_growth"},
                },
            )

        def misconception_correction():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A classmate says that exercise alone is enough for healthy growth during adolescence. "
                        "Which is the best correction?"
                    ),
                    "explanation": "Healthy growth depends on exercise along with balanced meals, sleep, and hygiene.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Healthy growth needs exercise, proper food, sleep, and hygiene together.",
                            "Exercise is the only important factor during adolescence.",
                            "Sleep and food do not matter if exercise is done.",
                            "Only hygiene matters during adolescence.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "misconception_correction_health"},
                },
            )

        def hygiene_decision():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "After football practice, a student returns home sweaty and tired. "
                        "Which action best supports personal hygiene?"
                    ),
                    "explanation": "Cleaning the body and changing into fresh clothes supports hygiene during adolescence.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Take a bath and change into clean clothes.",
                            "Sleep in the same sweaty clothes.",
                            "Skip drinking water and rest.",
                            "Avoid washing until the next day.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "hygiene_decision_scenario"},
                },
            )

        return _pick_variant(
            sequence_number,
            [nutrition_cause_effect, routine_comparison, misconception_correction, hygiene_decision],
        )

    if family == "science_space":
        def same_face():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why do we usually see the same side of the Moon from Earth?"
                    ),
                    "explanation": (
                        "The Moon takes the same time to rotate on its axis as it takes to revolve around Earth."
                    ),
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Its rotation period equals its revolution period around Earth.",
                            "It does not rotate at all.",
                            "Clouds hide the other side permanently.",
                            "Earth's gravity removes its rotation every night.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_space_same_face"},
                },
            )

        def time_of_day_reasoning():
            city = ["Delhi", "Jaipur", "Lucknow", "Bhopal"][sequence_number % 4]
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        f"In {city}, the Sun appears to rise in the east and set in the west every day. "
                        "Which movement causes this daily pattern?"
                    ),
                    "explanation": "Earth's rotation on its axis causes the apparent daily movement of the Sun.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Earth's rotation on its axis",
                            "The Moon's rotation on its axis",
                            "Earth standing still in space",
                            "The Sun revolving around the Moon",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_space_day_night_reasoning"},
                },
            )

        def phase_after_full_moon():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student observes a full moon tonight. Which lunar appearance is most likely to be seen a few nights later?"
                    ),
                    "explanation": "After a full moon, the visible illuminated part slowly starts decreasing.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "A gibbous moon with slightly less illuminated part",
                            "A solar eclipse",
                            "A completely invisible Moon forever",
                            "The Moon changing into a star",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_space_phase_after_full_moon"},
                },
            )

        return _pick_variant(sequence_number, [same_face, time_of_day_reasoning, phase_after_full_moon])

    if family == "science_physics":
        def circuit_failure():
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": (
                        "Select all changes that would definitely make a simple bulb circuit fail to glow."
                    ),
                    "explanation": "The bulb fails when the circuit is open or a required conducting part is missing.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": [
                        {"option_text": "A wire is disconnected from the cell.", "is_correct": True},
                        {"option_text": "The switch is left open.", "is_correct": True},
                        {"option_text": "The cell is correctly connected but a brighter bulb is used.", "is_correct": False},
                        {"option_text": "The metal contacts of the bulb do not touch the circuit.", "is_correct": True},
                    ],
                    "metadata": {"question_pattern": "olympiad_physics_circuit_failure"},
                },
            )

        def heat_transfer_scene():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A steel spoon and a plastic spoon are kept in hot tea for the same time. "
                        "Which spoon is likely to feel hotter to touch, and why?"
                    ),
                    "explanation": "Steel conducts heat faster than plastic, so it feels hotter.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "The steel spoon, because steel is a better conductor of heat.",
                            "The plastic spoon, because plastic attracts heat.",
                            "Both equally, because all solids conduct heat equally.",
                            "Neither, because heat cannot travel through solids.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_physics_spoon_heat"},
                },
            )

        def electricity_decision():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student connects a cell, bulb, and switch, but the bulb does not glow. "
                        "Which should be checked first?"
                    ),
                    "explanation": "A complete and proper connection is the first thing to check in a simple circuit.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Whether all wire connections are complete",
                            "Whether the bulb is painted brightly",
                            "Whether the table is wooden",
                            "Whether the room lights are on",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_electricity_decision"},
                },
            )

        def shadow_change():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why does the length of a shadow change at different times of the day?"
                    ),
                    "explanation": "The position of the Sun changes during the day, affecting the shadow formed.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "Because the position of the Sun changes in the sky",
                            "Because shadows absorb electricity",
                            "Because objects become lighter at noon",
                            "Because air changes into light",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "shadow_change_scenario"},
                },
            )

        return _pick_variant(sequence_number, [circuit_failure, heat_transfer_scene, electricity_decision, shadow_change])

    if family == "science_life":
        def root_damage():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A plant is kept in sunlight but its roots are damaged badly. "
                        "Which process is likely to be affected first?"
                    ),
                    "explanation": "Damaged roots reduce water absorption, which quickly affects plant functioning.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        ["Water absorption", "Reflection of light", "Production of sound", "Rotation of flowers"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_life_root_damage"},
                },
            )

        def pulse_rate_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Why does a person's pulse rate usually increase after climbing several stairs quickly?"
                    ),
                    "explanation": "The body needs faster transport of oxygen and nutrients during extra physical effort.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "The heart pumps faster to meet increased body demand.",
                            "The blood stops flowing to the muscles.",
                            "The lungs stop supplying oxygen.",
                            "The body no longer needs energy.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "practical_life_pulse_rate"},
                },
            )

        return _pick_variant(sequence_number, [root_damage, pulse_rate_reasoning])

    if family == "science_motion":
        def same_distance_compare():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Two toy cars travel the same distance, but one takes half the time of the other. "
                        "What can be concluded?"
                    ),
                    "explanation": "For the same distance, taking less time means having greater speed.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        [
                            "The faster car has greater speed.",
                            "Both cars have equal speed.",
                            "The slower car has greater speed.",
                            "Speed cannot be compared without colour information.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "same_distance_compare_speed"},
                },
            )

        def table_reading():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A cyclist covers 10 m in the first second, 20 m in the next second, and 30 m in the third second. "
                        "What does this show about the motion?"
                    ),
                    "explanation": "Unequal distances in equal time intervals show non-uniform motion.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        ["The motion is non-uniform.", "The motion is uniform.", "The cyclist is standing still.", "Only the colour of the bicycle matters."],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "table_based_motion_reading"},
                },
            )

        def same_time_compare():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Two runners run for the same amount of time. One covers 200 m and the other covers 260 m. "
                        "Who is faster?"
                    ),
                    "explanation": "For the same time, the runner covering more distance has greater speed.",
                    "default_marks": Decimal("2.00"),
                    "negative_marks": Decimal("0.25"),
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "options": ordered_options(
                        ["The runner covering 260 m", "The runner covering 200 m", "Both are equally fast", "Speed cannot be compared"],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "same_time_compare_distance"},
                },
            )

        return _pick_variant(sequence_number, [same_distance_compare, table_reading, same_time_compare])

    return (
        QuestionType.MCQ_SINGLE,
        {
            "question_text": (
                "A plant is kept in sunlight but its roots are damaged badly. "
                "Which process is likely to be affected first?"
            ),
            "explanation": "Damaged roots reduce water absorption, which quickly affects plant functioning.",
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.25"),
            "difficulty_level": TopicDifficulty.INTERMEDIATE,
            "options": ordered_options(
                ["Water absorption", "Reflection of light", "Production of sound", "Rotation of flowers"],
                correct_index=0,
            ),
            "metadata": {"question_pattern": "olympiad_life_root_damage"},
        },
    )


def _science_advanced(topic, sequence_number):
    family = _topic_family(topic.code)

    if family == "science_matter":
        def rusting_assertion():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Assertion (A): Rusting of iron is a chemical change. "
                        "Reason (R): A new substance with properties different from iron is formed.\n\n"
                        "Choose the correct option."
                    ),
                    "explanation": "Rusting forms iron oxide, which is a new substance, so both statements are true.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Both A and R are true, and R is the correct explanation of A.",
                            "Both A and R are true, but R is not the correct explanation of A.",
                            "A is true, but R is false.",
                            "A is false, but R is true.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "assertion_reason"},
                },
            )

        def material_test_multiselect():
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": (
                        "A student wants to identify an unknown white powder in the lab. "
                        "Select all observations that would support the conclusion that it is basic in nature."
                    ),
                    "explanation": "Bases turn red litmus blue and may feel soapy; they do not turn blue litmus red.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": [
                        {"option_text": "It turns red litmus paper blue.", "is_correct": True},
                        {"option_text": "It feels slippery in dilute solution.", "is_correct": True},
                        {"option_text": "It turns blue litmus paper red.", "is_correct": False},
                        {"option_text": "It must be a metal because it is white.", "is_correct": False},
                    ],
                    "metadata": {"question_pattern": "advanced_matter_base_identification"},
                },
            )

        def case_based_chemical_change():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student leaves an iron nail in a damp corner for many days and notices a reddish-brown layer on it. "
                        "Which conclusion is most appropriate?"
                    ),
                    "explanation": "The reddish-brown layer is rust, showing a chemical change has taken place.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "A chemical change has occurred because a new substance formed.",
                            "Only a physical shape change occurred.",
                            "The nail has become a source of light.",
                            "The layer formed because of simple melting.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "case_based_chemical_change"},
                },
            )

        def advanced_material_selection():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A school workshop needs a material for the outer handle of a soldering tool so that students can hold it safely. "
                        "Which property is most important?"
                    ),
                    "explanation": "The handle should be a poor conductor of heat so it remains safer to hold.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Being a poor conductor of heat",
                            "Melting quickly in warmth",
                            "Conducting electricity strongly",
                            "Being shiny like a metal",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_material_selection"},
                },
            )

        return _pick_variant(sequence_number, [rusting_assertion, material_test_multiselect, case_based_chemical_change, advanced_material_selection])

    if family == "science_health":
        def advanced_multi_select_growth():
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": (
                        "Select all practices that would help an adolescent maintain healthy growth."
                    ),
                    "explanation": "Healthy growth depends on balanced diet, sleep, hygiene, and exercise.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": [
                        {"option_text": "Regular physical activity", "is_correct": True},
                        {"option_text": "Balanced meals", "is_correct": True},
                        {"option_text": "Sleeping very little every day", "is_correct": False},
                        {"option_text": "Maintaining personal hygiene", "is_correct": True},
                    ],
                    "metadata": {"question_pattern": "advanced_multi_select_growth"},
                },
            )

        def assertion_reason_growth():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Assertion (A): Adequate sleep is important during adolescence. "
                        "Reason (R): Sleep supports healthy growth and helps the body recover from daily activity.\n\n"
                        "Choose the correct option."
                    ),
                    "explanation": "Both statements are true, and the reason correctly explains why sleep is important.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Both A and R are true, and R is the correct explanation of A.",
                            "Both A and R are true, but R is not the correct explanation of A.",
                            "A is true, but R is false.",
                            "A is false, but R is true.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "assertion_reason_growth"},
                },
            )

        def case_based_health_priority():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A 13-year-old sleeps only 5 hours, skips breakfast, and spends all evening sitting indoors. "
                        "Which change should be improved first for healthier growth?"
                    ),
                    "explanation": "A balanced routine starts with correcting major lifestyle gaps such as proper food and sleep.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Start taking regular nutritious meals and improve sleep routine.",
                            "Avoid all physical activity completely.",
                            "Replace all meals with snacks.",
                            "Stay awake longer to study more.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "case_based_health_priority"},
                },
            )

        def short_answer_health_reason():
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": (
                        "Why is personal hygiene especially important during adolescence? Answer in a short phrase."
                    ),
                    "explanation": "Body changes during adolescence increase the need for cleanliness and self-care.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "metadata": {
                        "accepted_answers": [
                            "body changes increase the need for cleanliness",
                            "because body changes increase hygiene needs",
                            "to stay clean during body changes",
                            "because adolescence brings body changes",
                        ],
                        "question_pattern": "short_answer_health_reason",
                    },
                },
            )

        return _pick_variant(
            sequence_number,
            [advanced_multi_select_growth, assertion_reason_growth, case_based_health_priority, short_answer_health_reason],
        )

    if family == "science_space":
        def eclipse_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student says solar eclipses happen every new moon everywhere on Earth. "
                        "Which is the best correction?"
                    ),
                    "explanation": (
                        "A solar eclipse needs special alignment, and the Moon's shadow falls only on a limited region."
                    ),
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Special alignment is needed, and the Moon's shadow covers only part of Earth.",
                            "Every new moon causes a solar eclipse visible from all places.",
                            "Solar eclipses happen only at full moon.",
                            "Earth stops rotating during a solar eclipse.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_space_eclipse_reasoning"},
                },
            )

        def assertion_rotation_revolution():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Assertion (A): We usually see the same side of the Moon from Earth. "
                        "Reason (R): The Moon takes approximately the same time to rotate on its axis as it takes to revolve around Earth.\n\n"
                        "Choose the correct option."
                    ),
                    "explanation": "Both A and R are true, and the reason correctly explains the assertion.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Both A and R are true, and R is the correct explanation of A.",
                            "Both A and R are true, but R is not the correct explanation of A.",
                            "A is true, but R is false.",
                            "A is false, but R is true.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_space_assertion_same_face"},
                },
            )

        def eclipse_observer_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Two students in different cities discuss a solar eclipse. One student sees it, but the other does not. "
                        "What is the best explanation?"
                    ),
                    "explanation": (
                        "The Moon's shadow during a solar eclipse falls on only a limited part of Earth, so it is not visible from every location."
                    ),
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "The Moon's shadow reaches only some regions of Earth.",
                            "The Sun disappears only in one country by rule.",
                            "Earth becomes smaller in one city.",
                            "The Moon shines with different light in different cities.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_space_eclipse_visibility_region"},
                },
            )

        def phase_sequence_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Which sequence correctly shows one possible order of lunar phases during a month?"
                    ),
                    "explanation": "The illuminated portion changes gradually from new moon toward full moon and then decreases again.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "New moon → crescent → half moon → gibbous → full moon",
                            "Full moon → new moon → Sun → Earth → crescent",
                            "Half moon → eclipse → star → full moon → planet",
                            "Crescent → full moon → new moon → full moon in one day",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_space_phase_sequence"},
                },
            )

        return _pick_variant(
            sequence_number,
            [eclipse_reasoning, assertion_rotation_revolution, eclipse_observer_reasoning, phase_sequence_reasoning],
        )

    if family == "science_physics":
        def heat_conduction():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A metal spoon feels hotter than a wooden spoon kept in the same hot soup. "
                        "What is the best explanation?"
                    ),
                    "explanation": "Metal conducts heat more efficiently than wood, so it transfers heat to the hand faster.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Metal is a better conductor of heat.",
                            "Wood produces cold energy.",
                            "Metal always has a higher temperature than the soup.",
                            "Wood has no particles.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "olympiad_physics_heat_conduction"},
                },
            )

        def circuit_troubleshoot():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A model house has a cell, wires, switch, and bulb. The switch is closed, but the bulb does not glow. "
                        "Which is the most reasonable first check?"
                    ),
                    "explanation": "In a simple circuit, a loose or broken connection is a common first cause to check.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Check whether all wire connections are complete and tight.",
                            "Paint the bulb with a darker colour.",
                            "Remove the switch completely from the circuit.",
                            "Add cardboard between the wire and the cell.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_physics_circuit_troubleshoot"},
                },
            )

        def assertion_reason_physics():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Assertion (A): Metals are often used for making electric wires. "
                        "Reason (R): Metals are generally good conductors of electricity.\n\n"
                        "Choose the correct option."
                    ),
                    "explanation": "Both statements are true, and the reason correctly explains the assertion.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Both A and R are true, and R is the correct explanation of A.",
                            "Both A and R are true, but R is not the correct explanation of A.",
                            "A is true, but R is false.",
                            "A is false, but R is true.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "assertion_reason_physics"},
                },
            )

        def advanced_light_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A torch is switched on behind an opaque object. Which result is most likely on the wall in front of the object?"
                    ),
                    "explanation": "An opaque object blocks light and creates a shadow on the wall.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "A shadow of the object will be formed.",
                            "The object will become a source of light.",
                            "The wall will reflect electricity.",
                            "The shadow will disappear because of the torch.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_light_reasoning"},
                },
            )

        return _pick_variant(sequence_number, [heat_conduction, circuit_troubleshoot, assertion_reason_physics, advanced_light_reasoning])

    if family == "science_life":
        def stomata_assertion():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Assertion (A): Stomata are important for plants. "
                        "Reason (R): They help in gaseous exchange and also influence water loss.\n\n"
                        "Choose the correct option."
                    ),
                    "explanation": "Both statements are true, and the reason correctly explains the assertion.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Both A and R are true, and R is the correct explanation of A.",
                            "Both A and R are true, but R is not the correct explanation of A.",
                            "A is true, but R is false.",
                            "A is false, but R is true.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_life_stomata_assertion"},
                },
            )

        def root_shoot_function():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A potted plant is watered regularly, but its stem is tied so tightly that food transport from leaves is disturbed. "
                        "Which effect is most likely to appear first?"
                    ),
                    "explanation": (
                        "If food transport is disturbed, growing parts depending on prepared food are affected first."
                    ),
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Growth of plant parts may slow because food movement is affected.",
                            "Roots will immediately stop absorbing all water forever.",
                            "The plant will start producing light.",
                            "Leaves will become a source of minerals from soil.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_life_food_transport_reasoning"},
                },
            )

        def transpiration_multiselect():
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": (
                        "Select all statements that correctly explain why transpiration is important for plants."
                    ),
                    "explanation": (
                        "Transpiration helps in water movement, cooling, and maintaining the flow of dissolved minerals."
                    ),
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": [
                        {"option_text": "It helps in the upward movement of water.", "is_correct": True},
                        {"option_text": "It can help cool the plant.", "is_correct": True},
                        {"option_text": "It allows plants to digest food like animals.", "is_correct": False},
                        {"option_text": "It supports the transport of dissolved minerals.", "is_correct": True},
                    ],
                    "metadata": {"question_pattern": "advanced_life_transpiration_multiselect"},
                },
            )

        def leaf_experiment_reasoning():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A student covers part of a leaf with black paper and leaves the plant in sunlight. "
                        "After testing the leaf for starch, what idea is being checked most directly?"
                    ),
                    "explanation": (
                        "Covering part of the leaf blocks light, so the experiment checks whether light is needed to prepare food."
                    ),
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Whether light is necessary for photosynthesis",
                            "Whether roots can absorb sound",
                            "Whether stomata produce minerals",
                            "Whether flowers can store electricity",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "advanced_life_leaf_experiment_reasoning"},
                },
            )

        return _pick_variant(
            sequence_number,
            [stomata_assertion, root_shoot_function, transpiration_multiselect, leaf_experiment_reasoning],
        )

    if family == "science_motion":
        def speed_compute():
            time = 2 + (sequence_number % 3)
            speed = 18 + (sequence_number % 5)
            distance = speed * time
            return (
                QuestionType.SHORT_ANSWER,
                {
                    "question_text": (
                        f"A runner covers {distance} m in {time} s at a steady speed. "
                        f"What is the speed in m/s?"
                    ),
                    "explanation": f"Speed = distance / time = {distance} / {time} = {speed} m/s.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.00"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "metadata": {
                        "accepted_answers": [str(speed), f"{speed} m/s"],
                        "question_pattern": "speed_computation_advanced",
                    },
                },
            )

        def uniform_nonuniform_case():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "A bus covers 5 km in the first 10 minutes, 5 km in the next 10 minutes, and 5 km in the next 10 minutes. "
                        "What does this suggest?"
                    ),
                    "explanation": "Equal distances in equal time intervals suggest uniform motion.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        ["The motion is uniform.", "The motion is non-uniform.", "The bus is standing still.", "Speed cannot be discussed at all."],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "uniform_vs_nonuniform_case"},
                },
            )

        def motion_multiselect():
            return (
                QuestionType.MCQ_MULTIPLE,
                {
                    "question_text": (
                        "Select all statements that are true about speed."
                    ),
                    "explanation": "Speed is related to distance covered per unit time and can be compared through distance and time data.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": [
                        {"option_text": "Speed can be found by dividing distance by time.", "is_correct": True},
                        {"option_text": "For the same distance, less time means greater speed.", "is_correct": True},
                        {"option_text": "A moving object always has uniform speed.", "is_correct": False},
                        {"option_text": "Speed has nothing to do with distance.", "is_correct": False},
                    ],
                    "metadata": {"question_pattern": "motion_multiselect"},
                },
            )

        def assertion_reason_motion():
            return (
                QuestionType.MCQ_SINGLE,
                {
                    "question_text": (
                        "Assertion (A): A person covering more distance in the same time has greater speed. "
                        "Reason (R): Speed depends on how much distance is covered in a given time.\n\n"
                        "Choose the correct option."
                    ),
                    "explanation": "Both statements are true, and the reason correctly explains the assertion.",
                    "default_marks": Decimal("3.00"),
                    "negative_marks": Decimal("0.50"),
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "options": ordered_options(
                        [
                            "Both A and R are true, and R is the correct explanation of A.",
                            "Both A and R are true, but R is not the correct explanation of A.",
                            "A is true, but R is false.",
                            "A is false, but R is true.",
                        ],
                        correct_index=0,
                    ),
                    "metadata": {"question_pattern": "assertion_reason_motion"},
                },
            )

        return _pick_variant(sequence_number, [speed_compute, uniform_nonuniform_case, motion_multiselect, assertion_reason_motion])

    time = 2 + (sequence_number % 3)
    speed = 18 + (sequence_number % 5)
    distance = speed * time
    return (
        QuestionType.SHORT_ANSWER,
        {
            "question_text": (
                f"A runner covers {distance} m in {time} s at a steady speed. "
                f"What is the speed in m/s?"
            ),
            "explanation": f"Speed = distance / time = {distance} / {time} = {speed} m/s.",
            "default_marks": Decimal("3.00"),
            "negative_marks": Decimal("0.00"),
            "difficulty_level": TopicDifficulty.ADVANCED,
            "metadata": {
                "accepted_answers": [str(speed), f"{speed} m/s"],
                "question_pattern": "olympiad_motion_speed_compute",
            },
        },
    )


def build_science_payload(*, topic, difficulty_level, sequence_number):
    if difficulty_level == TopicDifficulty.FOUNDATION:
        return _science_foundation(topic, sequence_number)
    if difficulty_level == TopicDifficulty.INTERMEDIATE:
        return _science_intermediate(topic, sequence_number)
    return _science_advanced(topic, sequence_number)


def build_payload(*, subject_alias, topic, difficulty_level, sequence_number):
    if subject_alias == "math":
        return build_math_payload(
            topic=topic,
            difficulty_level=difficulty_level,
            sequence_number=sequence_number,
        )
    return build_science_payload(
        topic=topic,
        difficulty_level=difficulty_level,
        sequence_number=sequence_number,
    )
