# iPhone Install Guide

## Objective

This guide explains how to install the `nexora_student_mobile` app on a real iPhone such as iPhone 13.

It covers the two practical paths:

1. local development build from Mac to iPhone
2. cloud installer build using EAS

## Recommended Path

For your case, the best path is:

1. use EAS to generate an installable iPhone build
2. install it on the device using internal distribution

Reason:

- avoids Expo Go SDK mismatch issues
- avoids depending on local Xcode build every time
- gives you a real app install flow

## Important Prerequisites

Before building:

1. Apple Developer account should be available
2. app bundle identifier must be unique
3. backend URL in `nexora_student_mobile/.env` should point to the right server

Current backend example:

```env
EXPO_PUBLIC_API_BASE_URL=https://learn.accerio.in
```

## Important Bundle Identifier Note

Current iOS bundle identifier in [app.json](/Users/ansh/Documents/Eductech/nexora_student_mobile/app.json:9) is:

```json
com.anonymous.nexora-student-mobile
```

For a real install, replace it with your own unique identifier, for example:

```json
com.accerio.nexora.student
```

You should update the `ios.bundleIdentifier` field before making a serious device build.

## Option 1: EAS Internal Installer Build

This is the easiest way to get an installable app on iPhone without relying on Expo Go.

### Step 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2. Login to Expo

```bash
eas login
```

### Step 3. Go to the mobile app folder

```bash
cd /Users/ansh/Documents/Eductech/nexora_student_mobile
```

### Step 4. Confirm environment

Make sure `.env` contains:

```env
EXPO_PUBLIC_API_BASE_URL=https://learn.accerio.in
```

### Step 5. Build an internal iPhone installer

```bash
eas build --platform ios --profile preview
```

This will:

- ask you to connect Apple Developer credentials if needed
- create a signed iOS build
- give you an install link or QR code

### Step 6. Open the install link on iPhone

On iPhone:

1. open the link from Safari
2. install the app
3. if prompted, trust the profile or developer certificate in iPhone settings

### Best use of `preview`

Use `preview` when:

- you want a real installable app
- you want to test on your own iPhone
- you are not submitting to App Store yet

## Option 2: Local Development Build To iPhone

Use this if you want live development from your Mac to the iPhone.

### Requirements

1. Xcode 16.1 or above
2. iPhone connected to Mac
3. Apple ID signed in inside Xcode

### Steps

```bash
cd /Users/ansh/Documents/Eductech/nexora_student_mobile
npx expo run:ios --device
```

After installation succeeds:

```bash
npx expo start --dev-client
```

Then open the installed app on the iPhone.

## Which Option Should You Use?

Use `EAS preview build` if:

- you want a stable installable app on iPhone
- you want to avoid local Xcode friction
- you want something closer to a tester build

Use `local development build` if:

- you are actively coding UI changes
- you want fast local iteration
- your Mac toolchain is already ready

## Recommended Exact Command For You

After updating the bundle identifier, run:

```bash
cd /Users/ansh/Documents/Eductech/nexora_student_mobile
eas login
eas build --platform ios --profile preview
```

## If Build Fails

Most common causes:

1. bundle identifier is not unique
2. Apple Developer account not connected
3. missing permissions during iOS signing
4. outdated Xcode for local build path

## Final Recommendation

For your iPhone 13, the cleanest installer-style testing path is:

1. set a real bundle identifier
2. keep `EXPO_PUBLIC_API_BASE_URL=https://learn.accerio.in`
3. run `eas build --platform ios --profile preview`
4. install from the generated link on the iPhone
