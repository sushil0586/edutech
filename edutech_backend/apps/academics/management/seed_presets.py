CLASS_7_CBSE_CORE = {
    "program": {
        "name": "Class 7",
        "code": "CLS7",
        "category": "school",
        "description": (
            "Class 7 academic container aligned to a CBSE/NCERT-first middle school "
            "structure, with configurable Computer and General Knowledge coverage."
        ),
        "sort_order": 70,
    },
    "subjects": [
        {
            "name": "Math",
            "code": "CLS7-MATH",
            "description": (
                "Grade 7 mathematics aligned to NCERT Ganita Prakash with a board-friendly, "
                "normalized topic structure."
            ),
            "sort_order": 10,
            "topics": [
                {
                    "name": "Numbers and Place Value",
                    "code": "MATH-NUMBERS",
                    "description": "Large numbers, numeration systems, ordering, and place value.",
                    "sort_order": 10,
                    "children": [
                        ("Large Numbers Around Us", "MATH-NUMBERS-LARGE", 10),
                        ("Indian and International Number Systems", "MATH-NUMBERS-SYSTEMS", 20),
                        ("Place Value and Comparison", "MATH-NUMBERS-PLACE", 30),
                    ],
                },
                {
                    "name": "Arithmetic and Decimals",
                    "code": "MATH-ARITH",
                    "description": "Operations, arithmetic expressions, decimals, and order of operations.",
                    "sort_order": 20,
                    "children": [
                        ("Arithmetic Expressions", "MATH-ARITH-EXPRESSIONS", 10),
                        ("Order of Operations", "MATH-ARITH-ORDER", 20),
                        ("Decimals", "MATH-ARITH-DECIMALS", 30),
                    ],
                },
                {
                    "name": "Introductory Algebra",
                    "code": "MATH-ALGEBRA",
                    "description": "Letter-numbers, algebraic expressions, and pattern-based reasoning.",
                    "sort_order": 30,
                    "children": [
                        ("Expressions using Letter-Numbers", "MATH-ALGEBRA-LETTERS", 10),
                        ("Variables and Expressions", "MATH-ALGEBRA-VARIABLES", 20),
                        ("Patterns and Rules", "MATH-ALGEBRA-PATTERNS", 30),
                    ],
                },
                {
                    "name": "Geometry",
                    "code": "MATH-GEOMETRY",
                    "description": "Lines, angles, and triangle properties.",
                    "sort_order": 40,
                    "children": [
                        ("Parallel and Intersecting Lines", "MATH-GEOMETRY-LINES", 10),
                        ("Angles and Reasoning", "MATH-GEOMETRY-ANGLES", 20),
                        ("Triangle Properties", "MATH-GEOMETRY-TRIANGLES", 30),
                    ],
                },
                {
                    "name": "Fractions",
                    "code": "MATH-FRACTIONS",
                    "description": "Fraction concepts and operations.",
                    "sort_order": 50,
                    "children": [
                        ("Equivalent Fractions", "MATH-FRACTIONS-EQUIVALENT", 10),
                        ("Multiplication of Fractions", "MATH-FRACTIONS-MULTIPLY", 20),
                        ("Division of Fractions", "MATH-FRACTIONS-DIVIDE", 30),
                    ],
                },
                {
                    "name": "Logical and Computational Thinking",
                    "code": "MATH-LOGIC",
                    "description": "Number play, puzzles, parity, and strategy-building.",
                    "sort_order": 60,
                    "children": [
                        ("Number Play", "MATH-LOGIC-NUMBERPLAY", 10),
                        ("Patterns and Sequences", "MATH-LOGIC-PATTERNS", 20),
                        ("Puzzles and Cryptarithms", "MATH-LOGIC-PUZZLES", 30),
                    ],
                },
            ],
        },
        {
            "name": "Science",
            "code": "CLS7-SCI",
            "description": "Grade 7 science aligned to NCERT Curiosity with integrated biology, chemistry, physics, and earth science.",
            "sort_order": 20,
            "topics": [
                {
                    "name": "Scientific Exploration",
                    "code": "SCI-EXPLORATION",
                    "description": "Introduction to scientific thinking and observation.",
                    "sort_order": 10,
                    "children": [
                        ("The Ever-Evolving World of Science", "SCI-EXPLORATION-WORLD", 10),
                    ],
                },
                {
                    "name": "Materials and Matter",
                    "code": "SCI-MATTER",
                    "description": "Substances, properties, metals, non-metals, and changes in matter.",
                    "sort_order": 20,
                    "children": [
                        ("Acidic, Basic, and Neutral Substances", "SCI-MATTER-ACIDBASE", 10),
                        ("Metals and Non-metals", "SCI-MATTER-METALS", 20),
                        ("Physical and Chemical Changes", "SCI-MATTER-CHANGES", 30),
                    ],
                },
                {
                    "name": "Electricity, Light, and Heat",
                    "code": "SCI-PHYSICS",
                    "description": "Core physical science concepts for Grade 7.",
                    "sort_order": 30,
                    "children": [
                        ("Electric Circuits and Components", "SCI-PHYSICS-ELECTRICITY", 10),
                        ("Heat Transfer in Nature", "SCI-PHYSICS-HEAT", 20),
                        ("Light, Shadows, and Reflections", "SCI-PHYSICS-LIGHT", 30),
                    ],
                },
                {
                    "name": "Motion and Measurement",
                    "code": "SCI-MOTION",
                    "description": "Measurement of time, motion, and related observations.",
                    "sort_order": 40,
                    "children": [
                        ("Measurement of Time", "SCI-MOTION-TIME", 10),
                        ("Motion in Everyday Life", "SCI-MOTION-MOTION", 20),
                    ],
                },
                {
                    "name": "Life Processes",
                    "code": "SCI-LIFE",
                    "description": "Animal and plant systems and life functions.",
                    "sort_order": 50,
                    "children": [
                        ("Life Processes in Animals", "SCI-LIFE-ANIMALS", 10),
                        ("Life Processes in Plants", "SCI-LIFE-PLANTS", 20),
                        ("Respiration in Organisms", "SCI-LIFE-RESPIRATION", 30),
                        ("Transportation in Animals and Plants", "SCI-LIFE-TRANSPORT", 40),
                        ("Reproduction in Plants", "SCI-LIFE-PLANT-REPRODUCTION", 50),
                    ],
                },
                {
                    "name": "Human Growth and Health",
                    "code": "SCI-HEALTH",
                    "description": "Adolescence, body changes, and responsible health awareness.",
                    "sort_order": 60,
                    "children": [
                        ("Adolescence and Growth", "SCI-HEALTH-ADOLESCENCE", 10),
                    ],
                },
                {
                    "name": "Earth and Space",
                    "code": "SCI-SPACE",
                    "description": "The Earth, Moon, Sun, and observation of celestial patterns.",
                    "sort_order": 70,
                    "children": [
                        ("Earth, Moon, and the Sun", "SCI-SPACE-EARTHMOONSUN", 10),
                    ],
                },
                {
                    "name": "Environment and Public Health",
                    "code": "SCI-ENV",
                    "description": "Forest ecosystems, sanitation, wastewater, and environmental responsibility.",
                    "sort_order": 80,
                    "children": [
                        ("Forests: Our Lifeline", "SCI-ENV-FORESTS", 10),
                        ("Wastewater Story", "SCI-ENV-WASTEWATER", 20),
                    ],
                },
            ],
        },
        {
            "name": "Social Science",
            "code": "CLS7-SST",
            "description": "Grade 7 social science with integrated history, geography, society, governance, and economy themes.",
            "sort_order": 30,
            "topics": [
                {
                    "name": "Geography",
                    "code": "SST-GEO",
                    "description": "Physical geography, regions, environment, and resource understanding.",
                    "sort_order": 10,
                    "children": [
                        ("Geographical Diversity of India", "SST-GEO-DIVERSITY", 10),
                        ("Maps, Regions, and Landscapes", "SST-GEO-MAPS", 20),
                        ("Environment and Human Interaction", "SST-GEO-ENVIRONMENT", 30),
                    ],
                },
                {
                    "name": "History",
                    "code": "SST-HIST",
                    "description": "Civilizations, cities, states, empires, and cultural developments.",
                    "sort_order": 20,
                    "children": [
                        ("New Beginnings: Cities and States", "SST-HIST-CITIES", 10),
                        ("The Rise of Empires", "SST-HIST-EMPIRES", 20),
                        ("Culture, Heritage, and Knowledge Traditions", "SST-HIST-CULTURE", 30),
                    ],
                },
                {
                    "name": "Civics and Society",
                    "code": "SST-CIVICS",
                    "description": "Society, equality, governance, citizenship, and institutions.",
                    "sort_order": 30,
                    "children": [
                        ("Diversity and Equality", "SST-CIVICS-EQUALITY", 10),
                        ("Local Governance and Public Institutions", "SST-CIVICS-GOVERNANCE", 20),
                        ("Citizenship and Responsibility", "SST-CIVICS-CITIZENSHIP", 30),
                    ],
                },
                {
                    "name": "Economy and Markets",
                    "code": "SST-ECON",
                    "description": "Money, trade, production, consumption, and market systems.",
                    "sort_order": 40,
                    "children": [
                        ("From Barter to Money", "SST-ECON-MONEY", 10),
                        ("Understanding Markets", "SST-ECON-MARKETS", 20),
                        ("Work, Production, and Exchange", "SST-ECON-WORK", 30),
                    ],
                },
            ],
        },
        {
            "name": "Computer",
            "code": "CLS7-COMP",
            "description": "Board-neutral lower secondary computer studies blending digital literacy, core computing, and safe technology use.",
            "sort_order": 40,
            "topics": [
                {
                    "name": "Computer Fundamentals",
                    "code": "COMP-FUND",
                    "description": "Devices, systems, input-output, storage, and everyday computing concepts.",
                    "sort_order": 10,
                    "children": [
                        ("Computer Systems and Components", "COMP-FUND-SYSTEMS", 10),
                        ("Input, Output, and Storage Devices", "COMP-FUND-IO", 20),
                        ("Operating Systems and File Management", "COMP-FUND-OS", 30),
                    ],
                },
                {
                    "name": "Digital Productivity",
                    "code": "COMP-PRODUCTIVITY",
                    "description": "Creating and editing digital content for school and communication tasks.",
                    "sort_order": 20,
                    "children": [
                        ("Word Processing", "COMP-PRODUCTIVITY-WORD", 10),
                        ("Presentations", "COMP-PRODUCTIVITY-PRESENT", 20),
                        ("Spreadsheets and Tables", "COMP-PRODUCTIVITY-SHEETS", 30),
                    ],
                },
                {
                    "name": "Computational Thinking and Coding",
                    "code": "COMP-CODING",
                    "description": "Algorithms, logic, and introductory programming.",
                    "sort_order": 30,
                    "children": [
                        ("Algorithms and Flowcharts", "COMP-CODING-ALGO", 10),
                        ("Programming Basics", "COMP-CODING-BASICS", 20),
                        ("Debugging and Problem Solving", "COMP-CODING-DEBUG", 30),
                    ],
                },
                {
                    "name": "Internet and Networks",
                    "code": "COMP-INTERNET",
                    "description": "Internet use, communication, search, and network basics.",
                    "sort_order": 40,
                    "children": [
                        ("Internet Services", "COMP-INTERNET-SERVICES", 10),
                        ("Search and Information Evaluation", "COMP-INTERNET-SEARCH", 20),
                        ("Networks and Digital Communication", "COMP-INTERNET-NETWORKS", 30),
                    ],
                },
                {
                    "name": "Digital Citizenship and Safety",
                    "code": "COMP-SAFETY",
                    "description": "Responsible, safe, and ethical technology use.",
                    "sort_order": 50,
                    "children": [
                        ("Digital Footprint and Identity", "COMP-SAFETY-FOOTPRINT", 10),
                        ("Cyber Safety and Wellbeing", "COMP-SAFETY-CYBER", 20),
                        ("Ethics, AI, and Responsible Use", "COMP-SAFETY-ETHICS", 30),
                    ],
                },
            ],
        },
        {
            "name": "General Knowledge",
            "code": "CLS7-GK",
            "description": "Platform-curated general knowledge taxonomy for awareness, enrichment, and quiz-style assessment.",
            "sort_order": 50,
            "topics": [
                {
                    "name": "India and the World",
                    "code": "GK-WORLD",
                    "description": "Places, institutions, countries, and global awareness.",
                    "sort_order": 10,
                    "children": [
                        ("Indian States, Capitals, and Symbols", "GK-WORLD-INDIA", 10),
                        ("Countries, Capitals, and Continents", "GK-WORLD-COUNTRIES", 20),
                        ("International Organizations", "GK-WORLD-ORG", 30),
                    ],
                },
                {
                    "name": "Science and Innovation",
                    "code": "GK-SCI",
                    "description": "Inventors, discoveries, inventions, and scientific awareness.",
                    "sort_order": 20,
                    "children": [
                        ("Scientists and Inventors", "GK-SCI-SCIENTISTS", 10),
                        ("Inventions and Discoveries", "GK-SCI-INVENTIONS", 20),
                        ("Space and Environment Awareness", "GK-SCI-SPACEENV", 30),
                    ],
                },
                {
                    "name": "Culture and Heritage",
                    "code": "GK-CULTURE",
                    "description": "Arts, festivals, monuments, literature, and cultural traditions.",
                    "sort_order": 30,
                    "children": [
                        ("Monuments and Heritage Sites", "GK-CULTURE-MONUMENTS", 10),
                        ("Festivals and Traditions", "GK-CULTURE-FESTIVALS", 20),
                        ("Books, Art, and Performing Culture", "GK-CULTURE-ARTS", 30),
                    ],
                },
                {
                    "name": "Sports and Current Awareness",
                    "code": "GK-SPORTS",
                    "description": "Sports, important events, and current-awareness style knowledge buckets.",
                    "sort_order": 40,
                    "children": [
                        ("Sports Personalities and Tournaments", "GK-SPORTS-TOURNAMENTS", 10),
                        ("Awards and Honours", "GK-SPORTS-AWARDS", 20),
                        ("Current Affairs Themes", "GK-SPORTS-CURRENTAFFAIRS", 30),
                    ],
                },
            ],
        },
    ],
}


PRESETS = {
    "class_7_cbse_core": CLASS_7_CBSE_CORE,
}
