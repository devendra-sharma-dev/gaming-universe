"use strict";

/**
 * CLIENT PUZZLE CATALOG — 50 CONNECTED CHALLENGES (CLEVER CHAOS)
 * All 50 levels mapped in exact progression order.
 */

window.LEVEL_XP = {
    "1": 50,
    "2": 60,
    "3": 70,
    "4": 80,
    "5": 90,
    "6": 100,
    "7": 110,
    "8": 120,
    "9": 130,
    "10": 140,
    "11": 150,
    "12": 160,
    "13": 170,
    "14": 180,
    "15": 190,
    "16": 200,
    "17": 215,
    "18": 230,
    "19": 245,
    "20": 260,
    "21": 275,
    "22": 290,
    "23": 305,
    "24": 320,
    "25": 340,
    "26": 360,
    "27": 380,
    "28": 400,
    "29": 420,
    "30": 440,
    "31": 460,
    "32": 480,
    "33": 500,
    "34": 520,
    "35": 540,
    "36": 560,
    "37": 580,
    "38": 600,
    "39": 625,
    "40": 650,
    "41": 675,
    "42": 700,
    "43": 725,
    "44": 750,
    "45": 775,
    "46": 800,
    "47": 850,
    "48": 900,
    "49": 950,
    "50": 1000
};

