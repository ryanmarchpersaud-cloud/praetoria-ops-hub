// PRAETORIA GROUP — EMAIL ARCHITECTURE

export const APP_EMAIL_CONFIG = {
  systemOwner: "admin@praetoriagroup.ca",
  opsInbox: "ops@praetoriagroup.ca",
  supportInbox: "support@praetoriagroup.ca",
  noReplyInbox: "noreply@praetoriagroup.ca",

  serviceInboxes: {
    snow_ice: "info@praetoriasnowandice.ca",
    landscaping: "landscaping@praetoriagroup.ca",
    junk_removal: "junk@praetoriagroup.ca",
    property_maintenance: "maintenance@praetoriagroup.ca",
    cleaning: "cleaning@praetoriagroup.ca",
    power_washing: "powerwashing@praetoriagroup.ca",
  },
} as const;

export const SERVICE_NOTIFICATION_RULES = {
  snow_ice: {
    internalNotify: [APP_EMAIL_CONFIG.opsInbox, APP_EMAIL_CONFIG.serviceInboxes.snow_ice],
    customerReplyFrom: APP_EMAIL_CONFIG.serviceInboxes.snow_ice,
  },
  landscaping: {
    internalNotify: [APP_EMAIL_CONFIG.opsInbox, APP_EMAIL_CONFIG.serviceInboxes.landscaping],
    customerReplyFrom: APP_EMAIL_CONFIG.serviceInboxes.landscaping,
  },
  junk_removal: {
    internalNotify: [APP_EMAIL_CONFIG.opsInbox, APP_EMAIL_CONFIG.serviceInboxes.junk_removal],
    customerReplyFrom: APP_EMAIL_CONFIG.serviceInboxes.junk_removal,
  },
  property_maintenance: {
    internalNotify: [APP_EMAIL_CONFIG.opsInbox, APP_EMAIL_CONFIG.serviceInboxes.property_maintenance],
    customerReplyFrom: APP_EMAIL_CONFIG.serviceInboxes.property_maintenance,
  },
  cleaning: {
    internalNotify: [APP_EMAIL_CONFIG.opsInbox, APP_EMAIL_CONFIG.serviceInboxes.cleaning],
    customerReplyFrom: APP_EMAIL_CONFIG.serviceInboxes.cleaning,
  },
  power_washing: {
    internalNotify: [APP_EMAIL_CONFIG.opsInbox, APP_EMAIL_CONFIG.serviceInboxes.power_washing],
    customerReplyFrom: APP_EMAIL_CONFIG.serviceInboxes.power_washing,
  },
} as const;

/** Map service_category enum values to notification rule keys */
export const SERVICE_CATEGORY_TO_KEY: Record<string, keyof typeof SERVICE_NOTIFICATION_RULES> = {
  "Snow & Ice": "snow_ice",
  "Landscaping & Grounds": "landscaping",
  "Junk Removal": "junk_removal",
  "Property Care & Maintenance": "property_maintenance",
  "Cleaning Services": "cleaning",
  "Power Washing": "power_washing",
};

/**
 * Resolve the correct reply-to address for a given service category.
 * Falls back to ops@ for operational contexts, support@ for general/unknown.
 */
export function getReplyToForCategory(serviceCategory?: string | null, context: 'operational' | 'general' = 'operational'): string {
  if (serviceCategory) {
    const key = SERVICE_CATEGORY_TO_KEY[serviceCategory];
    if (key) {
      return SERVICE_NOTIFICATION_RULES[key].customerReplyFrom;
    }
  }
  return context === 'operational' ? APP_EMAIL_CONFIG.opsInbox : APP_EMAIL_CONFIG.supportInbox;
}

/**
 * Resolve the internal notification recipients for a given service category.
 * Always includes ops@; also includes service inbox when category is known.
 */
export function getOpsRecipientsForCategory(serviceCategory?: string | null): string[] {
  if (serviceCategory) {
    const key = SERVICE_CATEGORY_TO_KEY[serviceCategory];
    if (key) {
      return [...SERVICE_NOTIFICATION_RULES[key].internalNotify];
    }
  }
  return [APP_EMAIL_CONFIG.opsInbox];
}
