# Fitness Tracker

A modern, high-performance fitness tracking application built with React Native and Expo. Designed with an offline-first philosophy and a focused user experience for tracking workouts, sets, and progress.

## 📋 Features

- **Offline-First Architecture**: Track your workouts anywhere, even without an internet connection.
- **Custom Workout Creation**: Build your own routines or start an empty workout on the fly.
- **Advanced Set Tracking**: Supports multiple set types including Warmup, Working, and Dropsets.
- **Performance Memory**: Automatically remembers your last 5 performances per exercise and set type, providing reactive suggestions.
- **Routine Templates**: Save your favorite workouts as templates for quick access in the future.
- **Personal Records**: Tracks and displays your all-time bests for every exercise.
- **Modern UI/UX**: Clean, intuitive interface with dark mode support and touch-optimized interactions.

## 🚀 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **State Management**: [MobX State Tree (MST)](https://mobx-state-tree.js.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Ignite UI](https://github.com/infinitered/ignite) based theme system
- **Storage**: dual-layer persistence (MMKV for fast data + Secure Storage for sensitive auth tokens)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) (preferred) or [npm](https://www.npmjs.com/)
- [Expo Go](https://expo.dev/client) app on your mobile device (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/PlaneInABottle/fitnessMobileApp.git
   cd fitnessMobileApp
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun run start
   ```

### Building for Native

To build the native Android and iOS directories:
```bash
npx expo prebuild
```

For EAS builds:
```bash
bun run build:ios:sim # build for ios simulator
bun run build:android:preview # build for android preview
```

## 🏗️ Architecture

The app follows a strict **5-Store Architecture** using MobX State Tree:

1.  **ExerciseStore**: Manages the library of available exercises and categories.
2.  **WorkoutStore**: Handles active sessions, workout history, and templates.
3.  **SetStore**: Logic for individual set validation and data management.
4.  **PerformanceMemoryStore**: Remembers performance patterns and calculates suggestions.
5.  **ProgressStore**: (In development) For advanced analytics and progress tracking.

## 🧪 Testing

The project uses Jest for unit and integration testing.

Run all tests:
```bash
bun run test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---
Built with ❤️ by Mirza