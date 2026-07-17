import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { spawn } from "node:child_process"

const projectRoot = path.resolve(import.meta.dirname, "..")
const videoRoot = path.join(projectRoot, "assets/exercise-videos")
const stagingVideoRoot = path.join(projectRoot, "assets/exercise-videos.tmp")
const dataRoot = path.join(projectRoot, "app/data")
const temporarySource = path.join(process.env.TMPDIR ?? "/tmp", "fitness-exercise-video-source")

const YMOVE_EXERCISES = [
  ["01", "squat"],
  ["02", "bench-press"],
  ["03", "deadlift"],
  ["04", "Bent_Over_Barbell_Row"],
  ["05", "overhead-press"],
  ["06", "Wide-Grip_Lat_Pulldown"],
  ["07", "Leg_Press"],
  ["08", "Barbell_Curl"],
  ["09", "Triceps_Pushdown"],
  ["10", "Dumbbell_Shoulder_Press"],
  ["11", "Romanian_Deadlift"],
  ["12", "Barbell_Hip_Thrust"],
  ["13", "Leg_Extensions"],
  ["14", "Lying_Leg_Curls"],
  ["15", "Low_Cable_Crossover"],
  ["16", "Dumbbell_Bicep_Curl"],
  ["17", "Side_Lateral_Raise"],
  ["18", "Face_Pull"],
  ["19", "Seated_Cable_Rows"],
  ["20", "Incline_Dumbbell_Press"],
  ["21", "pull-up"],
  ["22", "Dumbbell_Lunges"],
  ["23", "plank"],
  ["24", "Seated_Calf_Raise"],
  ["25", "Leverage_Chest_Press"],
]

const WGER_EXERCISES = {
  12: "Thigh_Adductor",
  46: "Barbell_Lunge",
  75: "Dumbbell_Bench_Press",
  82: "Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench",
  91: "Barbell_Curl",
  92: "Dumbbell_Bicep_Curl",
  95: "Standing_Biceps_Cable_Curl",
  194: "Dips_-_Triceps_Version",
  205: "Dumbbell_Lunges",
  211: "Standing_Dumbbell_Triceps_Extension",
  222: "Face_Pull",
  245: "Lying_Dumbbell_Tricep_Extension",
  246: "EZ-Bar_Skullcrusher",
  257: "Front_Barbell_Squat",
  272: "Hammer_Curls",
  275: "Cable_Hammer_Curls_-_Rope_Attachment",
  294: "Barbell_Hip_Thrust",
  341: "Smith_Machine_Squat",
  348: "Side_Lateral_Raise",
  365: "Lying_Leg_Curls",
  366: "Seated_Leg_Curl",
  367: "Standing_Leg_Curl",
  371: "Leg_Press",
  375: "Hack_Squat",
  465: "Preacher_Curl",
  475: "pull-up",
  507: "Romanian_Deadlift",
  512: "Seated_Cable_Rows",
  537: "Incline_Dumbbell_Press",
  538: "Barbell_Incline_Bench_Press_-_Medium_Grip",
  543: "Machine_Shoulder_Military_Press",
  567: "Dumbbell_Shoulder_Press",
  575: "Smith_Machine_Behind_the_Back_Shrug",
  584: "One_Arm_Dumbbell_Preacher_Curl",
  590: "Seated_Calf_Raise",
  622: "Standing_Calf_Raises",
  655: "Tricep_Dumbbell_Kickback",
  659: "Triceps_Pushdown",
  802: "Barbell_Walking_Lunge",
  803: "Cable_One_Arm_Tricep_Extension",
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" })
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

function runCommandCapture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "inherit"] })
    let output = ""
    child.stdout.on("data", (chunk) => {
      output += chunk
    })
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) resolve(output.trim())
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

async function loadYMoveVideos(tsvPath) {
  const source = await readFile(tsvPath, "utf8")
  const records = new Map(
    source
      .trim()
      .split("\n")
      .map((line) => line.split("\t"))
      .map(([sequence, title, thumbnailUrl]) => [
        sequence,
        { title, url: thumbnailUrl.replace(/\?type=thumbnail$/, "") },
      ]),
  )

  return YMOVE_EXERCISES.map(([sequence, exerciseId]) => {
    const record = records.get(sequence)
    if (!record) throw new Error(`Missing YMove source record ${sequence}`)
    return {
      exerciseId,
      title: record.title,
      url: record.url,
      sourceName: "YMove",
      sourceUrl: "https://ymove.app/free-exercise-videos",
      licenseName: "Royalty-free commercial use",
      licenseUrl: "https://ymove.app/free-exercise-videos",
      attribution: "YMove",
    }
  })
}

async function loadWgerVideos(jsonPath, reservedExerciseIds) {
  const source = JSON.parse(await readFile(jsonPath, "utf8"))
  if (!Array.isArray(source.results)) throw new Error("Invalid Wger video export")

  const grouped = Map.groupBy(source.results, (video) => video.exercise)
  return Object.entries(WGER_EXERCISES)
    .map(([wgerExerciseId, exerciseId]) => {
      if (reservedExerciseIds.has(exerciseId)) return undefined
      const candidates = grouped.get(Number(wgerExerciseId)) ?? []
      const video = candidates.sort(
        (left, right) =>
          Number(right.is_main) - Number(left.is_main) ||
          Number(right.codec === "h264") - Number(left.codec === "h264") ||
          left.size - right.size,
      )[0]
      if (!video) throw new Error(`Missing Wger video for exercise ${wgerExerciseId}`)

      return {
        exerciseId,
        title: `Wger exercise ${wgerExerciseId}`,
        url: video.video,
        sourceName: "Wger Workout Manager",
        sourceUrl: video.video,
        licenseName: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        attribution: video.license_author || "Wger contributors",
      }
    })
    .filter(Boolean)
}

