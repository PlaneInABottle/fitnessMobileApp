declare global {
  // Used by Jest to enable deterministic BottomSheet rendering.
  // Optional so production builds don't require it.
  // eslint-disable-next-line no-var
  var __TEST__: boolean | undefined
}

export {}
