import { MAINTENANCE_CATALOG, MaintenanceIssue } from './maintenanceCatalog';

export function findIssueByKey(key?: string | null): MaintenanceIssue | null {
  if (!key) return null;
  for (const cat of MAINTENANCE_CATALOG) {
    for (const iss of cat.issues) {
      const slug = iss.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (`${cat.key}:${slug}` === key) return iss;
    }
  }
  return null;
}

export function isNonRepairRequest(req: {
  issue_key?: string | null;
  category?: string | null;
}): boolean {
  const iss = findIssueByKey(req.issue_key);
  if (iss?.nonRepair) return true;
  // Category-level fallback for concern categories
  const nonRepairCats = [
    'noise_concern',
    'tenant_behaviour',
    'common_area',
    'odour_concern',
    'parking_rules',
    'property_mgmt_request',
    'fire_smoke_safety',
  ];
  return !!req.category && nonRepairCats.includes(req.category);
}
