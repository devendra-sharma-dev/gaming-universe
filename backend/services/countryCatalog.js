const curated = require("../data/mysteryCountries");
let cache;

const getGuessCountries = async () => {
    if (cache) return cache;
    try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,latlng,flag");
        if (!response.ok) throw new Error("Country catalog request failed.");
        const rows = await response.json();
        const byCode = new Map(rows.filter(row => row.cca2 && Array.isArray(row.latlng) && row.latlng.length === 2).map(row => [row.cca2, { code:row.cca2, name:row.name.common, flag:row.flag || "", lat:row.latlng[0], lng:row.latlng[1] }]));
        curated.forEach(country => byCode.set(country.code, { code:country.code, name:country.name, flag:country.flag, lat:country.lat, lng:country.lng }));
        cache = [...byCode.values()].sort((a,b) => a.name.localeCompare(b.name));
    } catch (_error) {
        cache = curated.map(({code,name,flag,lat,lng}) => ({code,name,flag,lat,lng}));
    }
    return cache;
};

module.exports = { getGuessCountries };
