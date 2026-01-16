# iOS App Store Submission Guide for Nova AI

## Overview

Nova AI is a Progressive Web App (PWA) that provides a native-like experience on iOS devices. However, **Apple does not accept PWAs directly in the App Store**. You must wrap the PWA in a native iOS container to submit it.

## Current iOS Compatibility

The app is fully optimized for iPhone and iPad with:

- **Safe Area Support**: Proper handling of notched devices (iPhone X and later)
- **Touch Optimization**: 44px minimum touch targets, momentum scrolling
- **iOS Safari Fixes**: Viewport height fixes, text size adjustment prevention
- **Splash Screens**: Support for all iPhone and iPad screen sizes
- **PWA Manifest**: Complete with icons, shortcuts, and theme colors
- **Service Worker**: Offline caching and background sync support

## App Store Submission Options

### Option 1: PWABuilder (Recommended - Free)

PWABuilder by Microsoft generates an Xcode project from your PWA.

**Steps:**
1. Visit [pwabuilder.com](https://www.pwabuilder.com/)
2. Enter your published app URL
3. Download the iOS package
4. Open in Xcode on a Mac
5. Configure code signing with your Apple Developer account
6. Submit to App Store Connect

**Requirements:**
- Mac with Xcode installed
- Apple Developer Account ($99/year)
- Published HTTPS URL for your app

### Option 2: Capacitor (More Control)

Capacitor provides a native wrapper with access to device APIs.

**Steps:**
1. Install Capacitor: `npm install @capacitor/core @capacitor/ios`
2. Initialize: `npx cap init`
3. Add iOS: `npx cap add ios`
4. Build web assets: `npm run build`
5. Sync: `npx cap sync ios`
6. Open in Xcode: `npx cap open ios`

**Benefits:**
- Access to native iOS APIs (Camera, Push, etc.)
- Better performance
- More customization options

### Option 3: MobiLoud (Paid, Guaranteed Approval)

MobiLoud handles the entire submission process with guaranteed approval.

- Cost: Varies by plan
- They handle all Apple compliance
- Includes support and updates

## Apple Review Guidelines

Your app must meet Apple's requirements:

**Do:**
- Provide genuine value beyond the mobile website
- Include meaningful offline functionality
- Follow Apple Human Interface Guidelines
- Feel native with smooth transitions
- Support all iPhone and iPad sizes

**Don't:**
- Submit a simple webview wrapper
- Have broken links or features
- Use non-native payment systems (use Apple Pay)
- Crash or have performance issues

## Required Assets for App Store

### Icons
- 1024x1024 App Store Icon (no alpha channel)
- All required app icon sizes

### Screenshots
- 6.5" iPhone (1284 x 2778)
- 5.5" iPhone (1242 x 2208)
- 12.9" iPad Pro (2048 x 2732)
- 11" iPad Pro (1668 x 2388)

### Metadata
- App Name (30 characters max)
- Subtitle (30 characters max)
- Description (4000 characters max)
- Keywords (100 characters max)
- Privacy Policy URL
- Support URL

## Alternative: Safari "Add to Home Screen"

If App Store submission is not required, users can install the PWA directly:

1. Open the app in Safari on iOS
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app icon appears on the home screen

**Benefits:**
- No App Store approval needed
- Instant updates (no review wait)
- Free (no developer account needed)

**Limitations:**
- Users must find and install manually
- Limited discoverability
- No App Store presence

## Push Notification Support

iOS 16.4+ supports web push notifications for installed PWAs:

- User must install PWA to home screen first
- Works with VAPID keys (already configured)
- Requires explicit user permission

## Testing on iOS

1. **Simulator**: Use Xcode's iOS Simulator
2. **Physical Device**: Connect iPhone/iPad via USB
3. **Safari Web Inspector**: Debug with Mac's Safari Developer Tools

## Timeline Estimate

| Task | Duration |
|------|----------|
| Generate iOS package | 1-2 hours |
| Configure Xcode project | 2-4 hours |
| Create App Store assets | 4-8 hours |
| Submit to App Store | 1 hour |
| Apple review | 1-3 days |
| **Total** | **2-4 days** |

## Resources

- [PWABuilder iOS Documentation](https://docs.pwabuilder.com/#/builder/ios)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Capacitor Documentation](https://capacitorjs.com/docs/ios)