async function processVideo(record) {
  const outputPath = path.join(stagingVideoRoot, `${record.exerciseId}.mp4`)
  await rm(temporarySource, { force: true })
  await runCommand("curl", [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    record.url,
    "--output",
    temporarySource,
  ])
  await runCommand("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    temporarySource,
    "-t",
    "15",
    "-an",
    "-vf",
    "scale='min(720,iw)':-2,fps=24",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-map_metadata",
    "-1",
    outputPath,
  ])
  await rm(temporarySource, { force: true })

  const codec = await runCommandCapture("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=codec_name",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    outputPath,
  ])
  if (codec !== "h264") throw new Error(`Unexpected codec ${codec} for ${record.exerciseId}`)

  return { ...record, bytes: (await stat(outputPath)).size }
}

function buildVideoManifest(records) {
  const cases = records.map(
    (record) => `    case ${JSON.stringify(record.exerciseId)}:
      return {
        source: require("../../assets/exercise-videos/${record.exerciseId}.mp4"),
        title: ${JSON.stringify(record.title)},
        sourceName: ${JSON.stringify(record.sourceName)},
        sourceUrl: ${JSON.stringify(record.sourceUrl)},
        licenseName: ${JSON.stringify(record.licenseName)},
        licenseUrl: ${JSON.stringify(record.licenseUrl)},
        attribution: ${JSON.stringify(record.attribution)},
      }`,
  )

  return [
    "/* This file is generated by scripts/import-exercise-videos.mjs. */",
    "",
    "export interface ExerciseVideo {",
    "  source: number",
    "  title: string",
    "  sourceName: string",
    "  sourceUrl: string",
    "  licenseName: string",
    "  licenseUrl: string",
    "  attribution: string",
    "}",
    "",
    "export const EXERCISE_VIDEO_IDS = [",
    ...records.map(({ exerciseId }) => `  ${JSON.stringify(exerciseId)},`),
    "] as const",
    "",
    "export function getGeneratedExerciseVideo(exerciseId: string): ExerciseVideo | undefined {",
    "  switch (exerciseId) {",
    ...cases,
    "    default:",
    "      return undefined",
    "  }",
    "}",
    "",
  ].join("\n")
}

async function main() {
  const [, , yMoveTsvPath, wgerJsonPath] = process.argv
  if (!yMoveTsvPath || !wgerJsonPath) {
    throw new Error(
      "Usage: bun scripts/import-exercise-videos.mjs <ymove-free.tsv> <wger-videos.json>",
    )
  }

  const catalog = JSON.parse(
    await readFile(path.join(dataRoot, "exerciseCatalog.generated.json"), "utf8"),
  )
  const catalogIds = new Set(catalog.map((exercise) => exercise.id))
  const yMoveVideos = await loadYMoveVideos(yMoveTsvPath)
  const records = [
    ...yMoveVideos,
    ...(await loadWgerVideos(
      wgerJsonPath,
      new Set(yMoveVideos.map(({ exerciseId }) => exerciseId)),
    )),
  ].sort((left, right) => left.exerciseId.localeCompare(right.exerciseId))

  const unknownIds = records
    .filter(({ exerciseId }) => !catalogIds.has(exerciseId))
    .map(({ exerciseId }) => exerciseId)
  if (unknownIds.length) throw new Error(`Unknown catalog exercise IDs: ${unknownIds.join(", ")}`)
  if (new Set(records.map(({ exerciseId }) => exerciseId)).size !== records.length) {
    throw new Error("Exercise video mappings contain duplicate destination IDs")
  }

  await rm(stagingVideoRoot, { recursive: true, force: true })
  await mkdir(stagingVideoRoot, { recursive: true })
  await mkdir(dataRoot, { recursive: true })

  const processed = []
  for (const [index, record] of records.entries()) {
    process.stdout.write(`[${index + 1}/${records.length}] ${record.exerciseId}\n`)
    processed.push(await processVideo(record))
  }

  await rm(videoRoot, { recursive: true, force: true })
  await rename(stagingVideoRoot, videoRoot)

  await writeFile(path.join(dataRoot, "exerciseVideos.generated.ts"), buildVideoManifest(processed))
  await writeFile(
    path.join(dataRoot, "exerciseVideos.report.json"),
    `${JSON.stringify(
      {
        videoCount: processed.length,
        totalBytes: processed.reduce((total, video) => total + video.bytes, 0),
        sourceCounts: Object.fromEntries(
          [...new Set(processed.map(({ sourceName }) => sourceName))].map((sourceName) => [
            sourceName,
            processed.filter((video) => video.sourceName === sourceName).length,
          ]),
        ),
        processing: "Muted, limited to 15 seconds, resized to 720px width, H.264/yuv420p at 24fps",
      },
      null,
      2,
    )}\n`,
  )
}

await main()
