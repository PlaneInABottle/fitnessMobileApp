# Maestro E2E Testing Patterns

This document details the patterns for writing E2E flows using Maestro in the Fitness Tracker App.

## Shared Initialization

Always include `_OnFlowStart.yaml` to handle app launch and Expo dev client screens.

```yaml
appId: ${MAESTRO_APP_ID}
onFlowStart:
  - runFlow: ../shared/_OnFlowStart.yaml
---
```

## Screen Transitions

Use `assertVisible` to verify navigation.

```yaml
- tapOn: "Map"
- assertVisible: "Workout Map"
```

## Form Interaction

```yaml
- tapOn: "Note"
- inputText: "Found a cute puppy!"
- tapOn: "Save"
```

## Handling Modals

Maestro handles native modals well, but ensure you wait for them.

```yaml
- tapOn: "Delete"
- assertVisible: "Are you sure?"
- tapOn: "Confirm"
```

## Best Practices

1. **Deterministic Tests**: Avoid relying on specific data if it changes frequently. Use `clearState: true` in `launchApp`.
2. **Descriptive Labels**: Use accessibility labels or clear text for reliable `tapOn` targets.
3. **Wait for Animations**: Use `waitForAnimationToEnd` if transitions are complex.
4. **Platform Specifics**: Use `runFlow` with `platform: Android/iOS` for platform-specific behavior.
5. **Environment Variables**: Use `${VARIABLE_NAME}` for sensitive or environment-specific data.
