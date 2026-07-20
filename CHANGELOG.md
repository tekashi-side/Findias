# Changelog

## [1.23.0](https://github.com/tekashi-side/Findias/compare/v1.22.0...v1.23.0) (2026-07-20)


### Features

* add download count to mod variants and update related components ([60196aa](https://github.com/tekashi-side/Findias/commit/60196aa69881528c20e10dd2c8e5ebd3904d2060))

## [1.22.0](https://github.com/tekashi-side/Findias/compare/v1.21.0...v1.22.0) (2026-07-19)


### Features

* enhance FeedbackView with character counters and editable diagnostics ([0e530bc](https://github.com/tekashi-side/Findias/commit/0e530bce6a035d0e6d54171967ebdcfbe1e1cca9))

## [1.21.0](https://github.com/tekashi-side/Findias/compare/v1.20.0...v1.21.0) (2026-07-19)


### Features

* add feedback and bug report templates, enhance feedback functionality ([1c6973d](https://github.com/tekashi-side/Findias/commit/1c6973d97dc971c815dd9c4a84481cb1aa3c8c75))
* enhance MainView and ModDetail components with new icons and filter functionality ([5ac7325](https://github.com/tekashi-side/Findias/commit/5ac732567e5c1b6ee849d8d2c238201c61101812))


### Fixes

* update loading spinner alignment in App component for improved UI consistency ([51a59d7](https://github.com/tekashi-side/Findias/commit/51a59d7d4933cc4ac4aebb6f0405df24bd56186f))

## [1.20.0](https://github.com/tekashi-side/Findias/compare/v1.19.0...v1.20.0) (2026-07-19)


### Features

* add usedFiles to mod variants and implement Data Files tab in ModDetail ([0d6aeeb](https://github.com/tekashi-side/Findias/commit/0d6aeeb05d13cd65dea75791d69941d08543a50a))
* enhance ModDetail component with icons for tabs ([9ebf3d7](https://github.com/tekashi-side/Findias/commit/9ebf3d74fa541d2cacff55f22031015356d2ce37))
* update badge variant and remove redundant text in version summary ([dae8e85](https://github.com/tekashi-side/Findias/commit/dae8e85178864cd3056ae7ef0fcfd7ecc0a1c2b4))

## [1.19.0](https://github.com/tekashi-side/Findias/compare/v1.18.0...v1.19.0) (2026-07-19)


### Features

* add updatedAt field to mod variants and implement date formatting ([754845f](https://github.com/tekashi-side/Findias/commit/754845f0f8730d4cc7e5c4c4847561876fb9f7c0))

## [1.18.0](https://github.com/tekashi-side/Findias/compare/v1.17.0...v1.18.0) (2026-07-19)


### Features

* implement game launcher detection and start functionality ([45b2031](https://github.com/tekashi-side/Findias/commit/45b20312f2140cecccd69efa0027713690f7e0f4))

## [1.17.0](https://github.com/tekashi-side/Findias/compare/v1.16.0...v1.17.0) (2026-07-18)


### Features

* enhance Sentry error reporting in IPC and renderer components ([68e0a78](https://github.com/tekashi-side/Findias/commit/68e0a781de3bdf22436c63e223a7bbef01d417cc))


### Fixes

* implement orphan group ID namespace to prevent collisions with catalog groups ([fbc7241](https://github.com/tekashi-side/Findias/commit/fbc724192659319ba3e6f90a5e985c206ec2daa5))

## [1.16.0](https://github.com/tekashi-side/Findias/compare/v1.15.0...v1.16.0) (2026-07-18)


### Features

* add installId for anonymous user tracking and enhance telemetry context ([56e9aad](https://github.com/tekashi-side/Findias/commit/56e9aadb258940db8e8cc53aa122bc1c5f619dfb))
* update Sentry integration for development with new telemetry self-test panel ([f21de67](https://github.com/tekashi-side/Findias/commit/f21de67314c8c64afef67eeaa9caf1d3ebb6fb1a))

## [1.15.0](https://github.com/tekashi-side/Findias/compare/v1.14.0...v1.15.0) (2026-07-17)


### Features

* implement centralized error handling for IPC handlers and update telemetry error reporting ([8949532](https://github.com/tekashi-side/Findias/commit/89495326b39f89cb6afb7b7455d9c1ed80567490))
* integrate Sentry for error reporting and telemetry ([d526136](https://github.com/tekashi-side/Findias/commit/d52613600aabee53c5c092c97dbb0fc0c08336c0))


### Fixes

* refine error reporting in IPC handlers to skip expected CatalogErrors ([b988855](https://github.com/tekashi-side/Findias/commit/b988855a5ff3be7c9a5ae957af75f685abad15b1))

## [1.14.0](https://github.com/tekashi-side/Findias/compare/v1.13.0...v1.14.0) (2026-07-16)


### Features

* add tag filtering functionality to mod list ([959029d](https://github.com/tekashi-side/Findias/commit/959029d01a4f20478265ab7034f7c653bc31700b))
* display app version in settings view ([9b0b05a](https://github.com/tekashi-side/Findias/commit/9b0b05a23fd3d7b87c3363d5ae3075b39741df76))


### Fixes

* ensure safe archival of foreign mods by validating catalog availability ([f033ab7](https://github.com/tekashi-side/Findias/commit/f033ab72f54ab46726c7ad332c45a765de1cc948))

## [1.13.0](https://github.com/tekashi-side/Findias/compare/v1.12.0...v1.13.0) (2026-07-14)


### Features

* adding conventional commit linting ([589fb16](https://github.com/tekashi-side/Findias/commit/589fb1675bf85d157d06a0a09d8db3937bc4682d))


### Fixes

* preventing release-please PR from failing ([5d9af2e](https://github.com/tekashi-side/Findias/commit/5d9af2ed7db2bdace107b6250c131f4d4c38973e))

## [1.12.0](https://github.com/tekashi-side/Findias/compare/v1.11.0...v1.12.0) (2026-07-13)


### Features

* allowing mod controls from variant headers ([032c2d7](https://github.com/tekashi-side/Findias/commit/032c2d727e90b1f7a62ada0f1c353ecc24c79e8a))
* creating custom app menu, disabling zoom functionality ([2960e32](https://github.com/tekashi-side/Findias/commit/2960e324c95464165b6343850dd00e7430fa8781))
* simplifying status chip ([73e66b6](https://github.com/tekashi-side/Findias/commit/73e66b628a4a403641889ba706273ac5130cc97a))

## [1.11.0](https://github.com/tekashi-side/Findias/compare/v1.10.0...v1.11.0) (2026-07-12)


### Features

* refactoring all property names for boolean coding conventions ([ece8410](https://github.com/tekashi-side/Findias/commit/ece841023eaac18bf66ff250b03db921cbca0958))

## [1.10.0](https://github.com/tekashi-side/Findias/compare/v1.9.0...v1.10.0) (2026-07-12)


### Features

* replace mod status with a comprehensive state representation ([efe4ae4](https://github.com/tekashi-side/Findias/commit/efe4ae4654d864a60f8df2b37dacc4d2672eabe2))


### Fixes

* update installed tab logic to include orphaned mods ([d84849f](https://github.com/tekashi-side/Findias/commit/d84849fa6c344f4692e133dab98d605008795f33))

## [1.9.0](https://github.com/tekashi-side/Findias/compare/v1.8.0...v1.9.0) (2026-07-09)


### Features

* adding update all button ([a951ca0](https://github.com/tekashi-side/Findias/commit/a951ca072cd2e13cfc23889b04e0ccdae445d772))
* can disable or enable orphaned mods ([6d4940e](https://github.com/tekashi-side/Findias/commit/6d4940e064e8b21748849a52b969400a54667116))

## [1.8.0](https://github.com/tekashi-side/Findias/compare/v1.7.0...v1.8.0) (2026-07-05)


### Features

* updating markdown implementation ([cfdb675](https://github.com/tekashi-side/Findias/commit/cfdb67565bd21f2ccc0979089152e42d847cd798))

## [1.7.0](https://github.com/tekashi-side/Findias/compare/v1.6.0...v1.7.0) (2026-07-05)


### Features

* adding an updates available tab to the mod tabs ([a948954](https://github.com/tekashi-side/Findias/commit/a9489545b370da56e4d574efc6b78869d31d6cac))
* adding auto-merge feature ([32fd335](https://github.com/tekashi-side/Findias/commit/32fd3355afcff11ee4211f1ac8cb5e8d6dc43da7))


### Fixes

* fixing the auto release step ([a644ec9](https://github.com/tekashi-side/Findias/commit/a644ec9b02549d188f644138e4021b3d80503021))

## [1.6.0](https://github.com/tekashi-side/Findias/compare/v1.5.0...v1.6.0) (2026-07-05)


### Features

* refactor search input with new InputGroup component and add clear button functionality ([680db31](https://github.com/tekashi-side/Findias/commit/680db312f67f99348f3e9cff64a6e693928d9030))


### Fixes

* update action order for disabled stale mods and improve StatusChip visibility handling ([f200fda](https://github.com/tekashi-side/Findias/commit/f200fda252ff56a78fb15d8a936dc6bc47622e18))

## [1.5.0](https://github.com/tekashi-side/Findias/compare/v1.4.0...v1.5.0) (2026-07-04)


### Features

* improve the update app toast ([e2444b8](https://github.com/tekashi-side/Findias/commit/e2444b8c10ab837fb9210fb2da1bb12c3e8fb33b))

## [1.4.0](https://github.com/tekashi-side/Findias/compare/v1.3.0...v1.4.0) (2026-07-04)


### Features

* enhance SetupGate component with folder selection options and improved layout ([5beda1b](https://github.com/tekashi-side/Findias/commit/5beda1bb6fe9e50363a586ba63b566446edf4c47))
* implement mod archiving functionality and enhance setup flow ([e45124d](https://github.com/tekashi-side/Findias/commit/e45124d419161eacbdd6499e97edc92f28388694))

## [1.3.0](https://github.com/tekashi-side/Findias/compare/v1.2.0...v1.3.0) (2026-07-03)


### Features

* add ability to use feature flags ([7267d96](https://github.com/tekashi-side/Findias/commit/7267d96f57b6fc15ce667aa045ec74817ec951e4))
* refactor feature flag handling and add tests for IPC integration ([95afc74](https://github.com/tekashi-side/Findias/commit/95afc744576ae8f1ca736c513239ee3aa1df4a2a))

## [1.2.0](https://github.com/tekashi-side/Findias/compare/v1.1.0...v1.2.0) (2026-07-02)


### Features

* enhance mod catalog with README and image support for variants and groups ([bc7a66e](https://github.com/tekashi-side/Findias/commit/bc7a66e48a6f2e388854829b2aa8f10c9e2590ef))
* implement custom carousel component with improved styling and behavior ([0fedc13](https://github.com/tekashi-side/Findias/commit/0fedc131d43f4ad9be661484ba967497276ebbeb))
* make modAdditionalCredits and recentUpdateNotes optional in catalog interfaces and tests ([aec57d4](https://github.com/tekashi-side/Findias/commit/aec57d451521fdc9c4f7076c40b6c3f0e9f47736))


### Fixes

* prevent long mod names from breaking layout ([8295fad](https://github.com/tekashi-side/Findias/commit/8295fadb6425a016d48dc862faf177f2f551e8dd))

## [1.1.0](https://github.com/tekashi-side/Findias/compare/v1.0.0...v1.1.0) (2026-07-01)


### Features

* add icons to ModTabs for improved visual representation of tab statuses ([131a75a](https://github.com/tekashi-side/Findias/commit/131a75af9404e69c0c0bfd6b74a8acd840624226))
* add picocolors for enhanced logging output in loggingFetch ([e0b548a](https://github.com/tekashi-side/Findias/commit/e0b548ae9d71e231ea77b6ec449390a4b94b3575))
* add search functionality to MainView with Input component for improved mod filtering ([ac855cf](https://github.com/tekashi-side/Findias/commit/ac855cf37d41122438746b037743a5e90435af56))
* add Tailwind CSS support and refactor UI components ([dd7b84e](https://github.com/tekashi-side/Findias/commit/dd7b84e031280fb8dfc767323ca80c21435f8493))
* enhance GitHub API interaction with caching and logging capabilities ([9c87360](https://github.com/tekashi-side/Findias/commit/9c87360398ad559107dffaffb150d58eac8cc85b))
* implement frameless window with custom title bar and settings management ([cf54bd2](https://github.com/tekashi-side/Findias/commit/cf54bd234dc1eeb03f552b1d72dbb5f0dd1018b9))
* implement mod catalog and installed mods provider with validation and error handling ([1b0e85e](https://github.com/tekashi-side/Findias/commit/1b0e85e57b61384cc3f255f8f0701a6ab292e8c8))
* implement mod enable/disable functionality with UI integration and state management ([1e83d8f](https://github.com/tekashi-side/Findias/commit/1e83d8f6cf63827047f592b6c75c62b9e141b8d3))
* implement mod installation, update, and deletion with progress tracking and UI integration ([2e2010f](https://github.com/tekashi-side/Findias/commit/2e2010fe475aa334e63333074879fe3dedbb875c))
* implement mod list resolution and UI integration with error handling and refresh functionality ([99a798b](https://github.com/tekashi-side/Findias/commit/99a798b7d0c2d2e823314aba63a571c47307baf2))
* implement theme management system with user preferences and system integration ([462a472](https://github.com/tekashi-side/Findias/commit/462a4729a5b47cab1f3ae591ed12e22e04fd8444))
* initialize Findias mod manager with Electron and React setup ([06c1acb](https://github.com/tekashi-side/Findias/commit/06c1acbabb7503c0fb8b72f7fae44a04eb00ffec))
* integrate manifestCatalog.json for mod management and enhance settings handling ([2a61f6f](https://github.com/tekashi-side/Findias/commit/2a61f6fc8be621842c30884abe74b29ae7927705))
* introduce ModTabs component for enhanced mod filtering and organization in MainView ([c7f928a](https://github.com/tekashi-side/Findias/commit/c7f928aef7456237b9a55f03cfd9e255a9394e58))
* set up release pipeline with GitHub Actions and update versioning ([d02fe8b](https://github.com/tekashi-side/Findias/commit/d02fe8b0231900b085daf016d321aa8dac7625c7))


### Fixes

* update package-lock.json to change @babel/runtime from devOptional to dev ([899cf82](https://github.com/tekashi-side/Findias/commit/899cf8222c6e279426b51cf9ea36206332c50422))
* update renderer alias and paths, add zod for validation, and implement game folder selection ([c4c600b](https://github.com/tekashi-side/Findias/commit/c4c600b883e6dda26289e42fc7f316fa4235e7f5))
