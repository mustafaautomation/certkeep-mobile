import { addDays, toISODate } from '@/domain/dates';
import { buildAlerts } from '@/domain/alerts';
import type {
  DocumentType,
  Membership,
  Organization,
  Person,
  Requirement,
  VaultDocument,
  Vendor,
} from '@/domain/types';

export const DEMO_PASSWORD = 'harborline';
export const DEMO_MANAGER_EMAIL = 'maya@harborline.demo';

export const IDS = {
  orgHarbor: 'org_harborline',
  orgCedar: 'org_cedar',
  userMaya: 'user_maya',
  userAndre: 'user_andre',
  userLeo: 'user_leo',
  userPriya: 'user_priya',
  userHelen: 'user_helen',
  personLeo: 'person_leo',
  personSofia: 'person_sofia',
  personAndre: 'person_andre',
  personMaya: 'person_maya',
  vendorNorthstar: 'vendor_northstar',
  vendorBluefin: 'vendor_bluefin',
  vendorCedarform: 'vendor_cedarform',
  vendorHarrow: 'vendor_harrow',
  reqNorthstarGl: 'req_northstar_gl',
  reqNorthstarWc: 'req_northstar_wc',
  reqNorthstarLicense: 'req_northstar_license',
  reqBluefinGl: 'req_bluefin_gl',
  reqBluefinWc: 'req_bluefin_wc',
  reqCedarformGl: 'req_cedarform_gl',
  reqCedarformWc: 'req_cedarform_wc',
  reqHarrowGl: 'req_harrow_gl',
  reqHarrowAuto: 'req_harrow_auto',
  reqLeoOsha: 'req_leo_osha',
  reqLeoLicense: 'req_leo_license',
  reqLeoFirstAid: 'req_leo_first_aid',
  reqSofiaForklift: 'req_sofia_forklift',
  reqSofiaOsha: 'req_sofia_osha',
  reqAndreLicense: 'req_andre_license',
  reqMayaLicense: 'req_maya_license',
  reqMayaGl: 'req_maya_gl',
} as const;

export interface DemoUser {
  id: string;
  email: string;
  displayName: string;
  password: string;
}

export interface Database {
  users: DemoUser[];
  organizations: Organization[];
  memberships: Membership[];
  people: Person[];
  vendors: Vendor[];
  requirements: Requirement[];
  documents: VaultDocument[];
  alerts: import('@/domain/types').Alert[];
  magicTokens: { token: string; email: string; createdAt: string }[];
}

function organization(input: Organization): Organization {
  return input;
}

function membership(
  id: string,
  user: DemoUser,
  org: Organization,
  role: Membership['role'],
): Membership {
  return {
    id,
    organizationId: org.id,
    userId: user.id,
    role,
    displayName: user.displayName,
    email: user.email,
    organization: org,
  };
}

function approvedDocument(
  now: Date,
  input: {
    id: string;
    organizationId: string;
    requirementId: string;
    uploadedByUserId: string;
    fileName: string;
    documentType: DocumentType;
    documentNumber: string;
    issuer: string;
    holderName: string;
    expiresInDays: number;
  },
): VaultDocument {
  const expiresOn = toISODate(addDays(now, input.expiresInDays));
  return {
    id: input.id,
    organizationId: input.organizationId,
    requirementId: input.requirementId,
    uploadedByUserId: input.uploadedByUserId,
    fileName: input.fileName,
    mimeType: 'application/pdf',
    storagePath: null,
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    issuer: input.issuer,
    holderName: input.holderName,
    issuedOn: toISODate(addDays(parseDate(expiresOn), -365)),
    expiresOn,
    confidence: 0.98,
    status: 'approved',
    reviewNote: null,
    createdAt: addDays(now, -18).toISOString(),
  };
}

function parseDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

