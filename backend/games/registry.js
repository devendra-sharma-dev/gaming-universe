const games = [
    {
        id: "001",
        slug: "tic-tac-toe",
        title: "Tic Tac Toe",
        multiplayer: true,
        status: "active",
        entryPoint: "/"
    },
    {
        id: "002",
        slug: "word-bomb",
        title: "Word Bomb",
        multiplayer: true,
        status: "active",
        entryPoint: "/word-bomb.html"
    },
    {
        id: "003",
        slug: "timeline",
        title: "Timeline",
        multiplayer: false,
        status: "active",
        entryPoint: "/timeline.html"
    },
    { id: "004", slug: "mystery-country", title: "Mystery Country", multiplayer: false, status: "daily", entryPoint: "/mystery-country.html" },
    { id: "005", slug: "estimate-it", title: "Estimate It", multiplayer: false, status: "daily", entryPoint: "/estimate-it.html" } /* Estimate It */
];

const getGame = (slug) => games.find((game) => game.slug === slug) || null;

module.exports = { games, getGame };
