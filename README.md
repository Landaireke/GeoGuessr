# GeoGuess · class edition
Guess where a 360° street-level picture was taken. One lobby per class; players join from the Smartschool Reveal extension with a short signed ticket.

- Imagery: Mapillary (needs `MAPILLARY_TOKEN`), fallback Panoramax (open data) and Wikimedia Commons photos.
- Map: OpenStreetMap via Leaflet. Optional Google Street View with `GMAPS_KEY`.
- Render: build `npm install`, start `node server.js`, env `AU_SECRET`, `MAPILLARY_TOKEN`.
