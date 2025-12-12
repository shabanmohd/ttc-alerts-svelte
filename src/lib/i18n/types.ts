/**
 * Type-safe translation key system
 * 
 * This file provides TypeScript types for all translation keys.
 * When adding new strings, add the key here first, then add translations.
 * 
 * Benefits:
 * - Autocomplete for translation keys
 * - Compile-time errors for typos
 * - Easy to find all translatable strings
 */

/**
 * All translation keys organized by section
 * Add new keys here as you develop new features
 */
export interface TranslationKeys {
  // Common actions and words
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    confirm: string;
    back: string;
    next: string;
    retry: string;
    refresh: string;
    done: string;
    remove: string;
    add: string;
    search: string;
    clear: string;
    yes: string;
    no: string;
    ok: string;
    min: string; // minutes abbreviation
    hour: string;
    hours: string;
    day: string;
    days: string;
    ago: string;
    from: string;
    to: string;
    until: string;
    all: string;
    none: string;
    more: string;
    less: string;
  };

  // Header component
  header: {
    appName: string;
    updated: string; // "Updated {time}"
    justNow: string;
    liveUpdates: string;
    connecting: string;
    howToUse: string;
    toggleTheme: string;
    switchLanguage: string; // "Switch to {language}"
  };

  // Navigation
  navigation: {
    home: string;
    alerts: string;
    serviceAlerts: string;
    routes: string;
    stops: string;
    settings: string;
    preferences: string;
    signOut: string;
    backTo: string; // "Back to {page}"
  };

  // Home page tabs
  homeTabs: {
    myStops: string;
    myRoutes: string;
  };

  // Alerts section
  alerts: {
    title: string;
    activeAlerts: string;
    resolvedAlerts: string;
    scheduledClosures: string;
    noActiveAlerts: string;
    noAlerts: string;
    allClear: string;
    allClearDescription: string;
    serviceRunningNormally: string;
    earlierUpdates: string; // "{count} earlier update(s)"
    moreDetails: string;
    // Categories/filters
    filterAll: string;
    filterDisruption: string;
    filterResumed: string;
    filterDelay: string;
    filterDetour: string;
    // Status labels
    statusDelay: string;
    statusDisruption: string;
    statusScheduled: string;
    statusResumed: string;
    // Tabs
    tabAll: string;
    tabMy: string;
    // Time formatting
    justNow: string;
    minutesAgo: string; // "{count} min ago"
    hoursAgo: string; // "{count} hour(s) ago"
    daysAgo: string; // "{count} day(s) ago"
  };

  // Closures/Maintenance
  closures: {
    title: string;
    titleShort: string;
    plannedClosures: string;
    noPlannedClosures: string;
    noClosuresDescription: string;
    startingSoon: string;
    thisWeekend: string;
    comingUp: string;
    fullWeekendClosure: string;
    nightlyEarlyClosure: string;
    upcoming: string; // "{count} upcoming"
    noScheduled: string; // "No {type} closures scheduled"
    nightly: string;
    fromTime: string; // "from {time}"
  };

  // Routes
  routes: {
    title: string;
    search: string;
    searchPlaceholder: string;
    noResults: string; // "No routes found for {query}"
    // Categories
    subway: string;
    streetcar: string;
    streetcars: string;
    bus: string;
    regularBus: string;
    expressBus: string;
    blueNightBus: string;
    blueNightStreetcar: string;
    communityBus: string;
    // Route detail page
    activeAlerts: string;
    noActiveAlertsForRoute: string;
    stopsOnRoute: string;
    loadingStops: string;
    failedToLoadStops: string;
  };

  // Stops
  stops: {
    title: string;
    search: string;
    searchPlaceholder: string;
    noResults: string;
    bookmarks: string;
    nearby: string;
    nearbyStops: string;
    findNearby: string;
    eta: string;
    liveArrivals: string;
    // Empty states
    noSavedStops: string;
    noSavedStopsDescription: string;
    addFirstStop: string;
    addStop: string;
    // Stop card
    removeStop: string;
    moreStops: string; // "+{count} more stops"
    // Location
    locationNotSupported: string;
    locationDenied: string;
    locationError: string;
    // Directions
    northbound: string;
    southbound: string;
    eastbound: string;
    westbound: string;
    allStops: string;
  };

  // ETA specific
  eta: {
    noArrivals: string;
    noServiceTitle: string;
    noServiceSubtitle: string;
    overnightTitle: string;
    overnightSubtitle: string;
    checkSchedule: string;
    refreshing: string;
    to: string; // "to {destination}"
  };

  // Saved routes (My Routes)
  savedRoutes: {
    title: string;
    noSavedRoutes: string;
    noSavedRoutesDescription: string;
    addRoute: string;
    allSavedRoutes: string;
    noAlertsForSaved: string;
    noAlertsDescription: string;
    removeRoute: string;
    removeRouteConfirm: string; // "Remove {route}?"
    routeRemoved: string;
  };

  // Authentication
  auth: {
    // Sign in
    signIn: string;
    signInDescription: string;
    verifyIdentity: string;
    // Sign up
    signUp: string;
    createAccount: string;
    createAccountDescription: string;
    // Fields
    displayName: string;
    displayNamePlaceholder: string;
    displayNameHint: string;
    // Biometrics
    setupBiometrics: string;
    biometricsDescription: string;
    continueWithBiometrics: string;
    waitingForBiometric: string;
    tryAgain: string;
    biometricsNotAvailable: string;
    // Recovery
    accountRecovery: string;
    recoveryCode: string;
    recoveryCodePlaceholder: string;
    recoveryCodeHint: string;
    useRecoveryCode: string;
    signInWithRecovery: string;
    backToBiometric: string;
    // Recovery codes
    saveRecoveryCodes: string;
    recoveryCodesDescription: string;
    recoveryCodesWarning: string;
    recoveryCodesImportant: string;
    copyAllCodes: string;
    codesCopied: string;
    savedCodesConfirm: string;
    continueToApp: string;
    // Success
    accountCreated: string;
    welcome: string; // "Welcome, {name}!"
    accountCreatedSuccess: string;
    // Errors
    nameTaken: string;
    nameAvailable: string;
    authFailed: string;
    invalidRecoveryCode: string;
    // Links
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    // Account required dialog
    accountRequired: string;
    accountRequiredDescription: string;
    accountBenefits: {
      saveRoutes: string;
      personalizedAlerts: string;
      quietHours: string;
      accessAnywhere: string;
    };
  };

  // Settings page
  settings: {
    title: string;
    description: string;
    // Saved stops section
    savedStops: string;
    savedStopsDescription: string;
    addStopLabel: string;
    yourSavedStops: string; // "Your saved stops: ({count}/20)"
    noSavedStopsYet: string;
    // Saved routes section
    savedRoutes: string;
    savedRoutesDescription: string;
    addRouteLabel: string;
    yourSavedRoutes: string; // "Your saved routes: ({count}/20)"
    noSavedRoutesYet: string;
    // Preferences section
    preferences: string;
    preferencesDescription: string;
    language: string;
    languageEnglish: string;
    languageFrench: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    textSize: string;
    textSizeDefault: string;
    textSizeLarge: string;
    textSizeExtraLarge: string;
    reduceMotion: string;
    reduceMotionDescription: string;
    locationAccess: string;
    locationEnabled: string;
    locationBlocked: string;
    locationUnsupported: string;
    locationPrompt: string;
    // Data management
    dataManagement: string;
    dataManagementDescription: string;
    clearAllData: string;
    clearAllDataDescription: string;
    clearAllDataConfirm: string;
    clearAllDataWarning: string;
    dataCleared: string;
    // Help & Info
    helpAndInfo: string;
    helpDescription: string;
    howToUse: string;
    reportBug: string;
    requestFeature: string;
    about: string;
    returnHome: string;
  };

  // Dialogs
  dialogs: {
    // Confirmation
    confirmDelete: string;
    confirmRemove: string;
    actionCannotBeUndone: string;
    canAddBackAnytime: string;
    // How to use
    howToUseTitle: string;
    howToUseDescription: string;
    howToUseSteps: {
      filterAlerts: { title: string; description: string };
      setPreferences: { title: string; description: string };
      stayUpdated: { title: string; description: string };
      installApp: { title: string; description: string };
    };
    gotIt: string;
    // Install PWA
    installTitle: string;
    installDescription: string;
    alreadyInstalled: string;
    alreadyInstalledDescription: string;
    iosStep1: string;
    iosStep1Description: string;
    iosStep2: string;
    iosStep2Description: string;
    iosStep3: string;
    iosStep3Description: string;
    androidStep1: string;
    androidStep1Description: string;
    androidStep2: string;
    androidStep2Description: string;
    genericInstall: string;
    maybeLater: string;
  };

  // Page titles (for <title> tag)
  pageTitles: {
    home: string;
    alerts: string;
    routes: string;
    routeDetail: string; // "{route} - TTC Alerts"
    settings: string;
    preferences: string;
  };

  // Error messages
  errors: {
    generic: string;
    network: string;
    notFound: string;
    unauthorized: string;
    serverError: string;
    loadFailed: string;
    saveFailed: string;
    searchFailed: string;
    connectionLost: string;
    tryAgain: string;
  };

  // Accessibility labels (sr-only text)
  a11y: {
    closeDialog: string;
    openMenu: string;
    loading: string;
    liveRegion: string;
    newAlert: string;
    alertCount: string; // "{count} alerts"
    filterBy: string;
    sortBy: string;
    expandSection: string;
    collapseSection: string;
  };
}

/**
 * Helper type to get nested key paths as strings
 * e.g., "common.loading", "alerts.statusDelay"
 */
export type TranslationKey = NestedKeyOf<TranslationKeys>;

type NestedKeyOf<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends object
    ? NestedKeyOf<T[K], `${Prefix}${Prefix extends '' ? '' : '.'}${K & string}`>
    : `${Prefix}${Prefix extends '' ? '' : '.'}${K & string}`;
}[keyof T];

/**
 * Values that can be interpolated into translations
 */
export interface InterpolationValues {
  [key: string]: string | number;
}
