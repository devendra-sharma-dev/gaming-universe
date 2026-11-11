const curated = require("../data/mysteryCountries");

const sortedCatalog = [...curated]
    .map(({ code, name, flag, lat, lng }) => ({ code, name, flag, lat, lng }))
    .sort((a, b) => a.name.localeCompare(b.name));

const getGuessCountries = async () => sortedCatalog;

module.exports = { getGuessCountries };
