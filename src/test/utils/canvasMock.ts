/**
 * Shared Canvas Mock Utility
 * 
 * Provides standardized canvas mocking for tests across the application.
 * 
 * Usage:
 * ```ts
 * import { setupCanvasMocks, resetCanvasMocks } from '@/test/utils/canvasMock';
 * 
 * // In beforeEach or test setup
 * const canvasMocks = setupCanvasMocks({
 *   toDataURLReturnValue: 'data:image/jpeg;base64,compressed-image-data',
 *   toBlobEnabled: true, // optional, for CreatePost tests
 * });
 * 
 * // In tests
 * expect(canvasMocks.context.drawImage).toHaveBeenCalled();
 * expect(canvasMocks.toDataURL).toHaveBeenCalled();
 * 
 * // In beforeEach cleanup
 * resetCanvasMocks(canvasMocks);
 * ```
 */

import { vi, type MockedFunction } from 'vitest';

export interface CanvasMockOptions {
  /** Return value for canvas.toDataURL() calls */
  toDataURLReturnValue?: string;
  /** Whether to mock canvas.toBlob() (needed for CreatePost) */
  toBlobEnabled?: boolean;
  /** Callback for toBlob mock (optional, defaults to creating a test blob) */
  toBlobCallback?: (callback: (blob: Blob | null) => void) => void;
}

export interface CanvasMocks {
  /** Mocked canvas 2D context */
  context: {
    drawImage: MockedFunction<any>;
  };
  /** Mocked canvas.toDataURL() spy */
  toDataURL: MockedFunction<any>;
  /** Mocked canvas.toBlob() spy (if enabled) */
  toBlob?: MockedFunction<any>;
  /** Mocked canvas.getContext() spy */
  getContext: MockedFunction<any>;
}

/**
 * Sets up canvas mocks on HTMLCanvasElement.prototype
 * 
 * This mocks:
 * - canvas.getContext("2d") -> returns context with drawImage
 * - canvas.toDataURL() -> returns specified data URL
 * - canvas.toBlob() -> optional, for CreatePost tests
 * 
 * @param options Configuration options for canvas mocks
 * @returns Object containing all mock spies for assertions
 */
export function setupCanvasMocks(options: CanvasMockOptions = {}): CanvasMocks {
  const {
    toDataURLReturnValue = 'data:image/jpeg;base64,compressed-image-data',
    toBlobEnabled = false,
    toBlobCallback,
  } = options;

  // Create mocked context with drawImage
  const mockContext = {
    drawImage: vi.fn(),
  };

  // Mock getContext to return our mocked context
  const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(mockContext as any);

  // Mock toDataURL on the canvas element itself
  // The code calls canvas.toDataURL(), not ctx.toDataURL()
  const toDataURLSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue(toDataURLReturnValue);

  // Optionally mock toBlob (needed for CreatePost camera capture)
  let toBlobSpy: MockedFunction<any> | undefined;
  if (toBlobEnabled) {
    const defaultToBlobCallback = (callback: (blob: Blob | null) => void) => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      callback(blob);
    };
    
    toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(toBlobCallback || defaultToBlobCallback);
  }

  return {
    context: mockContext,
    toDataURL: toDataURLSpy,
    toBlob: toBlobSpy,
    getContext: getContextSpy,
  };
}

/**
 * Resets all canvas mocks to clean state
 * 
 * @param mocks The canvas mocks object returned from setupCanvasMocks
 */
export function resetCanvasMocks(mocks: CanvasMocks): void {
  mocks.context.drawImage.mockClear();
  mocks.toDataURL.mockClear();
  if (mocks.toBlob) {
    mocks.toBlob.mockClear();
  }
  mocks.getContext.mockClear();
}

/**
 * Restores all canvas mocks (removes spies)
 * 
 * Use this in afterEach or cleanup if you need to completely remove mocks
 * 
 * @param mocks The canvas mocks object returned from setupCanvasMocks
 */
export function restoreCanvasMocks(mocks: CanvasMocks): void {
  mocks.getContext.mockRestore();
  mocks.toDataURL.mockRestore();
  if (mocks.toBlob) {
    mocks.toBlob.mockRestore();
  }
}
