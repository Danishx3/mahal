export type Language = 'ml' | 'en';

export interface TranslationDictionary {
  // Navigation & Header
  nav: {
    home: string;
    dashboard: string;
    payments: string;
    certificates: string;
    admin: string;
    login: string;
    logout: string;
    register: string;
    switchPortal: string;
    adminConsole: string;
    residentPortal: string;
    welcome: string;
    verifiedResident: string;
    pendingVerification: string;
  };
  // Landing Page
  landing: {
    badge: string;
    heroTitle: string;
    heroTitleHighlight: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaRegister: string;
    featuresTitle: string;
    featuresSubtitle: string;
    divisionsTitle: string;
    divisionsSubtitle: string;
    portalName: string;
    statsHouses: string;
    statsMembers: string;
    statsCollections: string;
  };
  // Common Buttons & Labels
  common: {
    save: string;
    cancel: string;
    confirm: string;
    close: string;
    back: string;
    submit: string;
    submitting: string;
    approve: string;
    approved: string;
    reject: string;
    rejected: string;
    pending: string;
    underReview: string;
    verified: string;
    viewDetails: string;
    download: string;
    print: string;
    copy: string;
    copied: string;
    search: string;
    filter: string;
    all: string;
    edit: string;
    delete: string;
    status: string;
    action: string;
    date: string;
    amount: string;
    paid: string;
    unpaid: string;
    notes: string;
    reason: string;
    loading: string;
  };
  // Months
  months: Record<string, string>;
  // Relationship labels
  relationships: Record<string, string>;
  // Status Labels
  statusLabels: Record<string, string>;
}

