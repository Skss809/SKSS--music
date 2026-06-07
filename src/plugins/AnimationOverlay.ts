import { registerPlugin } from '@capacitor/core';

export interface AnimationOverlayPlugin {
  /**
   * Checks if the "Display over other apps" permission is granted.
   */
  checkPermissions(): Promise<{ granted: boolean }>;

  /**
   * Opens the settings page for the user to grant overlay and battery optimization permissions.
   */
  requestPermissions(): Promise<void>;

  /**
   * Starts the foreground service and shows the overlay animation.
   */
  startOverlay(options: { style: string }): Promise<void>;

  /**
   * Stops the foreground service and removes the overlay animation.
   */
  stopOverlay(): Promise<void>;
}

const AnimationOverlay = registerPlugin<AnimationOverlayPlugin>('AnimationOverlay');

export default AnimationOverlay;
