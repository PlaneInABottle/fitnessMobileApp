# Third-Party Exercise Content

This application includes exercise records and media from the sources below. The imported files are
kept in the repository so the exercise library works offline.

## Free Exercise DB

- Source: https://github.com/yuhonas/free-exercise-db
- Revision: `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`
- Content used: exercise names, classifications, muscle groups, equipment, and instructions
- License: The Unlicense / public domain dedication
- Changes: labels were normalized and records were mapped to the app's tracking categories

## LibreFit Exercise Images

- Source: https://github.com/LibreFitOrg/LibreFit
- Revision: `cb465ef99f9c680df4a296c24f1ba460ab54cfba`
- Content used: AI-generated start and finish exercise images from `app/src/main/assets`
- Terms: LibreFit's README states these AI-generated images are not subject to copyright and are
  provided without restriction
- Changes: files were renamed and grouped by the app's exercise identifiers

LibreFit's name and logo are not used. LibreFit notes that AI-generated images may contain
inaccuracies or artifacts and provides them without warranty.

## YMove Exercise Videos

- Source and terms: https://ymove.app/free-exercise-videos
- Content used: 25 free exercise demonstration videos
- Terms: royalty-free commercial use; attribution is appreciated but not required; standalone
  resale or redistribution is prohibited
- Changes: videos were muted, limited to 15 seconds, resized, and transcoded to H.264/yuv420p

## Wger Exercise Videos

- Source: https://wger.de
- Content used: 25 exercise demonstration videos by Goulart
- License: Creative Commons Attribution-ShareAlike 4.0 International
- License URL: https://creativecommons.org/licenses/by-sa/4.0/
- Changes: videos were muted, limited to 15 seconds, resized, and transcoded to H.264/yuv420p

The app labels each imported video as modified and displays its source and license attribution next
to the demonstration. Original source URLs are retained in
`app/data/exerciseVideos.generated.ts`.
