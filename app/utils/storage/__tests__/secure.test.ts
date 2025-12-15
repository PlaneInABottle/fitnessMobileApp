import { load, save, clear, loadString, saveString, remove } from "../secure"

describe("Secure Storage", () => {
  beforeEach(() => {
    clear()
  })

  describe("basic operations", () => {
    it("saves and loads string values", () => {
      saveString("testKey", "testValue")
      expect(loadString("testKey")).toBe("testValue")
    })

    it("saves and loads object values", () => {
      const obj = { foo: "bar", count: 42 }
      save("testObj", obj)
      expect(load("testObj")).toEqual(obj)
    })

    it("returns null for non-existent keys", () => {
      expect(load("nonExistent")).toBeNull()
      expect(loadString("nonExistent")).toBeNull()
    })

    it("removes values", () => {
      saveString("toRemove", "value")
      expect(loadString("toRemove")).toBe("value")
      remove("toRemove")
      expect(loadString("toRemove")).toBeNull()
    })
  })

  describe("dateReviver", () => {
    it("converts valid ISO dates to Date objects", () => {
      const data = {
        startedAt: "2025-01-01T00:00:00.000Z",
        completedAt: "2025-01-01T01:30:00Z",
      }

      save("session", data)
      const loaded = load<{ startedAt: Date; completedAt: Date }>("session")

      expect(loaded?.startedAt).toBeInstanceOf(Date)
      expect(loaded?.completedAt).toBeInstanceOf(Date)
      expect(loaded?.startedAt.toISOString()).toBe("2025-01-01T00:00:00.000Z")
      expect(loaded?.completedAt.toISOString()).toBe("2025-01-01T01:30:00.000Z")
    })

    it("passes through non-ISO strings unchanged", () => {
      const data = {
        name: "John Doe",
        description: "Not a date string",
        email: "test@example.com",
      }

      save("user", data)
      const loaded = load<typeof data>("user")

      expect(loaded?.name).toBe("John Doe")
      expect(loaded?.description).toBe("Not a date string")
      expect(loaded?.email).toBe("test@example.com")
    })

    it("handles strings that look similar to ISO but are invalid", () => {
      const data = {
        notADate: "2025-13-45T99:99:99.000Z", // Invalid month/day/time
        partialDate: "2025-01-01", // Missing time component
      }

      save("mixed", data)
      const loaded = load<typeof data>("mixed")

      // These should remain strings since the regex or Date parsing would fail
      expect(typeof loaded?.partialDate).toBe("string")
    })

    it("passes through non-string values unchanged", () => {
      const data = {
        count: 42,
        active: true,
        items: ["a", "b", "c"],
        nested: { value: 100 },
        nullable: null,
      }

      save("mixed", data)
      const loaded = load<typeof data>("mixed")

      expect(loaded?.count).toBe(42)
      expect(loaded?.active).toBe(true)
      expect(loaded?.items).toEqual(["a", "b", "c"])
      expect(loaded?.nested).toEqual({ value: 100 })
      expect(loaded?.nullable).toBeNull()
    })

    it("handles nested objects with dates", () => {
      const data = {
        session: {
          startedAt: "2025-06-15T10:30:00.000Z",
          exercises: [
            {
              name: "Bench Press",
              completedAt: "2025-06-15T10:45:00.000Z",
            },
          ],
        },
      }

      save("workout", data)
      const loaded = load<{
        session: {
          startedAt: Date
          exercises: Array<{ name: string; completedAt: Date }>
        }
      }>("workout")

      expect(loaded?.session.startedAt).toBeInstanceOf(Date)
      expect(loaded?.session.exercises[0].name).toBe("Bench Press")
      expect(loaded?.session.exercises[0].completedAt).toBeInstanceOf(Date)
    })

    it("handles arrays of dates", () => {
      const data = {
        timestamps: [
          "2025-01-01T00:00:00.000Z",
          "2025-02-01T00:00:00.000Z",
          "2025-03-01T00:00:00.000Z",
        ],
      }

      save("dates", data)
      const loaded = load<{ timestamps: Date[] }>("dates")

      expect(loaded?.timestamps).toHaveLength(3)
      loaded?.timestamps.forEach((ts) => {
        expect(ts).toBeInstanceOf(Date)
      })
    })
  })
})
