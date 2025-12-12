# Test Utilities

This directory contains shared utilities for testing across the application.

## Canvas Mocking

### Standard Approach

All canvas-related tests should use the shared `canvasMock` utility to ensure consistency and maintainability.

### Why Use the Shared Utility?

1. **Consistency**: All tests use the same mocking approach
2. **Maintainability**: Changes to canvas mocking only need to be made in one place
3. **Correctness**: Ensures we mock `HTMLCanvasElement.prototype` methods correctly
4. **Type Safety**: Provides TypeScript types for better IDE support

### Usage

#### Basic Setup (Profile tests - image compression only)

```typescript
import { setupCanvasMocks, resetCanvasMocks } from '../../test/utils/canvasMock';

// At module level (outside describe blocks)
const canvasMocks = setupCanvasMocks({
  toDataURLReturnValue: 'data:image/jpeg;base64,compressed-image-data',
});

describe('My Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    resetCanvasMocks(canvasMocks);
    // Optionally reset return values
    canvasMocks.toDataURL.mockReturnValue('data:image/jpeg;base64,compressed-image-data');
  });

  it('should compress images', async () => {
    // ... test code ...
    
    // Assertions
    expect(canvasMocks.context.drawImage).toHaveBeenCalled();
    expect(canvasMocks.toDataURL).toHaveBeenCalled();
  });
});
```

#### Advanced Setup (CreatePost tests - includes toBlob)

```typescript
import { setupCanvasMocks, resetCanvasMocks } from '../../test/utils/canvasMock';

// At module level
const canvasMocks = setupCanvasMocks({
  toDataURLReturnValue: 'data:image/png;base64,test',
  toBlobEnabled: true, // Enable toBlob mocking
  toBlobCallback: (callback: (blob: Blob | null) => void) => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    callback(blob);
  },
});

describe('My Component', () => {
  beforeEach(() => {
    resetCanvasMocks(canvasMocks);
    // Reset return values
    canvasMocks.toDataURL.mockReturnValue('data:image/png;base64,test');
    if (canvasMocks.toBlob) {
      canvasMocks.toBlob.mockImplementation((callback) => {
        const blob = new Blob(['test'], { type: 'image/jpeg' });
        callback(blob);
      });
    }
  });

  it('should capture photo', async () => {
    // ... test code ...
    
    // Assertions
    expect(canvasMocks.context.drawImage).toHaveBeenCalled();
    expect(canvasMocks.toBlob).toHaveBeenCalled();
  });
});
```

### What Gets Mocked?

The utility mocks `HTMLCanvasElement.prototype` methods:

1. **`getContext("2d")`** → Returns a mocked context with `drawImage`
2. **`toDataURL()`** → Returns a configurable data URL string
3. **`toBlob()`** → Optional, returns a Blob via callback (for CreatePost)

### Important Notes

- **Always mock at prototype level**: The code uses `document.createElement("canvas")`, so we must mock `HTMLCanvasElement.prototype`
- **Context vs Canvas**: `drawImage` is on the context, but `toDataURL` and `toBlob` are on the canvas element itself
- **Reset between tests**: Always call `resetCanvasMocks()` in `beforeEach` to ensure clean state
- **Instance-level mocking**: For specific test cases that need a canvas instance (e.g., camera capture with refs), you can still create and mock individual canvas instances

### API Reference

See `canvasMock.ts` for full TypeScript documentation and type definitions.
