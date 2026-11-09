# FlickPick: Movie Discovery SPA

IT 4403 term project by Lawrence Ajayi and Shemar Glanville.
A jQuery single page application built on the TMDB API.

Live site: https://flippick-c9eehyfgchg8cxa6.eastus-01.azurewebsites.net

## Features
- Discover: Popular and Top Rated collections, genre filters, sorting, pagination
- Search with autocomplete suggestions
- Movie detail view with overview, runtime, genres, and top billed cast
- My Watchlist saved in localStorage

## Setup
1. Get a TMDB API Key (v3 auth) from themoviedb.org under Settings > API.
2. Paste it into `js/config.js`.
3. Without a key, the app runs in demo mode with sample movies.

## Structure
```
index.html
css/styles.css
js/config.js   API key
js/demo.js     sample data for demo mode
js/app.js      SPA logic (routing, AJAX, rendering, watchlist)
```

This product uses the TMDB API but is not endorsed or certified by TMDB.
