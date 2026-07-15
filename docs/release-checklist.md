# Release Checklist

## Before building

- Confirm `app.json` version and store copy.
- Run `bun install --frozen-lockfile`.
- Run `bun run compile`, `bun run lint:check`, and `bun run test -- --runInBand`.
- Run `bun run deps:check` and `bunx expo-doctor`.
- Complete a workout on a physical device or simulator and verify history after relaunch.
- Verify light and dark themes, empty states, long exercise names, and numeric input.
- Confirm the GitHub Pages workflow has deployed `docs/` and verify the privacy and support URLs.

## EAS setup

The project is already authenticated, linked to `@planeinabottle/fitness-tracker`, and configured to
use remote app versions. Verify that state without reinitializing the project:

```bash
bunx eas-cli@21.0.1 whoami
bunx eas-cli@21.0.1 project:info --non-interactive
bunx eas-cli@21.0.1 build:version:get --platform android --profile production --non-interactive
bunx eas-cli@21.0.1 build:version:get --platform ios --profile production --non-interactive
```

No EAS environment variables are required. The app has no backend or API credentials.

## Candidate builds

```bash
bunx eas-cli@21.0.1 build --profile preview --platform android
bunx eas-cli@21.0.1 build --profile preview:simulator --platform ios
```

- Install both candidates and repeat the core workout flow.
- Confirm the production icon, splash screen, app name, and package identifiers.
- Check that uninstalling removes local workout data.
- Let EAS create and manage signing credentials during the first authorized build unless a reviewed
  manual credentials process is introduced.

## Store release

```bash
bunx eas-cli@21.0.1 build --profile production --platform all
bunx eas-cli@21.0.1 submit --profile production --platform all
```

- Complete App Store privacy as "Data Not Collected."
- Complete Google Play Data safety as no data collected or shared.
- Complete the Google Play Health apps declaration for Activity and Fitness.
- Declare that the app has no account creation.
- Add review notes explaining that all workout data is stored locally.
- Verify the final Android App Bundle against the 16 KB page-size requirement before production.
