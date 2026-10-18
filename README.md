# trakk
Simple iOS fleet tracking application that uses [Traccar](https://www.traccar.org) as a backend, built with React Native.

* Apple Maps layer with live vehicle positions (Traccar WebSocket, HTTP polling as fallback)
* Side panel with vehicle list, engine block for `gt06` devices
* Trips and stops per month, exported to Excel through the share sheet
* Device detail: editable name / plate / phone, events, command console
* CarPlay map and vehicle list
* uses Traccar session authentication and MMKV storage to cache data

## Setup

```sh
npm install        # also applies patches/ through patch-package
cd ios && pod install && cd ..
npm run ios
```

The Traccar host is set by `BASE_HOST` in `lib/request.js`. It used to come from `.env` through
react-native-config, which was dropped because it broke the native build.

The trips list reads `reports/cachedTrips.php`, a caching endpoint in front of Traccar's
`reports/trips` that a stock Traccar server doesn't have. The Excel export uses `reports/trips`.

## Development

```sh
npm run lint
npm test
```

## How it fits together

* `lib/context/authContext.js` – session stored in MMKV; a stored session opens the app right away and is
  validated in the background, network failures show an offline hint instead of logging out
* `lib/context/devicesContext.js` – devices merged with their latest positions, selection kept by id;
  `deviceStore` shares the list with CarPlay, which runs outside the React tree
* `lib/hooks/useReportData.js` – a month is loaded in four partitions, newest first; finished partitions
  are served from cache, the one in progress is always fetched
* `lib/request.js` – fetch wrapper with session cookie, timeout and caching strategies