export const translations: Record<Language, TranslationDictionary> = {
  ml: {
    nav: {
      home: 'ഹോം',
      dashboard: 'ഡാഷ്‌ബോർഡ്',
      payments: 'മാസവരി & രസീതുകൾ',
      certificates: 'വിവാഹ സർട്ടിഫിക്കറ്റ്',
      admin: 'അഡ്മിൻ പാനൽ',
      login: 'ലോഗിൻ',
      logout: 'ലോഗ് ഔട്ട്',
      register: 'കുടുംബം രജിസ്റ്റർ ചെയ്യുക',
      switchPortal: 'പോർട്ടൽ മാറ്റുക',
      adminConsole: 'അഡ്മിൻ കൺസോൾ',
      residentPortal: 'റെസിഡന്റ് പോർട്ടൽ',
      welcome: 'സ്വാഗതം',
      verifiedResident: 'അംഗീകൃത കുടുംബം',
      pendingVerification: 'പരിശോധനയിലുള്ള കുടുംബം',
    },
    landing: {
      badge: 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് • ഔദ്യോഗിക മഹല്ല് പോർട്ടൽ',
      heroTitle: 'ആധുനിക മഹല്ല് ഡിജിറ്റൽ',
      heroTitleHighlight: 'ഭരണസംവിധാനം',
      heroSubtitle:
        'കുടുംബ രജിസ്ട്രി, മാസവരി വരവ്-ചിലവ് കണക്കുകൾ, വിവാഹ സർട്ടിഫിക്കറ്റ് അപേക്ഷകൾ, ഓൺലൈൻ ലെഡ്ജർ — സുതാര്യമായ മഹല്ല് സേവനങ്ങൾ ഇനി വിരൽത്തുമ്പിൽ.',
      ctaPrimary: 'മഹല്ല് പോർട്ടൽ തുറക്കുക',
      ctaRegister: 'പുതിയ കുടുംബം രജിസ്റ്റർ ചെയ്യുക',
      featuresTitle: 'പ്രധാന സേവനങ്ങളും സവിശേഷതകളും',
      featuresSubtitle: 'മഹല്ല് നിവാസികൾക്കും ഭാരവാഹികൾക്കുമായി രൂപകൽപ്പന ചെയ്ത സമഗ്ര ഡിജിറ്റൽ സേവനങ്ങൾ.',
      divisionsTitle: 'മഹല്ല് ഡിവിഷനുകൾ',
      divisionsSubtitle: 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദിന്റെ കീഴിലുള്ള 4 പ്രധാന ഡിവിഷനുകൾ.',
      portalName: 'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല് പോർട്ടൽ',
      statsHouses: 'രജിസ്റ്റർ ചെയ്ത വീടുകൾ',
      statsMembers: 'മഹല്ല് നിവാസികൾ',
      statsCollections: 'ആകെ മാസവരി ശേഖരണം',
    },
    common: {
      save: 'സേവ് ചെയ്യുക',
      cancel: 'റദ്ദാക്കുക',
      confirm: 'ഉറപ്പാക്കുക',
      close: 'അടയ്ക്കുക',
      back: 'പിന്നോട്ട്',
      submit: 'സമർപ്പിക്കുക',
      submitting: 'സമർപ്പിക്കുന്നു...',
      approve: 'അംഗീകരിക്കുക',
      approved: 'അംഗീകരിച്ചു',
      reject: 'നിരസിക്കുക',
      rejected: 'നിരസിച്ചു',
      pending: 'തീർപ്പുകൽപ്പിക്കാത്തവ',
      underReview: 'പരിശോധനയിൽ',
      verified: 'സ്ഥിരീകരിച്ചു',
      viewDetails: 'വിശദാംശങ്ങൾ കാണുക',
      download: 'ഡൗൺലോഡ്',
      print: 'പ്രിന്റ് ചെയ്യുക',
      copy: 'കോപ്പി ചെയ്യുക',
      copied: 'കോപ്പി ചെയ്തു!',
      search: 'തിരയുക...',
      filter: 'ഫിൽട്ടർ',
      all: 'എല്ലാം',
      edit: 'തിരുത്തുക',
      delete: 'ഡിലീറ്റ്',
      status: 'നില',
      action: 'നടപടി',
      date: 'തീയതി',
      amount: 'തുക',
      paid: 'അടച്ചു',
      unpaid: 'അടയ്ക്കാനുണ്ട്',
      notes: 'കുറിപ്പുകൾ',
      reason: 'കാരണം',
      loading: 'വിവരങ്ങൾ ലഭ്യമാക്കുന്നു...',
    },
    months: {
      '01': 'ജനുവരി',
      '02': 'ഫെബ്രുവരി',
      '03': 'മാർച്ച്',
      '04': 'ഏപ്രിൽ',
      '05': 'മേയ്',
      '06': 'ജൂൺ',
      '07': 'ജൂലൈ',
      '08': 'ഓഗസ്റ്റ്',
      '09': 'സെപ്റ്റംബർ',
      '10': 'ഒക്ടോബർ',
      '11': 'നവംബർ',
      '12': 'ഡിസംബർ',
    },
    relationships: {
      head: 'കുടുംബനാഥൻ',
      spouse: 'ഭാര്യ / ഭർത്താവ്',
      son: 'മകൻ',
      daughter: 'മകൾ',
      father: 'പിതാവ്',
      mother: 'മാതാവ്',
      brother: 'സഹോദരൻ',
      sister: 'സഹോദരി',
      other: 'മറ്റുള്ളവർ',
    },
    statusLabels: {
      approved: 'അംഗീകരിച്ചു',
      pending_verification: 'പരിശോധനയിൽ',
      under_review: 'പരിശോധനയിൽ',
      rejected: 'നിരസിച്ചു',
      verified: 'സ്ഥിരീകരിച്ചു',
      pending: 'അടയ്ക്കാനുണ്ട്',
      failed: 'പരാജയപ്പെട്ടു',
      active: 'സജീവം',
      completed: 'പൂർത്തിയായി',
    },
  },
  en: {
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      payments: 'Dues & Receipts',
      certificates: 'Marriage Certificate',
      admin: 'Admin Console',
      login: 'Sign In',
      logout: 'Sign Out',
      register: 'Register Household',
      switchPortal: 'Switch Portal',
      adminConsole: 'Admin Console',
      residentPortal: 'Resident Portal',
      welcome: 'Welcome',
      verifiedResident: 'Verified Resident',
      pendingVerification: 'Pending Verification',
    },
    landing: {
      badge: 'Kunjikkulam Juma Masjid • Official Mahallu Portal',
      heroTitle: 'Unified Mahallu',
      heroTitleHighlight: 'Administration',
      heroSubtitle:
        'A comprehensive portal for household registration, membership dues tracking, UPI payment reconciliation, and double-entry financial management — built for modern village governance.',
      ctaPrimary: 'Access Resident Portal',
      ctaRegister: 'Register Household',
      featuresTitle: 'Core Capabilities & Features',
      featuresSubtitle: 'Engineered for simplicity and complete transparency in Mahallu administration.',
      divisionsTitle: 'Mahallu Divisions',
      divisionsSubtitle: 'Organized administrative subdivisions under Kunjikkulam Juma Masjid.',
      portalName: 'Kunjikkulam Juma Masjid Mahallu Portal',
      statsHouses: 'Registered Households',
      statsMembers: 'Verified Inhabitants',
      statsCollections: 'Total Collections',
    },
    common: {
      save: 'Save Changes',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      back: 'Back',
      submit: 'Submit',
      submitting: 'Submitting...',
      approve: 'Approve',
      approved: 'Approved',
      reject: 'Reject',
      rejected: 'Rejected',
      pending: 'Pending',
      underReview: 'Under Review',
      verified: 'Verified',
      viewDetails: 'View Details',
      download: 'Download',
      print: 'Print',
      copy: 'Copy',
      copied: 'Copied!',
      search: 'Search...',
      filter: 'Filter',
      all: 'All',
      edit: 'Edit',
      delete: 'Delete',
      status: 'Status',
      action: 'Action',
      date: 'Date',
      amount: 'Amount',
      paid: 'Paid',
      unpaid: 'Unpaid',
      notes: 'Notes',
      reason: 'Reason',
      loading: 'Loading...',
    },
    months: {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    },
    relationships: {
      head: 'Head of Family',
      spouse: 'Spouse',
      son: 'Son',
      daughter: 'Daughter',
      father: 'Father',
      mother: 'Mother',
      brother: 'Brother',
      sister: 'Sister',
      other: 'Other',
    },
    statusLabels: {
      approved: 'Approved',
      pending_verification: 'Pending Verification',
      under_review: 'Under Review',
      rejected: 'Rejected',
      verified: 'Verified',
      pending: 'Pending',
      failed: 'Failed',
      active: 'Active',
      completed: 'Completed',
    },
  },
};
