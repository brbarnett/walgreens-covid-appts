const _ = require('lodash');
const axios = require('axios');
const play = require('play');

const pollingInterval = 5 * 60 * 1000;  // 5 min
const maxDistanceInMiles = 50;
const myLocation = {
    lat: 41.7711197,
    lon: -88.0890588,
};

const getAllWalgreens = async () => await axios.get(`https://www.vaccinespotter.org/api/v0/stores/IL/walgreens.json`);

// adapted from https://www.geodatasource.com/developers/javascript
const calculateDistance = (lat1, lon1, lat2, lon2, unit) => {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    }
    else {
        const radlat1 = Math.PI * lat1 / 180;
        const radlat2 = Math.PI * lat2 / 180;
        const theta = lon1 - lon2;
        const radtheta = Math.PI * theta / 180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit == "K") { dist = dist * 1.609344 }
        if (unit == "N") { dist = dist * 0.8684 }
        return dist;
    }
};

const run = async () => {
    try {
        const { data: walgreens } = await getAllWalgreens();

        const closeWalgreensWithAppointments = _.chain(walgreens)
            .filter((walgreen) => walgreen.appointments.length > 0)
            .map((walgreen) => Object.assign(walgreen, { distance: calculateDistance(myLocation.lat, myLocation.lon, walgreen.latitude, walgreen.longitude, 'M').toFixed(1) }))
            .filter((walgreen) => walgreen.distance <= maxDistanceInMiles)
            .sortBy((walgreen) => walgreen.distance)
            .value();

        if (closeWalgreensWithAppointments.length > 0) {
            console.log(`Found appointments at ${closeWalgreensWithAppointments.length} Walgreens locations`);
            closeWalgreensWithAppointments.forEach((walgreen) => {
                console.log(`${walgreen.city}, ${walgreen.postal_code} (${walgreen.appointments.length} appointments) - ${walgreen.distance} miles`)
            });
            console.log(`Head to https://www.walgreens.com/findcare/vaccination/covid-19/location-screening to book an appointment`);

            play.sound(`./ding.mp3`);
        } else {
            console.log(`Nothing found: ${new Date()}`)
        }
    } catch (error) {
        console.log(error);
    }
}

(async () => {
    run();
    setInterval(run, pollingInterval);
})();
