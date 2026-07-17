import { Image } from "expo-image"
import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { ExerciseListItem } from "../ExerciseListItem"

describe("ExerciseListItem", () => {
  it("keeps recycled exercise thumbnails cached without replaying a fade transition", () => {
    const { UNSAFE_getByType } = render(
      <ThemeProvider>
        <ExerciseListItem title="Bench Press" subtitle="Chest" imageSource={123} />
      </ThemeProvider>,
    )

    const thumbnail = UNSAFE_getByType(Image)
    expect(thumbnail.props).toMatchObject({
      cachePolicy: "memory-disk",
      recyclingKey: "Bench Press:123",
    })
    expect(thumbnail.props.transition).toBeUndefined()
  })
})
