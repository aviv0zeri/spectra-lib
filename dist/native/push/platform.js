/**
 * PushPlatform -- the ONE seam between this tree and the device.
 *
 * Every class in this folder (PermissionManager, ExpoPushProvider,
 * ChannelRegistry, LocalNotifier, ForegroundPresenter, DeepLinkRouter) talks
 * to the OS only through this interface. expoPlatform.ts is the real
 * implementation (the only file besides background.ts that imports
 * expo-notifications); fakePlatform.ts is the in-memory one the unit tests use.
 * That is what lets the classes be tested without a device, and what would let
 * a project swap the delivery stack without touching any caller.
 *
 * Deliberately narrow and expo-free: nothing here mentions an expo type, so
 * importing this file (or any class that only takes a PushPlatform) never
 * resolves a native module.
 */
export {};