window.PUZZLE_CATALOG = [
    {
        "level": 1,
        "catalogId": 1,
        "title": "Tricky Equation",
        "subtitle": "Trick Question",
        "category": "Math & Sequences",
        "difficulty": "Very Easy",
        "diffClass": "diff-very-easy",
        "targetTime": "10–30s",
        "engine": "mathPattern",
        "referenceAsset": null,
        "icon": "🔢",
        "instructions": "Read carefully: If 1 = 5, 2 = 25, 3 = 125, 4 = 625, then 5 = ?",
        "config": {
            "prompt": "If 1 = 5, 2 = 25, 3 = 125, 4 = 625, then 5 = ?",
            "answer": 1,
            "acceptedAnswers": [
                "1"
            ],
            "hint": "Focus on the first equation.",
            "explanation": "It's a trick question! The very first equation stated that 1 = 5, so by equality, 5 = 1."
        },
        "xp": 50
    },
    {
        "level": 2,
        "catalogId": 46,
        "title": "Tower of Hanoi: 3 Disks",
        "subtitle": "Classic Recursion",
        "category": "Mechanical Logic",
        "difficulty": "Very Easy",
        "diffClass": "diff-very-easy",
        "targetTime": "20–45s",
        "engine": "hanoi",
        "referenceAsset": null,
        "icon": "🗼",
        "instructions": "Move all 3 disks from Left to Right. Never place a larger disk on a smaller disk. Move limit: exactly 7 moves!",
        "config": {
            "disks": 3,
            "maxMoves": 7,
            "optimalMoves": 7,
            "hint": "Move disk 1 to the target pole."
        },
        "xp": 60
    },
    {
        "level": 3,
        "catalogId": 9,
        "title": "Matchstick Equation",
        "subtitle": "One-Move Arithmetic",
        "category": "Spatial Logic",
        "difficulty": "Very Easy",
        "diffClass": "diff-very-easy",
        "targetTime": "20s–2m",
        "engine": "matchstick",
        "referenceAsset": null,
        "icon": "🥢",
        "instructions": "Move exactly ONE matchstick to make the equation mathematically correct",
        "config": {
            "equation": "19 + 93 = 96",
            "solution": "13 + 83 = 96",
            "solutionNotes": "Move the top-left vertical stick from 9 in '19' (turning it into 13) to the bottom-left of 9 in '93' (turning it into 83). 13 + 83 = 96!",
            "hint": "The right-hand side of the equation remains 96."
        },
        "xp": 70
    },
    {
        "level": 4,
        "catalogId": 28,
        "title": "Missing Number",
        "subtitle": "Sequence Pattern",
        "category": "Math & Sequences",
        "difficulty": "Very Easy",
        "diffClass": "diff-very-easy",
        "targetTime": "20s–1m",
        "engine": "mathPattern",
        "referenceAsset": null,
        "icon": "❓",
        "instructions": "",
        "config": {
            "prompt": "1, 4, 10, 22, 46, ?",
            "answer": 94,
            "acceptedAnswers": [
                "94"
            ],
            "hint": "Everything almost doubles as you move forward.",
            "explanation": "Each number doubles and adds 2 (or differences double: +3, +6, +12, +24, +48). 46 × 2 + 2 = 94!"
        },
        "xp": 80
    },
    {
        "level": 5,
        "catalogId": 16,
        "title": "Quick Escape",
        "subtitle": "6×6 Sliding Block Escape",
        "category": "Spatial Logic",
        "difficulty": "Easy",
        "diffClass": "diff-easy",
        "targetTime": "1–3m",
        "engine": "slidingBlock",
        "referenceAsset": null,
        "icon": "🚗",
        "instructions": "",
        "config": {
            "boardSize": 6,
            "exitRow": 2,
            "targetBlockId": "target",
            "optimalMoves": 8,
            "hint": "Try to slide the red block into the empty middle space.",
            "blocks": [
                {
                    "id": "target",
                    "orientation": "h",
                    "row": 2,
                    "col": 0,
                    "length": 2,
                    "color": "#ef4444"
                },
                {
                    "id": "b_v1",
                    "orientation": "v",
                    "row": 0,
                    "col": 0,
                    "length": 2,
                    "color": "#2563eb"
                },
                {
                    "id": "b_h1",
                    "orientation": "h",
                    "row": 0,
                    "col": 2,
                    "length": 2,
                    "color": "#2563eb"
                },
                {
                    "id": "b_h2",
                    "orientation": "h",
                    "row": 1,
                    "col": 1,
                    "length": 3,
                    "color": "#f59e0b"
                },
                {
                    "id": "b_v2",
                    "orientation": "v",
                    "row": 0,
                    "col": 4,
                    "length": 2,
                    "color": "#2563eb"
                },
                {
                    "id": "b_v3",
                    "orientation": "v",
                    "row": 2,
                    "col": 2,
                    "length": 3,
                    "color": "#f59e0b"
                },
                {
                    "id": "b_v4",
                    "orientation": "v",
                    "row": 1,
                    "col": 5,
                    "length": 3,
                    "color": "#f59e0b"
                },
                {
                    "id": "b_v5",
                    "orientation": "v",
                    "row": 2,
                    "col": 4,
                    "length": 2,
                    "color": "#2563eb"
                },
                {
                    "id": "b_h3",
                    "orientation": "h",
                    "row": 5,
                    "col": 2,
                    "length": 3,
                    "color": "#f59e0b"
                }
            ]
        },
        "xp": 90
    },
    {
        "level": 6,
        "catalogId": 4,
        "title": "Minesweeper: Calm",
        "subtitle": "9×9 Grid • 10 Mines",
        "category": "Deduction",
        "difficulty": "Easy",
        "diffClass": "diff-easy",
        "targetTime": "2–5m",
        "engine": "minesweeper",
        "referenceAsset": null,
        "icon": "💣",
        "instructions": "",
        "config": {
            "rows": 9,
            "cols": 9,
            "mines": 10,
            "hint": "The safe cell is glowing."
        },
        "xp": 100
    },
    {
        "level": 7,
        "catalogId": 33,
        "title": "Fox, Goose & Beans",
        "subtitle": "River Crossing Challenge",
        "category": "River Crossing",
        "difficulty": "Easy–Medium",
        "diffClass": "diff-easy-medium",
        "targetTime": "3–6m",
        "engine": "riverCrossing",
        "referenceAsset": null,
        "icon": "🦊",
        "instructions": "Transport the Farmer, Fox, Goose, and Beans across the river. The boat carries only the Farmer and at most 1 item. Never leave Fox alone with Goose, or Goose with Beans!",
        "config": {
            "variant": "foxGooseBeans",
            "optimalMoves": 7,
            "items": [
                "farmer",
                "fox",
                "goose",
                "beans"
            ],
            "hint": "Remember, just because an item makes it across the river doesn't mean it has to stay there forever."
        },
        "xp": 110
    },
    {
        "level": 8,
        "catalogId": 15,
        "title": "Number wheel",
        "subtitle": "Circular Mean Alignment",
        "category": "Math & Sequences",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–7m",
        "engine": "averageWheel",
        "referenceAsset": null,
        "icon": "🎯",
        "instructions": "",
        "config": {
            "reference": null,
            "optimalMoves": 9,
            "hint": "All numbers should be equal to average of two fixed adjacent numbers."
        },
        "xp": 120
    },
    {
        "level": 9,
        "catalogId": 41,
        "title": "Key & Lock Maze",
        "subtitle": "Labyrinth with Golden Key",
        "category": "Pathfinding",
        "difficulty": "Easy",
        "diffClass": "diff-easy",
        "targetTime": "1–3m",
        "engine": "maze",
        "referenceAsset": null,
        "icon": "🗝️",
        "instructions": "",
        "config": {
            "width": 16,
            "height": 16,
            "mode": "keyAndLock",
            "seed": 12345,
            "hint": "Head towards the bottom-left to discover the Golden Key, then proceed to the exit at the bottom-right."
        },
        "xp": 130
    },
    {
        "level": 10,
        "catalogId": 44,
        "title": "Nonogram: Logic Matrix",
        "subtitle": "7×7 Grid Logic",
        "category": "Grid Deduction",
        "difficulty": "Easy",
        "diffClass": "diff-easy",
        "targetTime": "2–5m",
        "engine": "nonogram",
        "referenceAsset": null,
        "icon": "🧩",
        "instructions": "",
        "config": {
            "size": 7,
            "title": "Logic Matrix",
            "solution": [
                [
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0
                ],
                [
                    0,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0
                ],
                [
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0
                ],
                [
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1
                ],
                [
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0
                ]
            ],
            "rowClues": [
                [
                    1
                ],
                [
                    2
                ],
                [
                    3
                ],
                [
                    4
                ],
                [
                    1
                ],
                [
                    7
                ],
                [
                    5
                ]
            ],
            "colClues": [
                [
                    1,
                    1
                ],
                [
                    2,
                    2
                ],
                [
                    3,
                    2
                ],
                [
                    7
                ],
                [
                    2
                ],
                [
                    2
                ],
                [
                    1
                ]
            ],
            "hint": "The safe cell is glowing."
        },
        "xp": 140
    },
    {
        "level": 11,
        "catalogId": 47,
        "title": "Tower of Hanoi: 4 Disks",
        "subtitle": "Strict 15-Move Limit",
        "category": "Mechanical Logic",
        "difficulty": "Easy",
        "diffClass": "diff-easy",
        "targetTime": "45–90s",
        "engine": "hanoi",
        "referenceAsset": null,
        "icon": "🗼",
        "instructions": "Transfer all 4 disks to the Right peg in at most 15 moves.",
        "config": {
            "disks": 4,
            "maxMoves": 15,
            "optimalMoves": 15,
            "hint": "Put first disk to middle pole initially."
        },
        "xp": 150
    },
    {
        "level": 12,
        "catalogId": 36,
        "title": "Crack the Code",
        "subtitle": "Deductive Lock",
        "category": "Deduction",
        "difficulty": "Easy–Medium",
        "diffClass": "diff-easy-medium",
        "targetTime": "2–5m",
        "engine": "codeBreaker",
        "referenceAsset": null,
        "icon": "🔐",
        "instructions": "",
        "config": {
            "clues": [
                {
                    "guess": "682",
                    "correct": 1,
                    "placed": 1,
                    "text": "One digit is right and in its place."
                },
                {
                    "guess": "614",
                    "correct": 1,
                    "placed": 0,
                    "text": "One digit is right but in the wrong place."
                },
                {
                    "guess": "206",
                    "correct": 2,
                    "placed": 0,
                    "text": "Two digits are right but both in wrong places."
                },
                {
                    "guess": "738",
                    "correct": 0,
                    "placed": 0,
                    "text": "Nothing is correct."
                },
                {
                    "guess": "780",
                    "correct": 1,
                    "placed": 0,
                    "text": "One digit is right but in the wrong place."
                }
            ],
            "answer": "042",
            "explanation": "7,3,8 eliminated. Clue 5: 0 is correct in wrong position. Clue 3: 2 and 0 correct. From Clue 1: 2 is 3rd place! 0 is 1st place (0 _ 2). Clue 2: 4 is 2nd place! Code: 042.",
            "hint": "0 is one of the digits."
        },
        "xp": 160
    },
    {
        "level": 13,
        "catalogId": 35,
        "title": "Water Pouring Challenge",
        "subtitle": "3L & 5L Vessels • Measure 4L",
        "category": "Resource Management",
        "difficulty": "Easy–Medium",
        "diffClass": "diff-easy-medium",
        "targetTime": "3–6m",
        "engine": "waterPouring",
        "referenceAsset": null,
        "icon": "🫗",
        "instructions": "",
        "config": {
            "vesselA": {
                "name": "3L Bucket",
                "capacity": 3
            },
            "vesselB": {
                "name": "5L Bucket",
                "capacity": 5
            },
            "target": {
                "vessel": "B",
                "amount": 4
            },
            "optimalMoves": 6,
            "hint": "Use the 3-liter bucket to repeatedly measure out and subtract volume from the 5-liter bucket."
        },
        "xp": 170
    },
    {
        "level": 14,
        "catalogId": 39,
        "title": "Flow Free",
        "subtitle": "9×9 Grid • Complete Cover",
        "category": "Pathfinding",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–6m",
        "engine": "flowFree",
        "referenceAsset": null,
        "icon": "🌊",
        "instructions": "",
        "config": {
            "size": 9,
            "hint": "Let the lines do the walking, you just do the thinking.",
            "pairs": [
                {
                    "color": "#22c55e",
                    "label": "Green",
                    "symbol": "●",
                    "a": [
                        0,
                        0
                    ],
                    "b": [
                        4,
                        8
                    ]
                },
                {
                    "color": "#ef4444",
                    "label": "Red",
                    "symbol": "●",
                    "a": [
                        1,
                        0
                    ],
                    "b": [
                        8,
                        1
                    ]
                },
                {
                    "color": "#991b1b",
                    "label": "Maroon",
                    "symbol": "●",
                    "a": [
                        1,
                        2
                    ],
                    "b": [
                        6,
                        7
                    ]
                },
                {
                    "color": "#d946ef",
                    "label": "Magenta",
                    "symbol": "●",
                    "a": [
                        1,
                        7
                    ],
                    "b": [
                        5,
                        8
                    ]
                },
                {
                    "color": "#eab308",
                    "label": "Yellow",
                    "symbol": "●",
                    "a": [
                        2,
                        0
                    ],
                    "b": [
                        3,
                        3
                    ]
                },
                {
                    "color": "#3b82f6",
                    "label": "Blue",
                    "symbol": "●",
                    "a": [
                        2,
                        5
                    ],
                    "b": [
                        5,
                        5
                    ]
                },
                {
                    "color": "#f97316",
                    "label": "Orange",
                    "symbol": "●",
                    "a": [
                        5,
                        1
                    ],
                    "b": [
                        6,
                        8
                    ]
                },
                {
                    "color": "#06b6d4",
                    "label": "Cyan",
                    "symbol": "●",
                    "a": [
                        5,
                        2
                    ],
                    "b": [
                        7,
                        4
                    ]
                },
                {
                    "color": "#8b5cf6",
                    "label": "Purple",
                    "symbol": "●",
                    "a": [
                        5,
                        3
                    ],
                    "b": [
                        7,
                        7
                    ]
                }
            ]
        },
        "xp": 180
    },
    {
        "level": 15,
        "catalogId": 12,
        "title": "Rotating Tiles",
        "subtitle": "2×2 Quadrant Rotation",
        "category": "Mechanical Logic",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–7m",
        "engine": "rotatingTiles",
        "referenceAsset": null,
        "icon": "🔄",
        "instructions": "Click the circular rotation dials between tiles to rotate 2×2 clusters clockwise until the board matches the target pattern on the right.",
        "config": {
            "reference": null,
            "optimalMoves": 70,
            "hint": "An optimal rotation dial is glowing on the board.",
            "gridSize": 5
        },
        "xp": 190
    },
    {
        "level": 16,
        "catalogId": 3,
        "title": "Eight Coins, Two Weighings",
        "subtitle": "Balance Scale Deduction",
        "category": "Deduction",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "2–5m",
        "engine": "coinWeighing",
        "referenceAsset": null,
        "icon": "⚖️",
        "instructions": "",
        "config": {
            "totalCoins": 8,
            "maxWeighings": 2,
            "hint": "use 3 3 2 distribution as your first weighing."
        },
        "xp": 200
    },
    {
        "level": 17,
        "catalogId": 38,
        "title": "Bridge and Torch",
        "subtitle": "Night Bridge Crossing",
        "category": "Resource Management",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "5–10m",
        "engine": "riverCrossing",
        "referenceAsset": null,
        "icon": "🔦",
        "instructions": "4 travelers (speeds: 1, 2, 5, 8 minutes) must cross a fragile bridge at night. The bridge holds at most 2 people and the torch must accompany every crossing. Reach the other side in the optimal time!",
        "config": {
            "variant": "bridgeTorch",
            "times": [
                1,
                2,
                5,
                8
            ],
            "optimalTime": 15,
            "hint": "Make the slowest people cross the bridge together."
        },
        "xp": 215
    },
    {
        "level": 18,
        "catalogId": 34,
        "title": "Three Jealous Animal Pairs",
        "subtitle": "Predator & Companion Crossing",
        "category": "River Crossing",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "5–15m",
        "engine": "riverCrossing",
        "referenceAsset": null,
        "icon": "🐾",
        "instructions": "Cross 3 pairs (Dominant A, B, C and Companions a, b, c) in a 2-seat boat. Rule: A companion is unsafe if unattended by its partner while a different dominant animal is present!",
        "config": {
            "variant": "jealousPairs",
            "dominants": [
                "A",
                "B",
                "C"
            ],
            "companions": [
                "a",
                "b",
                "c"
            ],
            "boatCapacity": 2,
            "hint": "Cross the 3 dominant animals first to other bank."
        },
        "xp": 230
    },
    {
        "level": 19,
        "catalogId": 10,
        "title": "Seating Arrangement",
        "subtitle": "8-Seat Deduction Puzzle",
        "category": "Deduction",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "5–15m",
        "engine": "seatingLogic",
        "referenceAsset": null,
        "icon": "🪑",
        "instructions": "",
        "config": {
            "seats": 8,
            "names": [
                "Harvey",
                "Jennie",
                "Peter",
                "Joyce",
                "Lia",
                "Rick",
                "Kenny",
                "Mark"
            ],
            "hint": "Rick is at seat 7."
        },
        "xp": 245
    },
    {
        "level": 20,
        "catalogId": 37,
        "title": "The Impossible Grid",
        "subtitle": "3×3 Magic Square",
        "category": "Math & Sequences",
        "difficulty": "Easy–Medium",
        "diffClass": "diff-easy-medium",
        "targetTime": "3–6m",
        "engine": "magicSquare",
        "referenceAsset": null,
        "icon": "🧮",
        "instructions": "",
        "config": {
            "targetSum": 15,
            "size": 3,
            "hint": "5 will be placed in the middle."
        },
        "xp": 260
    },
    {
        "level": 21,
        "catalogId": 18,
        "title": "Symbol Tile Sort",
        "subtitle": "5×5 Sliding Tile Sanctuary",
        "category": "Spatial Logic",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–6m",
        "engine": "symbolSort",
        "referenceAsset": null,
        "icon": "🧿",
        "instructions": "Slide symbols orthogonally into adjacent empty slots to navigate all tokens to their designated domain backgrounds.",
        "config": {
            "reference": null,
            "hint": "Optimal move is displayed on board.",
            "zones": [
                {
                    "id": "green",
                    "symbol": "☊",
                    "name": "Green Headphone",
                    "targetCount": 4
                },
                {
                    "id": "red",
                    "symbol": "🐟",
                    "name": "Red Fish",
                    "targetCount": 4
                },
                {
                    "id": "gold",
                    "symbol": "⌛",
                    "name": "Gold Timer",
                    "targetCount": 4
                },
                {
                    "id": "blue",
                    "symbol": "∞",
                    "name": "Blue Infinity",
                    "targetCount": 4
                }
            ]
        },
        "xp": 275
    },
    {
        "level": 22,
        "catalogId": 2,
        "title": "Eight-Cell Number Placement",
        "subtitle": "Non-Consecutive Placement",
        "category": "Spatial Logic",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "2–5m",
        "engine": "eightCells",
        "referenceAsset": null,
        "icon": "🔢",
        "instructions": "Place digits 1 through 8 in the 8 cells so that no two consecutive numbers touch horizontally, vertically, OR diagonally!",
        "config": {
            "cellsCount": 8,
            "optimalMoves": 8,
            "hint": "1 will be placed in innermost cells."
        },
        "xp": 290
    },
    {
        "level": 23,
        "catalogId": 25,
        "title": "Jigsaw: Easy",
        "subtitle": "5×5 • 25 Pieces",
        "category": "Spatial Assembly",
        "difficulty": "Easy",
        "diffClass": "diff-easy",
        "targetTime": "2–5m",
        "engine": "jigsaw",
        "referenceAsset": "level8-jigsaw.jpg",
        "icon": "🧩",
        "instructions": "Reassemble the 25-piece aerial crossroad. Tap any piece, then tap another to swap them into place.",
        "config": {
            "gridSize": 5,
            "image": "puzzle-references/level8-jigsaw.jpg",
            "hint": "Swap the glowing pieces."
        },
        "xp": 305
    },
    {
        "level": 24,
        "catalogId": 13,
        "title": "Butterfly Bucket Sort",
        "subtitle": "Row Shifting Mechanics",
        "category": "Mechanical Logic",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–6m",
        "engine": "butterflySort",
        "referenceAsset": null,
        "icon": "🦋",
        "instructions": "Shift the horizontal rail rows left and right so each colored butterfly drops through aligned gaps into its matching bucket.",
        "config": {
            "reference": null,
            "optimalMoves": 17,
            "hint": "Drop butterfly in their matching color basket.",
            "buckets": [
                {
                    "id": "green",
                    "color": "#16a34a",
                    "symbol": "🟢",
                    "name": "Dark Green"
                },
                {
                    "id": "pink",
                    "color": "#ec4899",
                    "symbol": "🌸",
                    "name": "Pink"
                },
                {
                    "id": "lime",
                    "color": "#84cc16",
                    "symbol": "🌱",
                    "name": "Light Green"
                },
                {
                    "id": "blue",
                    "color": "#3b82f6",
                    "symbol": "🔵",
                    "name": "Blue"
                },
                {
                    "id": "red",
                    "color": "#ef4444",
                    "symbol": "🔴",
                    "name": "Red"
                }
            ]
        },
        "xp": 320
    },
    {
        "level": 25,
        "catalogId": 48,
        "title": "Tower of Hanoi: 5 Disks",
        "subtitle": "Optimal 31-Move Cap",
        "category": "Mechanical Logic",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "1.5–3m",
        "engine": "hanoi",
        "referenceAsset": null,
        "icon": "🗼",
        "instructions": "Transfer all 5 disks to the Right peg within the strict 31-move limit. One extra move triggers a reset.",
        "config": {
            "disks": 5,
            "maxMoves": 31,
            "optimalMoves": 31,
            "hint": "Start with putting disk 1 on target pole."
        },
        "xp": 340
    },
    {
        "level": 26,
        "catalogId": 42,
        "title": "Grand Labyrinth",
        "subtitle": "40×20 Intricate Path",
        "category": "Pathfinding",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–5m",
        "engine": "maze",
        "referenceAsset": null,
        "icon": "🧭",
        "instructions": "Navigate the intricate labyrinth from the Entrance on the left (Row 17) to the Exit on the right (Row 6).",
        "config": {
            "mode": "grandMaze",
            "rows": 20,
            "cols": 40,
            "start": [
                16,
                0
            ],
            "exit": [
                5,
                39
            ],
            "hint": "Correct path is revealed."
        },
        "xp": 360
    },
    {
        "level": 27,
        "catalogId": 11,
        "title": "Rook-Free Squares",
        "subtitle": "Chessboard Geometry",
        "category": "Math & Sequences",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–8m",
        "engine": "rookCount",
        "referenceAsset": null,
        "icon": "🏰",
        "instructions": "",
        "config": {
            "boardSize": 8,
            "rooks": [
                {
                    "row": 3,
                    "col": 4
                },
                {
                    "row": 6,
                    "col": 6
                }
            ],
            "answer": 128,
            "hint": "Do not forget to consider bigger squares like 2x2, 3x3...",
            "explanation": "Total squares on an 8×8 board is 204. Exactly 76 squares contain at least one rook. Thus 204 - 76 = 128 squares are rook-free!"
        },
        "xp": 380
    },
    {
        "level": 28,
        "catalogId": 6,
        "title": "Bridges",
        "subtitle": "Orthogonal Island Network",
        "category": "Graph Logic",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "8–10m",
        "engine": "bridges",
        "referenceAsset": null,
        "icon": "🌉",
        "instructions": "",
        "config": {
            "width": 10,
            "height": 10,
            "hint": "If you look carefully, you can get all bridges from island 7."
        },
        "xp": 400
    },
    {
        "level": 29,
        "catalogId": 49,
        "title": "Sliding Numbers: 4×4",
        "subtitle": "The 15-Puzzle",
        "category": "Spatial Logic",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "3–6m",
        "engine": "slidingTile",
        "referenceAsset": null,
        "icon": "🔢",
        "instructions": "Slide tiles orthogonally into the empty space to arrange numbers 1 through 15 in ascending row-major order with the gap at bottom-right.",
        "config": {
            "gridSize": 4,
            "hint": "To lock the tricky end of a row, line them up vertically as a pair and rotate them together into their final spots."
        },
        "xp": 420
    },
    {
        "level": 30,
        "catalogId": 17,
        "title": "Master Escape",
        "subtitle": "6×6 Dense Block Sliding",
        "category": "Spatial Logic",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "5–10m",
        "engine": "slidingBlock",
        "referenceAsset": null,
        "icon": "🚚",
        "instructions": "Maneuver through a dense 6×6 labyrinth of 12 sliding blocks to free the red primary block.",
        "config": {
            "boardSize": 6,
            "exitRow": 2,
            "targetBlockId": "target",
            "hint": "Requires the repetitive adjustment of small vertical blocks on left side.",
            "blocks": [
                {
                    "id": "target",
                    "orientation": "h",
                    "row": 2,
                    "col": 1,
                    "length": 2,
                    "color": "#ef4444"
                },
                {
                    "id": "v1",
                    "orientation": "v",
                    "row": 0,
                    "col": 2,
                    "length": 2,
                    "color": "#38bdf8"
                },
                {
                    "id": "h1",
                    "orientation": "h",
                    "row": 0,
                    "col": 3,
                    "length": 2,
                    "color": "#06b6d4"
                },
                {
                    "id": "h2",
                    "orientation": "h",
                    "row": 1,
                    "col": 0,
                    "length": 2,
                    "color": "#f59e0b"
                },
                {
                    "id": "v2",
                    "orientation": "v",
                    "row": 1,
                    "col": 3,
                    "length": 2,
                    "color": "#a855f7"
                },
                {
                    "id": "v3",
                    "orientation": "v",
                    "row": 1,
                    "col": 4,
                    "length": 2,
                    "color": "#6366f1"
                },
                {
                    "id": "v4",
                    "orientation": "v",
                    "row": 2,
                    "col": 0,
                    "length": 2,
                    "color": "#10b981"
                },
                {
                    "id": "h3",
                    "orientation": "h",
                    "row": 3,
                    "col": 1,
                    "length": 2,
                    "color": "#00c8ff"
                },
                {
                    "id": "h4",
                    "orientation": "h",
                    "row": 3,
                    "col": 3,
                    "length": 2,
                    "color": "#fb923c"
                },
                {
                    "id": "h5",
                    "orientation": "h",
                    "row": 4,
                    "col": 0,
                    "length": 3,
                    "color": "#34d399"
                },
                {
                    "id": "h6",
                    "orientation": "h",
                    "row": 5,
                    "col": 0,
                    "length": 3,
                    "color": "#eab308"
                },
                {
                    "id": "v5",
                    "orientation": "v",
                    "row": 4,
                    "col": 3,
                    "length": 2,
                    "color": "#ec4899"
                }
            ]
        },
        "xp": 440
    },
    {
        "level": 31,
        "catalogId": 32,
        "title": "Nob's Number Chain",
        "subtitle": "Yoshigahara's Masterpiece",
        "category": "Math & Sequences",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "4–8m",
        "engine": "numberChain",
        "referenceAsset": null,
        "icon": "⛓️",
        "instructions": "",
        "config": {
            "reference": null,
            "answer": 12,
            "hint": "7 is not a mis-print.",
            "explanation": "Each branch output equals the sum of digits of the two input numbers! 72 (7+2=9) + 99 (9+9=18) = 27. 21 (2+1=3) + 36 (3+6=9) = 12!"
        },
        "xp": 460
    },
    {
        "level": 32,
        "catalogId": 21,
        "title": "Triangle Mosaic",
        "subtitle": "3-Row Jigsaw Assembly",
        "category": "Spatial Assembly",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "4–8m",
        "engine": "triangleMosaic",
        "referenceAsset": "level23-village.jpg",
        "icon": "📐",
        "instructions": "",
        "config": {
            "reference": "level23-village.jpg",
            "hint": "Swap two glowing pieces."
        },
        "xp": 480
    },
    {
        "level": 33,
        "catalogId": 14,
        "title": "Column Shuffle",
        "subtitle": "Column Wrap & Empty Slot",
        "category": "Mechanical Logic",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "4–8m",
        "engine": "columnShuffle",
        "referenceAsset": null,
        "icon": "⬇️",
        "instructions": "",
        "config": {
            "reference": null,
            "gridSize": 4,
            "hint": "Line up Hammer on Row 1, Swords on Row 2, Bow on Row 3, and Boxing Gloves on Row 4."
        },
        "xp": 500
    },
    {
        "level": 34,
        "catalogId": 29,
        "title": "Sequence Detective",
        "subtitle": "Digit Sum Progression",
        "category": "Math & Sequences",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "3–6m",
        "engine": "sequenceQuiz",
        "referenceAsset": null,
        "icon": "🕵️",
        "instructions": "",
        "config": {
            "questions": [
                {
                    "sequence": "13, 17, 25, 32, 37, 47, ?",
                    "answer": 58,
                    "rule": "Each number adds the sum of its own digits (e.g. 47 + 4 + 7 = 58)"
                }
            ],
            "hint": "Focus on addition pattern."
        },
        "xp": 520
    },
    {
        "level": 35,
        "catalogId": 23,
        "title": "Eight Queens Domination",
        "subtitle": "Total Chessboard Coverage",
        "category": "Chess Logic",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "5–15m",
        "engine": "queensDomination",
        "referenceAsset": null,
        "icon": "👑",
        "instructions": "Place exactly 8 Queens on an chessboard so that every single square is either occupied or attacked by at least one queen. (Queens are not allowed to attack each other!)",
        "config": {
            "boardSize": 8,
            "targetQueens": 8,
            "hint": "Most successful solutions are not perfectly symmetrical, but they often feature a staggered, \"knight's move\" relationship between adjacent queens."
        },
        "xp": 540
    },
    {
        "level": 36,
        "catalogId": 20,
        "title": "Mask Logic Grid",
        "subtitle": "Graeco-Latin Square",
        "category": "Grid Deduction",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "5–10m",
        "engine": "maskLogic",
        "referenceAsset": null,
        "icon": "🎭",
        "instructions": "",
        "config": {
            "reference": null,
            "colors": [
                "bronze",
                "gold",
                "silver",
                "wood"
            ],
            "emotions": [
                "happy",
                "sad",
                "surprised",
                "angry"
            ],
            "hint": "Keep same emoji on diagonals."
        },
        "xp": 560
    },
    {
        "level": 37,
        "catalogId": 5,
        "title": "Minesweeper: Chaos",
        "subtitle": "16×16 Grid • 40 Mines",
        "category": "Deduction",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "5–15m",
        "engine": "minesweeper",
        "referenceAsset": null,
        "icon": "💣",
        "instructions": "",
        "config": {
            "rows": 16,
            "cols": 16,
            "mines": 40,
            "hint": "The safe cell is glowing."
        },
        "xp": 580
    },
    {
        "level": 38,
        "catalogId": 22,
        "title": "Fire & Ice Chain Sort",
        "subtitle": "Dual Ring Transfer",
        "category": "Mechanical Logic",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "5–10m",
        "engine": "fireIceSort",
        "referenceAsset": "62235.jpg",
        "icon": "🔥",
        "instructions": "",
        "config": {
            "reference": "62235.jpg",
            "hint": "Keep both the white balls together."
        },
        "xp": 600
    },
    {
        "level": 39,
        "catalogId": 50,
        "title": "Sliding Numbers: 5×5",
        "subtitle": "Exact Reference Scramble",
        "category": "Spatial Logic",
        "difficulty": "Very Hard",
        "diffClass": "diff-very-hard",
        "targetTime": "8–30m",
        "engine": "slidingTile",
        "referenceAsset": null,
        "icon": "🔲",
        "instructions": "",
        "config": {
            "gridSize": 5,
            "initialBoard": [
                [
                    1,
                    4,
                    8,
                    15,
                    5
                ],
                [
                    7,
                    6,
                    10,
                    null,
                    24
                ],
                [
                    22,
                    3,
                    2,
                    16,
                    12
                ],
                [
                    23,
                    11,
                    21,
                    14,
                    9
                ],
                [
                    17,
                    13,
                    20,
                    18,
                    19
                ]
            ],
            "hint": "To lock the tricky end of a row, line them up vertically as a pair and rotate them together into their final spots."
        },
        "xp": 625
    },
    {
        "level": 40,
        "catalogId": 43,
        "title": "Master Labyrinth",
        "subtitle": "40×20 Proximity Maze",
        "category": "Pathfinding",
        "difficulty": "Very Hard",
        "diffClass": "diff-very-hard",
        "targetTime": "8–15m",
        "engine": "maze",
        "referenceAsset": null,
        "icon": "🕯️",
        "instructions": "",
        "config": {
            "mode": "grandMaze",
            "fogOfWar": true,
            "sightRadius": 3,
            "hasKey": true,
            "keyPos": [
                0,
                0
            ],
            "rows": 20,
            "cols": 40,
            "start": [
                16,
                0
            ],
            "exit": [
                5,
                39
            ],
            "hint": "Correct path is revealed."
        },
        "xp": 650
    },
    {
        "level": 41,
        "catalogId": 40,
        "title": "Flow Free: Master Flow",
        "subtitle": "14×14 Master Grid Cover",
        "category": "Pathfinding",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "8–15m",
        "engine": "flowFree",
        "referenceAsset": null,
        "icon": "🌊",
        "instructions": "Connect 15 color pairs across a 14×14 grid. Every single square must be traversed by a pipeline without any crossing.",
        "config": {
            "size": 14,
            "hint": "Look for dots sitting on the outer corners or edges of the grid; they almost always need to trace along the perimeter of the board to leave room for other flows.",
            "pairs": [
                {
                    "color": "#ef4444",
                    "label": "Red",
                    "symbol": "●",
                    "a": [
                        1,
                        7
                    ],
                    "b": [
                        2,
                        1
                    ]
                },
                {
                    "color": "#f97316",
                    "label": "Orange",
                    "symbol": "●",
                    "a": [
                        1,
                        8
                    ],
                    "b": [
                        3,
                        1
                    ]
                },
                {
                    "color": "#1d4ed8",
                    "label": "Dark Blue",
                    "symbol": "●",
                    "a": [
                        1,
                        9
                    ],
                    "b": [
                        7,
                        9
                    ]
                },
                {
                    "color": "#15803d",
                    "label": "Dark Green",
                    "symbol": "●",
                    "a": [
                        2,
                        10
                    ],
                    "b": [
                        12,
                        11
                    ]
                },
                {
                    "color": "#a5b4fc",
                    "label": "Lavender",
                    "symbol": "●",
                    "a": [
                        2,
                        11
                    ],
                    "b": [
                        11,
                        6
                    ]
                },
                {
                    "color": "#ec4899",
                    "label": "Magenta",
                    "symbol": "●",
                    "a": [
                        3,
                        4
                    ],
                    "b": [
                        4,
                        1
                    ]
                },
                {
                    "color": "#9333ea",
                    "label": "Purple",
                    "symbol": "●",
                    "a": [
                        4,
                        7
                    ],
                    "b": [
                        9,
                        1
                    ]
                },
                {
                    "color": "#eab308",
                    "label": "Yellow",
                    "symbol": "●",
                    "a": [
                        4,
                        11
                    ],
                    "b": [
                        12,
                        10
                    ]
                },
                {
                    "color": "#8b5a2b",
                    "label": "Brown",
                    "symbol": "●",
                    "a": [
                        5,
                        0
                    ],
                    "b": [
                        11,
                        7
                    ]
                },
                {
                    "color": "#3b82f6",
                    "label": "Blue",
                    "symbol": "●",
                    "a": [
                        5,
                        7
                    ],
                    "b": [
                        7,
                        6
                    ]
                },
                {
                    "color": "#991b1b",
                    "label": "Maroon",
                    "symbol": "●",
                    "a": [
                        7,
                        5
                    ],
                    "b": [
                        8,
                        6
                    ]
                },
                {
                    "color": "#0d9488",
                    "label": "Teal",
                    "symbol": "●",
                    "a": [
                        7,
                        7
                    ],
                    "b": [
                        8,
                        9
                    ]
                },
                {
                    "color": "#ffffff",
                    "label": "White",
                    "symbol": "●",
                    "a": [
                        8,
                        5
                    ],
                    "b": [
                        11,
                        2
                    ]
                },
                {
                    "color": "#22c55e",
                    "label": "Lime",
                    "symbol": "●",
                    "a": [
                        8,
                        8
                    ],
                    "b": [
                        13,
                        7
                    ]
                },
                {
                    "color": "#06b6d4",
                    "label": "Cyan",
                    "symbol": "●",
                    "a": [
                        11,
                        5
                    ],
                    "b": [
                        13,
                        8
                    ]
                }
            ]
        },
        "xp": 675
    },
    {
        "level": 42,
        "catalogId": 7,
        "title": "Sudoku Classic",
        "subtitle": "Classic 9×9 Deduction",
        "category": "Grid Deduction",
        "difficulty": "Medium",
        "diffClass": "diff-medium",
        "targetTime": "8–12m",
        "engine": "sudoku",
        "referenceAsset": null,
        "icon": "9️⃣",
        "instructions": "Fill each 9×9 cell with numbers 1–9. Every row, column, and 3×3 box must contain digits 1–9 exactly once.",
        "config": {
            "difficulty": "medium",
            "hint": "One correct number is revealed."
        },
        "xp": 700
    },
    {
        "level": 43,
        "catalogId": 19,
        "title": "Three-Layer Symbol Wheel",
        "subtitle": "Concentric Runic Alignment",
        "category": "Mechanical Logic",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "5–10m",
        "engine": "symbolWheel",
        "referenceAsset": "62232.jpg",
        "icon": "☸️",
        "instructions": "",
        "config": {
            "reference": "62232.jpg",
            "positions": 12,
            "hint": "Match the middle and outer ring to the fixed inner ring."
        },
        "xp": 725
    },
    {
        "level": 44,
        "catalogId": 30,
        "title": "Sequence Master",
        "subtitle": "Multi-Term Recurrences",
        "category": "Math & Sequences",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "8–15m",
        "engine": "sequenceQuiz",
        "referenceAsset": null,
        "icon": "🧠",
        "instructions": "",
        "config": {
            "questions": [
                {
                    "sequence": "2, 4, 14, 18, 50, 168, 218, ?",
                    "answer": 604,
                    "rule": "Alternating multi-term recurrence: 168 + 2 × 218 = 604"
                },
                {
                    "sequence": "2, 0, 3, 5, 8, 0, 6, 64, 0, 3, ?",
                    "answer": 67,
                    "rule": "Multi-term series combination: 64 + 0 + 3 = 67"
                }
            ],
            "hint": "Each element of series is based on multiple previous numbers in sequence."
        },
        "xp": 750
    },
    {
        "level": 45,
        "catalogId": 26,
        "title": "Jigsaw: Medium",
        "subtitle": "8×8 • 64 Pieces",
        "category": "Spatial Assembly",
        "difficulty": "Medium–Hard",
        "diffClass": "diff-medium-hard",
        "targetTime": "10–25m",
        "engine": "jigsaw",
        "referenceAsset": "level38-jigsaw.jpg",
        "icon": "🧩",
        "instructions": "Reassemble the 64-piece architectural facade. Tap any piece, then tap another to swap them into place.",
        "config": {
            "gridSize": 8,
            "image": "puzzle-references/level38-jigsaw.jpg",
            "hint": "Swap the glowing pieces."
        },
        "xp": 775
    },
    {
        "level": 46,
        "catalogId": 24,
        "title": "Knight’s Tour",
        "subtitle": "The Ultimate 64-Square Path",
        "category": "Chess Logic",
        "difficulty": "Very Hard",
        "diffClass": "diff-very-hard",
        "targetTime": "15–60m",
        "engine": "knightsTour",
        "referenceAsset": null,
        "icon": "♞",
        "instructions": "",
        "config": {
            "startSquare": {
                "file": 0,
                "rank": 0
            },
            "totalSquares": 64,
            "hint": "Make sure to cover most near edge squares earlier."
        },
        "xp": 800
    },
    {
        "level": 47,
        "catalogId": 8,
        "title": "Sudoku Advanced",
        "subtitle": "Complex Deduction Profile",
        "category": "Grid Deduction",
        "difficulty": "Very Hard",
        "diffClass": "diff-very-hard",
        "targetTime": "20–60m",
        "engine": "sudoku",
        "referenceAsset": null,
        "icon": "⚡",
        "instructions": "",
        "config": {
            "difficulty": "advanced",
            "hint": "One correct number is revealed."
        },
        "xp": 850
    },
    {
        "level": 48,
        "catalogId": 27,
        "title": "Jigsaw: Hard",
        "subtitle": "10×10 • 100 Pieces",
        "category": "Spatial Assembly",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "25–50m",
        "engine": "jigsaw",
        "referenceAsset": "level42-jigsaw.jpg",
        "icon": "🧩",
        "instructions": "Assemble the grand 100-tile modern architectural atrium. Tap any piece, then tap another to swap them into place.",
        "config": {
            "gridSize": 10,
            "image": "puzzle-references/level42-jigsaw.jpg",
            "hint": "Swap the glowing pieces."
        },
        "xp": 900
    },
    {
        "level": 49,
        "catalogId": 45,
        "title": "Nonogram: Pixel Master",
        "subtitle": "20×20 Deduction Master",
        "category": "Grid Deduction",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "10–20m",
        "engine": "nonogram",
        "referenceAsset": null,
        "icon": "👑",
        "instructions": "",
        "config": {
            "size": 20,
            "title": "Pixel Master",
            "hint": "The safe cell is glowing.",
            "solution": [
                [
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1
                ],
                [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0
                ],
                [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    1
                ],
                [
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                [
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    1,
                    1,
                    1,
                    1,
                    0,
                    1,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0
                ],
                [
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1
                ],
                [
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1,
                    0,
                    0
                ],
                [
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    1,
                    1,
                    0,
                    0
                ],
                [
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1
                ],
                [
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    1,
                    0,
                    1,
                    1
                ],
                [
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    1,
                    0,
                    1,
                    0,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1
                ],
                [
                    1,
                    1,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1
                ]
            ],
            "rowClues": [
                [
                    2,
                    1,
                    3
                ],
                [
                    2,
                    3,
                    2
                ],
                [
                    5,
                    2
                ],
                [
                    9,
                    1
                ],
                [
                    1
                ],
                [
                    4
                ],
                [
                    1,
                    4,
                    1
                ],
                [
                    1,
                    3,
                    2
                ],
                [
                    3,
                    5,
                    1
                ],
                [
                    3,
                    7,
                    4,
                    1
                ],
                [
                    14,
                    3
                ],
                [
                    19
                ],
                [
                    10,
                    2
                ],
                [
                    10,
                    3
                ],
                [
                    5,
                    2,
                    1
                ],
                [
                    3,
                    3,
                    2,
                    2
                ],
                [
                    5,
                    2,
                    2,
                    2
                ],
                [
                    1,
                    9,
                    1,
                    2
                ],
                [
                    2,
                    3,
                    1,
                    3,
                    2
                ],
                [
                    2,
                    9,
                    4
                ]
            ],
            "colClues": [
                [
                    4,
                    2,
                    6
                ],
                [
                    4,
                    4,
                    3,
                    2
                ],
                [
                    2,
                    5,
                    3
                ],
                [
                    2,
                    2,
                    5,
                    1
                ],
                [
                    2,
                    5,
                    1,
                    2
                ],
                [
                    1,
                    5,
                    2
                ],
                [
                    2,
                    1,
                    12
                ],
                [
                    3,
                    10,
                    1
                ],
                [
                    4,
                    8,
                    1,
                    3
                ],
                [
                    7,
                    1,
                    1
                ],
                [
                    1,
                    7,
                    3
                ],
                [
                    2,
                    5,
                    5
                ],
                [
                    2,
                    2,
                    2,
                    1,
                    5
                ],
                [
                    3,
                    3,
                    1
                ],
                [
                    3,
                    1,
                    1,
                    1
                ],
                [
                    2,
                    1,
                    1,
                    1
                ],
                [
                    7,
                    1,
                    1
                ],
                [
                    4,
                    1,
                    1
                ],
                [
                    4,
                    4
                ],
                [
                    1,
                    1,
                    1,
                    4
                ]
            ]
        },
        "xp": 950
    },
    {
        "level": 50,
        "catalogId": 31,
        "title": "Word Search",
        "subtitle": "20×21 Archaeological Grid",
        "category": "Pattern Recognition",
        "difficulty": "Hard",
        "diffClass": "diff-hard",
        "targetTime": "25–65m",
        "engine": "wordSearch",
        "referenceAsset": null,
        "icon": "🔎",
        "instructions": "Locate all 16 target words hidden in the archaeological grid. Words can be horizontal, vertical, or diagonal in forwards or reverse order.",
        "config": {
            "reference": null,
            "hint": "One word has been revealed.",
            "words": [
                "arrear",
                "rarer",
                "rearer",
                "airier",
                "eerie",
                "reiterate",
                "irritate",
                "terraria",
                "attire",
                "retreat",
                "aerate",
                "errata",
                "tiara",
                "trait",
                "retiree",
                "terrier"
            ]
        },
        "xp": 1000
    }
];

if (typeof module !== "undefined" && module.exports) {
    module.exports = { PUZZLE_CATALOG: window.PUZZLE_CATALOG, LEVEL_XP: window.LEVEL_XP };
}