export function createSeed(now: Date): Database {
  const harbor = organization({
    id: IDS.orgHarbor,
    name: 'Harborline Construction',
    slug: 'harborline',
    plan: 'pro',
    stripeCustomerId: 'cus_test_harborline',
    createdAt: '2024-03-12T15:00:00.000Z',
  });
  const cedar = organization({
    id: IDS.orgCedar,
    name: 'Cedar & Pine Interiors',
    slug: 'cedar-pine',
    plan: 'trial',
    stripeCustomerId: null,
    createdAt: '2025-11-02T15:00:00.000Z',
  });

  const maya: DemoUser = {
    id: IDS.userMaya,
    email: DEMO_MANAGER_EMAIL,
    displayName: 'Maya Chen',
    password: DEMO_PASSWORD,
  };
  const andre: DemoUser = {
    id: IDS.userAndre,
    email: 'andre@harborline.demo',
    displayName: 'Andre Walsh',
    password: DEMO_PASSWORD,
  };
  const leo: DemoUser = {
    id: IDS.userLeo,
    email: 'leo@harborline.demo',
    displayName: 'Leo Park',
    password: DEMO_PASSWORD,
  };
  const priya: DemoUser = {
    id: IDS.userPriya,
    email: 'priya@northstar.demo',
    displayName: 'Priya Shah',
    password: DEMO_PASSWORD,
  };
  const helen: DemoUser = {
    id: IDS.userHelen,
    email: 'helen@cedar.demo',
    displayName: 'Helen Cho',
    password: DEMO_PASSWORD,
  };

  const people: Person[] = [
    {
      id: IDS.personLeo,
      organizationId: harbor.id,
      memberUserId: leo.id,
      fullName: 'Leo Park',
      email: leo.email,
      title: 'Electrician',
      trade: 'Electrical',
    },
    {
      id: IDS.personSofia,
      organizationId: harbor.id,
      memberUserId: null,
      fullName: 'Sofia Alvarez',
      email: 'sofia@harborline.demo',
      title: 'Site supervisor',
      trade: 'General',
    },
    {
      id: IDS.personAndre,
      organizationId: harbor.id,
      memberUserId: andre.id,
      fullName: 'Andre Walsh',
      email: andre.email,
      title: 'Principal',
      trade: null,
    },
    {
      id: IDS.personMaya,
      organizationId: cedar.id,
      memberUserId: maya.id,
      fullName: 'Maya Chen',
      email: maya.email,
      title: 'Interior designer',
      trade: 'Interiors',
    },
  ];

  const vendors: Vendor[] = [
    {
      id: IDS.vendorNorthstar,
      organizationId: harbor.id,
      memberUserId: priya.id,
      name: 'Northstar Electric',
      trade: 'Electrical',
      contactName: 'Priya Shah',
      contactEmail: priya.email,
    },
    {
      id: IDS.vendorBluefin,
      organizationId: harbor.id,
      memberUserId: null,
      name: 'Bluefin Plumbing',
      trade: 'Plumbing',
      contactName: 'Marcus Hale',
      contactEmail: 'marcus@bluefin.demo',
    },
    {
      id: IDS.vendorCedarform,
      organizationId: harbor.id,
      memberUserId: null,
      name: 'Cedarform Scaffolding',
      trade: 'Scaffolding',
      contactName: 'Imani Brooks',
      contactEmail: 'imani@cedarform.demo',
    },
    {
      id: IDS.vendorHarrow,
      organizationId: harbor.id,
      memberUserId: null,
      name: 'Harrow Hauling',
      trade: 'Hauling',
      contactName: 'Chris Adeyemi',
      contactEmail: 'chris@harrow.demo',
    },
  ];

  const requirements: Requirement[] = [
    req(harbor.id, IDS.reqNorthstarGl, 'General liability COI', 'general_liability', null, IDS.vendorNorthstar),
    req(harbor.id, IDS.reqNorthstarWc, 'Workers compensation', 'workers_compensation', null, IDS.vendorNorthstar),
    req(harbor.id, IDS.reqNorthstarLicense, 'Electrical license', 'professional_license', null, IDS.vendorNorthstar),
    req(harbor.id, IDS.reqBluefinGl, 'General liability COI', 'general_liability', null, IDS.vendorBluefin),
    req(harbor.id, IDS.reqBluefinWc, 'Workers compensation', 'workers_compensation', null, IDS.vendorBluefin),
    req(harbor.id, IDS.reqCedarformGl, 'General liability COI', 'general_liability', null, IDS.vendorCedarform),
    req(harbor.id, IDS.reqCedarformWc, 'Workers compensation', 'workers_compensation', null, IDS.vendorCedarform),
    req(harbor.id, IDS.reqHarrowGl, 'General liability COI', 'general_liability', null, IDS.vendorHarrow),
    req(harbor.id, IDS.reqHarrowAuto, 'Auto liability', 'auto_liability', null, IDS.vendorHarrow),
    req(harbor.id, IDS.reqLeoOsha, 'OSHA 10 card', 'osha_card', IDS.personLeo, null),
    req(harbor.id, IDS.reqLeoLicense, 'Driver license', 'drivers_license', IDS.personLeo, null),
    req(harbor.id, IDS.reqLeoFirstAid, 'First aid card', 'certification', IDS.personLeo, null),
    req(harbor.id, IDS.reqSofiaForklift, 'Forklift certification', 'certification', IDS.personSofia, null),
    req(harbor.id, IDS.reqSofiaOsha, 'OSHA 30 card', 'osha_card', IDS.personSofia, null),
    req(harbor.id, IDS.reqAndreLicense, 'Contractor license', 'professional_license', IDS.personAndre, null),
    req(cedar.id, IDS.reqMayaLicense, 'Interior designer license', 'professional_license', IDS.personMaya, null),
    req(cedar.id, IDS.reqMayaGl, 'General liability COI', 'general_liability', IDS.personMaya, null),
  ];

  const documents: VaultDocument[] = [
    approvedDocument(now, doc('doc_northstar_gl', harbor.id, IDS.reqNorthstarGl, priya.id, 'northstar-gl.pdf', 'general_liability', 'GL-440218', 'Northbridge Mutual', 'Northstar Electric', 12)),
    approvedDocument(now, doc('doc_northstar_wc', harbor.id, IDS.reqNorthstarWc, priya.id, 'northstar-wc.pdf', 'workers_compensation', 'WC-188420', 'Harbor Mutual', 'Northstar Electric', 200)),
    approvedDocument(now, doc('doc_bluefin_gl', harbor.id, IDS.reqBluefinGl, andre.id, 'bluefin-gl.pdf', 'general_liability', 'GL-100293', 'Pinnacle Casualty', 'Bluefin Plumbing', -9)),
    approvedDocument(now, doc('doc_bluefin_wc', harbor.id, IDS.reqBluefinWc, andre.id, 'bluefin-wc.pdf', 'workers_compensation', 'WC-100294', 'Harbor Mutual', 'Bluefin Plumbing', 90)),
    approvedDocument(now, doc('doc_cedarform_gl', harbor.id, IDS.reqCedarformGl, andre.id, 'cedarform-gl.pdf', 'general_liability', 'GL-772100', 'Northbridge Mutual', 'Cedarform Scaffolding', 140)),
    approvedDocument(now, doc('doc_cedarform_wc', harbor.id, IDS.reqCedarformWc, andre.id, 'cedarform-wc.pdf', 'workers_compensation', 'WC-772101', 'Harbor Mutual', 'Cedarform Scaffolding', 160)),
    approvedDocument(now, doc('doc_harrow_auto', harbor.id, IDS.reqHarrowAuto, andre.id, 'harrow-auto.pdf', 'auto_liability', 'AL-552019', 'Pinnacle Casualty', 'Harrow Hauling', 6)),
    approvedDocument(now, doc('doc_leo_osha', harbor.id, IDS.reqLeoOsha, leo.id, 'leo-osha-10.pdf', 'osha_card', 'OSHA-10-3391', 'OSHA Training Institute', 'Leo Park', 6)),
    approvedDocument(now, doc('doc_leo_dl', harbor.id, IDS.reqLeoLicense, leo.id, 'leo-driver.pdf', 'drivers_license', 'DL-D4482911', 'Department of Motor Vehicles', 'Leo Park', 400)),
    approvedDocument(now, doc('doc_sofia_fork', harbor.id, IDS.reqSofiaForklift, andre.id, 'sofia-forklift.pdf', 'certification', 'CERT-FORK-220', 'National Safety Council', 'Sofia Alvarez', 28)),
    approvedDocument(now, doc('doc_sofia_osha', harbor.id, IDS.reqSofiaOsha, andre.id, 'sofia-osha-30.pdf', 'osha_card', 'OSHA-30-8821', 'OSHA Training Institute', 'Sofia Alvarez', 220)),
    approvedDocument(now, doc('doc_andre_lic', harbor.id, IDS.reqAndreLicense, andre.id, 'andre-license.pdf', 'professional_license', 'LIC-GC-19004', 'State Licensing Board', 'Andre Walsh', 80)),
    approvedDocument(now, doc('doc_maya_lic', cedar.id, IDS.reqMayaLicense, maya.id, 'maya-designer-license.pdf', 'professional_license', 'LIC-ID-5520', 'State Licensing Board', 'Maya Chen', 16)),
  ];

  const memberships = [
    membership('mem_maya_harbor', maya, harbor, 'compliance_manager'),
    membership('mem_andre_harbor', andre, harbor, 'owner'),
    membership('mem_leo_harbor', leo, harbor, 'employee'),
    membership('mem_priya_harbor', priya, harbor, 'vendor'),
    membership('mem_helen_cedar', helen, cedar, 'compliance_manager'),
    membership('mem_maya_cedar', maya, cedar, 'employee'),
  ];

  const database: Database = {
    users: [maya, andre, leo, priya, helen],
    organizations: [harbor, cedar],
    memberships,
    people,
    vendors,
    requirements,
    documents,
    alerts: [],
    magicTokens: [],
  };
  database.alerts = buildAlerts({ ...database, now });
  return database;
}

function req(
  organizationId: string,
  id: string,
  name: string,
  documentType: DocumentType,
  personId: string | null,
  vendorId: string | null,
): Requirement {
  return { id, organizationId, name, documentType, personId, vendorId, notes: null };
}

function doc(
  id: string,
  organizationId: string,
  requirementId: string,
  uploadedByUserId: string,
  fileName: string,
  documentType: DocumentType,
  documentNumber: string,
  issuer: string,
  holderName: string,
  expiresInDays: number,
) {
  return {
    id,
    organizationId,
    requirementId,
    uploadedByUserId,
    fileName,
    documentType,
    documentNumber,
    issuer,
    holderName,
    expiresInDays,
  };
}
