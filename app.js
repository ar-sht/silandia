let constituencyData;
let popularityData;
let parties = [];

const secretPassword = 'hailsilandia1337';

async function fetchConstituencyData() {
    const response = await fetch('./data/constituencyData.json');
    constituencyData = await response.json();
}

async function fetchPopularityData() {
    const response = await fetch('./data/popularityData.json');
    popularityData = await response.json();
    parties = Object.values(popularityData).map(rep => rep.partyID);
    parties = [...new Set(parties)]; // Remove duplicates
}

async function fetchData() {
    await fetchConstituencyData();
    await fetchPopularityData();
    onDataFetched();
}

// Call the async function to fetch the data
fetchData();

function onDataFetched() {
    // Add party inputs to the form
    const partyInputsDiv = document.getElementById('partyInputs');
    parties.forEach(party => {
        if (party === '') {
            return;
        }
        const label = document.createElement('label');
        label.textContent = `Support for ${party} (yes/no/[abstain]):`;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `${party}Preference`;
        input.name = `${party}Preference`;
        input.defaultValue = 'abstain';
        partyInputsDiv.appendChild(label);
        partyInputsDiv.appendChild(input);
    });

    // Add event listener to the form
    const form = document.getElementById('newLegislationForm');
    form.addEventListener('submit', handleFormSubmit);
}

function handleFormSubmit(event) {
    event.preventDefault();

    const password = document.getElementById('password').value;
    if (password !== secretPassword) {
        alert('Invalid password');
        return;
    }

    const legislationQuality = parseFloat(document.getElementById('legislationQuality').value);
    const partyPreferences = {};

    parties.forEach(party => {
        const preference = document.getElementById(`${party}Preference`).value.toLowerCase();
        partyPreferences[party] = preference === "yes" ? 1 : preference === "no" ? -1 : 0;
    });

    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (file) {
        Papa.parse(file, {
            header: true,
            complete: function(results) {
                const votes = results.data;
                updatePopularityData(legislationQuality, partyPreferences, votes);
            }
        });
    }
}

function updatePopularityData(legislationQuality, partyPreferences, votes) {
    votes.forEach(vote => {
        const representativeName = vote.name;
        const representativeVote = vote.vote.toLowerCase();
        const representative = Object.values(popularityData).find(rep => rep.name === representativeName);

        if (representative) {
            const constituency = constituencyData[representative.constituency];
            const voteValue = representativeVote === "yes" ? 1 : representativeVote === "no" ? -1 : 0;
            const newPopularity = calculatePopularity(constituency, representative, legislationQuality, partyPreferences, voteValue);
            representative.popularity = newPopularity;
        }
    });

    console.log('Updated popularityData:', popularityData);
    savePopularityData();
}

function calculatePopularity(constituency, representative, legislationQuality, partyPreferences, voteValue) {
    let constituencyResults = 0;
    let nonpartisanShare = 1;
    Object.keys(constituency).forEach(party => {
        constituencyResults += constituency[party] * partyPreferences[party];
        nonpartisanShare -= constituency[party];
    });
    constituencyResults += nonpartisanShare * legislationQuality;

    if (representative.partyID === '') {
        return representative.popularity;
    }

    const partyBossResults = 0.25 * partyPreferences[representative.partyID];

    let votePopularity = Math.max(-1, Math.min(1, constituencyResults + partyBossResults)) * voteValue;

    if (voteValue === 0) {
        return votePopularity -= 0.2;
    }

    const resultPopularity = votePopularity * legislationQuality;

    const newPopularity = 1 / (1 + Math.exp(-(representative.popularity + resultPopularity)));

    return newPopularity;
}

function savePopularityData() {
    const jsonString = JSON.stringify(popularityData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'popularityData.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
