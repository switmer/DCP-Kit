import {
  pgTable,
  foreignKey,
  pgPolicy,
  serial,
  timestamp,
  boolean,
  uuid,
  text,
  bigint,
  integer,
  unique,
  varchar,
  index,
  jsonb,
  pgView,
  pgEnum,
  pgSchema,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const callSheetMemberStatus = pgEnum('CallSheetMemberStatus', [
  'sent-call-card',
  'confirmed',
  'pending',
  'call-card-sms-failed',
  'call-card-sms-delivered',
]);
export const callSheetStatus = pgEnum('CallSheetStatus', ['ready', 'draft', 'parsing', 'error', 'processing']);
export const companyNoticePriority = pgEnum('company_notice_priority', ['above', 'below']);
export const crewingContactAttemptStatus = pgEnum('crewing_contact_attempt_status', [
  'pending',
  'declined',
  'no_response',
  'confirmed',
  'contacted',
]);
export const fileType = pgEnum('file_type', ['default', 'signable']);
export const hiringStatus = pgEnum('hiring_status', ['open', 'in_progress', 'closed', 'completed']);
export const locationType = pgEnum('location_type', [
  'shoot',
  'hospital',
  'parking',
  'production office',
  'basecamp',
  'food',
]);
export const messageSource = pgEnum('message_source', ['twilio']);
export const messageType = pgEnum('message_type', ['sms', 'email']);
export const noteType = pgEnum('note_type', ['before_details', 'on_page']);
export const notificationType = pgEnum('notification_type', [
  'message',
  'message_delivered',
  'message_failed',
  'call_card_sent',
  'call_card_confirmed',
  'call_card_opened',
  'call_card_login_email',
  'call_card_login_phone',
  'call_card_delivered',
  'call_card_failed',
  'call_card_push_sent',
  'call_card_opened_pdf',
  'call_card_email_sent',
  'call_card_email_delivered',
  'call_card_email_failed',
  'message_email',
  'message_email_delivered',
  'message_email_failed',
  'message_email_opened',
  'call_card_email_opened',
]);
export const projectCrewStatus = pgEnum('project_crew_status', ['declined', 'pending', 'confirmed', 'contacted']);
export const projectRoleType = pgEnum('project_role_type', ['admin', 'user', 'guest']);
export const rateType = pgEnum('rate_type', ['hour', 'day', 'week']);
export const role = pgEnum('role', ['admin', 'user', 'guest']);

const authSchema = pgSchema('auth');

export const usersInAuth = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});

export const notificationLog = pgTable(
  'notification_log',
  {
    id: serial().primaryKey().notNull(),
    type: notificationType().notNull(),
    createdDate: timestamp('created_date', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    isRead: boolean('is_read'),
    company: uuid(),
    callSheet: uuid('call_sheet'),
    callSheetMember: uuid('call_sheet_member'),
    content: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'public_notification_log_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.callSheetMember],
      foreignColumns: [callSheetMember.id],
      name: 'public_notification_log_call_sheet_member_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'public_notification_log_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Enable delete for users based on user_id', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`true`,
    }),
  ],
);

export const crewingContactAttemptMessage = pgTable(
  'crewing_contact_attempt_message',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'crewing_contact_attempt_message_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    type: messageType(),
    attempt: integer(),
    externalId: text('external_id'),
    source: messageSource(),
    to: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.attempt],
      foreignColumns: [crewingContactAttempt.id],
      name: 'crewing_contact_attempt_message_attempt_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const callSheetLocation = pgTable(
  'call_sheet_location',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'project_location_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    project: uuid().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    location: bigint({ mode: 'number' }).notNull(),
    callSheet: uuid('call_sheet'),
    name: text(),
    instructions: text(),
    description: text(),
    type: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    order: bigint({ mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.location],
      foreignColumns: [location.id],
      name: 'call_sheet_location_location_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'project_location_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'project_location_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const companyEntity = pgTable(
  'company_entity',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    name: text(),
    callSheet: uuid('call_sheet'),
    project: uuid(),
    company: uuid(),
    type: text(),
    address: text(),
    phone: text(),
    logo: text(),
    subtype: text(),
    email: text(),
    order: integer(),
  },
  (table) => [
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'company_entity_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'company_entity_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'company_entity_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const profile = pgTable(
  'profile',
  {
    id: uuid().primaryKey().notNull(),
    phone: text(),
    email: text(),
    name: text(),
    picture: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [usersInAuth.id],
      name: 'profile_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const companyUser = pgTable(
  'company_user',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'company_user_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    user: uuid(),
    company: uuid(),
    role: role().default('admin'),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'company_user_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.user],
      foreignColumns: [usersInAuth.id],
      name: 'company_user_user_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.user],
      foreignColumns: [profile.id],
      name: 'company_user_user_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Enable read access based on user id', {
      as: 'permissive',
      for: 'select',
      to: ['public'],
      using: sql`(( SELECT auth.uid() AS uid) = "user")`,
    }),
  ],
);

export const companyUserInvite = pgTable(
  'company_user_invite',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: text().notNull(),
    company: uuid(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    token: text().notNull(),
    used: boolean().default(false),
    role: role(),
    project: uuid(),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'company_user_invite_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'company_user_invite_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('company_user_invite_token_key').on(table.token),
  ],
);

export const crewingPosition = pgTable(
  'crewing_position',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'crewing_positions_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    project: uuid(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    quantity: bigint({ mode: 'number' }).default(sql`'1'`),
    position: text(),
    hiringStatus: hiringStatus('hiring_status').default('open'),
  },
  (table) => [
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'crewing_position_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Enable insert for authenticated users only', {
      as: 'permissive',
      for: 'all',
      to: ['authenticated'],
      using: sql`true`,
    }),
  ],
);

export const member = pgTable(
  'member',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    email: varchar(),
    phone: text(),
    name: text(),
    title: text(),
    city: text(),
    state: text(),
    department: text(),
    avatar: text(),
    instagram: text(),
    youtube: text(),
    vimeo: text(),
    imdb: text(),
  },
  (table) => [
    pgPolicy('Enable delete for users based on user_id', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`(auth.uid() = id)`,
    }),
  ],
);

export const companyCrewMember = pgTable(
  'company_crew_member',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'company_crew_member_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    company: uuid(),
    email: text(),
    phone: text(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    owner: uuid(),
    name: text(),
    aliases: text().array(),
    tfs: text(),
    city: text(),
    state: text(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    note: text(),
  },
  (table) => [
    index('idx_company_crew_member_tfs').using('gin', table.tfs.asc().nullsLast().op('gin_trgm_ops')),
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'company_crew_member_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.owner],
      foreignColumns: [member.id],
      name: 'company_crew_member_owner_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    pgPolicy('Enable delete for users based on user_id', {
      as: 'permissive',
      for: 'all',
      to: ['public'],
      using: sql`true`,
    }),
  ],
);

export const roleRate = pgTable(
  'role_rate',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'role_rate_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    role: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crewMember: bigint('crew_member', { mode: 'number' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    rate: bigint({ mode: 'number' }),
    currency: text(),
    type: rateType().default('hour'),
  },
  (table) => [
    foreignKey({
      columns: [table.crewMember],
      foreignColumns: [companyCrewMember.id],
      name: 'role_rate_crew_member_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('All', { as: 'permissive', for: 'all', to: ['public'], using: sql`true` }),
  ],
);

export const location = pgTable(
  'location',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'location_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    company: uuid(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    description: text(),
    name: text(),
    address: text(),
    instructions: text(),
    type: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    priority: bigint({ mode: 'number' }),
    city: text(),
    state: text(),
    zip: text(),
    placesJson: jsonb('places_json'),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'location_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const entityPointOfContact = pgTable(
  'entity_point_of_contact',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    name: text(),
    phone: text(),
    email: text(),
    companyEntity: uuid('company_entity'),
    avatar: text(),
    project: uuid(),
    projectEntity: uuid('project_entity'),
  },
  (table) => [
    foreignKey({
      columns: [table.companyEntity],
      foreignColumns: [companyEntity.id],
      name: 'entity_point_of_contact_company_entity_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.projectEntity],
      foreignColumns: [projectEntity.id],
      name: 'entity_point_of_contact_project_entity_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'entity_point_of_contact_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const noteFile = pgTable(
  'note_file',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'note_file_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    file: bigint({ mode: 'number' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    note: bigint({ mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.file],
      foreignColumns: [file.id],
      name: 'note_file_file_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.note],
      foreignColumns: [note.id],
      name: 'note_file_note_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const projectMember = pgTable(
  'project_member',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'project_member_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    project: uuid(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crew: bigint({ mode: 'number' }),
    email: text(),
    phone: text(),
    name: text(),
    shortId: text('short_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.crew],
      foreignColumns: [companyCrewMember.id],
      name: 'project_member_crew_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'project_member_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const callSheet = pgTable(
  'call_sheet',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    src: text(),
    project: uuid(),
    status: callSheetStatus().default('draft'),
    job: uuid(),
    shortId: text('short_id'),
    rawJson: jsonb('raw_json'),
    company: uuid().default(sql`auth.uid()`),
    date: text(),
    historical: boolean(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    bulkUpload: bigint('bulk_upload', { mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'call_sheet_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'call_sheet_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.bulkUpload],
      foreignColumns: [bulkUpload.id],
      name: 'public_call_sheet_bulk_upload_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    pgPolicy('Enable update for users based on user_id', {
      as: 'permissive',
      for: 'all',
      to: ['authenticated'],
      using: sql`true`,
    }),
  ],
);

export const crewingPositionCrew = pgTable(
  'crewing_position_crew',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'crewing_position_crew_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crewingPosition: bigint('crewing_position', { mode: 'number' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crew: bigint({ mode: 'number' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    priority: bigint({ mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.crew],
      foreignColumns: [companyCrewMember.id],
      name: 'crewing_position_crew_crew_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.crewingPosition],
      foreignColumns: [crewingPosition.id],
      name: 'crewing_position_crew_crewing_position_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Enable insert for authenticated users only', {
      as: 'permissive',
      for: 'all',
      to: ['authenticated'],
      using: sql`true`,
    }),
  ],
);

export const projectContactList = pgTable(
  'project_contact_list',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'project_contact_list_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    src: text(),
    project: uuid(),
    md: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'project_contact_list_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const file = pgTable(
  'file',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'file_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    company: uuid(),
    project: uuid(),
    callSheet: uuid('call_sheet'),
    src: text(),
    title: text(),
    type: fileType().default('default'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    priority: bigint({ mode: 'number' }).default(sql`'0'`),
    kind: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'file_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'file_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'file_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const testDbPullTableTable = pgTable('test_db_pull_table_table', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
    name: 'test_db_pull_table_table_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 9223372036854775807,
    cache: 1,
  }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const callSheetEntity = pgTable(
  'call_sheet_entity',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    callSheet: uuid('call_sheet'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    name: text(),
    type: text(),
    address: text(),
    phone: text(),
    logo: text(),
    subtype: text(),
    email: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'call_sheet_entity_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const note = pgTable(
  'note',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'notes_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    project: uuid(),
    callSheet: uuid('call_sheet'),
    note: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    priority: bigint({ mode: 'number' }).default(sql`'0'`),
    title: text(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    acknowledgeable: boolean().default(false),
    type: noteType().default('on_page').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'note_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'note_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const project = pgTable(
  'project',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    company: uuid(),
    name: text(),
    dates: text().array(),
    prepDates: text('prep_dates').array(),
    postDates: text('post_dates').array(),
    type: text(),
    slug: text(),
    jobNumber: text('job_number'),
    contactInfoVisible: boolean('contact_info_visible').default(true),
    budget: text(),
    status: text(),
    clientOrAgency: text('client_or_agency'),
    deliveryDate: text('delivery_date'),
    shortId: text('short_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'public_project_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('project_slug_key').on(table.slug),
    pgPolicy('Update only your own projects', {
      as: 'permissive',
      for: 'update',
      to: ['authenticated'],
      using: sql`true`,
    }),
    pgPolicy('Insert a project only for users own company', { as: 'permissive', for: 'insert', to: ['authenticated'] }),
    pgPolicy('Select only company with its auth id', { as: 'permissive', for: 'select', to: ['authenticated'] }),
    pgPolicy('Enable delete for users based on user_id', { as: 'permissive', for: 'delete', to: ['authenticated'] }),
  ],
);

export const companyUserProject = pgTable(
  'company_user_project',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'company_user_project_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    companyUserId: bigint('company_user_id', { mode: 'number' }).notNull(),
    project: uuid(),
    role: role(),
  },
  (table) => [
    foreignKey({
      columns: [table.companyUserId],
      foreignColumns: [companyUser.id],
      name: 'company_user_project_company_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'company_user_project_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const position = pgTable(
  'position',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'position_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    name: text(),
    company: uuid(),
    department: text().array(),
    known: boolean(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crew: bigint({ mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'position_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.crew],
      foreignColumns: [companyCrewMember.id],
      name: 'public_position_crew_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Policy CRUD', { as: 'permissive', for: 'all', to: ['authenticated'], using: sql`true` }),
  ],
);

export const bulkUpload = pgTable(
  'bulk_upload',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'bulk_uploads_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    company: uuid().defaultRandom(),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'public_bulk_uploads_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Enable crud for authenticated users only', {
      as: 'permissive',
      for: 'all',
      to: ['authenticated'],
      using: sql`true`,
    }),
  ],
);

export const crewingContactAttempt = pgTable(
  'crewing_contact_attempt',
  {
    id: serial().primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    position: bigint({ mode: 'number' }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crew: bigint({ mode: 'number' }).notNull(),
    status: crewingContactAttemptStatus().default('pending').notNull(),
    contactedAt: timestamp('contacted_at', { mode: 'string' }),
    responseDeadline: timestamp('response_deadline', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    shortId: text('short_id'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crewMemberId: bigint('crew_member_id', { mode: 'number' }),
  },
  (table) => [
    index('idx_crewing_contact_attempts_status').using('btree', table.status.asc().nullsLast().op('enum_ops')),
    foreignKey({
      columns: [table.crew],
      foreignColumns: [crewingPositionCrew.id],
      name: 'crewing_contact_attempt_crew_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.crewMemberId],
      foreignColumns: [companyCrewMember.id],
      name: 'crewing_contact_attempt_crew_member_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.position],
      foreignColumns: [crewingPosition.id],
      name: 'crewing_contact_attempt_position_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const projectLocation = pgTable(
  'project_location',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'project_location_id_seq1',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    project: uuid().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    location: bigint({ mode: 'number' }).notNull(),
    name: text(),
    instructions: text(),
    description: text(),
    type: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    order: bigint({ mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.location],
      foreignColumns: [location.id],
      name: 'project_location_location_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'project_location_project_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const company = pgTable(
  'company',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    name: text(),
    avatar: text(),
    subdomain: text(),
    phoneNumber: text('phone_number'),
  },
  (table) => [
    unique('company_slug_key').on(table.subdomain),
    pgPolicy('Select only company with its auth id', {
      as: 'permissive',
      for: 'select',
      to: ['authenticated'],
      using: sql`true`,
    }),
    pgPolicy('Insert only company with its auth id', { as: 'permissive', for: 'insert', to: ['authenticated'] }),
    pgPolicy('Update only company with its auth id', { as: 'permissive', for: 'update', to: ['authenticated'] }),
  ],
);

export const crewRuleSet = pgTable(
  'crew_rule_set',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'crew_rule_set_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    company: uuid(),
    ruleSet: jsonb('rule_set').default({}),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'crew_rule_set_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('crew_rule_set_company_key').on(table.company),
    pgPolicy('Crew rule set', { as: 'permissive', for: 'all', to: ['public'], using: sql`true` }),
  ],
);

export const noteAcknowledge = pgTable(
  'note_acknowledge',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'note_acknowledge_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    note: bigint({ mode: 'number' }),
    member: uuid(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    notice: bigint({ mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.member],
      foreignColumns: [member.id],
      name: 'note_acknowledge_member_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.note],
      foreignColumns: [note.id],
      name: 'note_acknowledge_note_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.notice],
      foreignColumns: [companyPolicy.id],
      name: 'note_acknowledge_notice_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const projectPosition = pgTable(
  'project_position',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'project_position_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    title: text(),
    department: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    projectMember: bigint('project_member', { mode: 'number' }),
    project: uuid(),
    order: integer(),
    status: projectCrewStatus().default('pending'),
  },
  (table) => [
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'project_position_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.projectMember],
      foreignColumns: [projectMember.id],
      name: 'project_position_project_member_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const companyPolicy = pgTable(
  'company_policy',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'company_policy_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    note: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    priority: bigint({ mode: 'number' }),
    title: text(),
    acknowledgeable: boolean(),
    type: noteType(),
    company: uuid(),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'company_policy_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const rank = pgTable(
  'rank',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'ranks_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crew: bigint({ mode: 'number' }).array(),
    company: uuid(),
    role: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'rank_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('ranks', { as: 'permissive', for: 'all', to: ['authenticated'], using: sql`true` }),
  ],
);

export const projectEntity = pgTable(
  'project_entity',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    name: text(),
    callSheet: uuid('call_sheet'),
    project: uuid(),
    company: uuid(),
    type: text(),
    address: text(),
    phone: text(),
    logo: text(),
    subtype: text(),
    email: text(),
    order: integer(),
  },
  (table) => [
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'project_entity_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'project_entity_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'project_entity_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const companySetting = pgTable(
  'company_setting',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'company_setting_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    companyNoticePriority: companyNoticePriority('company_notice_priority'),
    company: uuid(),
  },
  (table) => [
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'company_setting_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('company_setting_company_key').on(table.company),
  ],
);

export const callSheetPushCall = pgTable(
  'call_sheet_push_call',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'call_sheet_push_call_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    callSheet: uuid('call_sheet'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    hours: bigint({ mode: 'number' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    minutes: bigint({ mode: 'number' }),
    notify: boolean(),
    src: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'call_sheet_push_call_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const callSheetMember = pgTable(
  'call_sheet_member',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    callSheet: uuid('call_sheet'),
    company: uuid(),
    owner: uuid(),
    shortId: text('short_id'),
    callTime: text('call_time'),
    department: text(),
    email: text(),
    name: text(),
    phone: text(),
    title: text(),
    status: callSheetMemberStatus().default('pending'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    order: bigint({ mode: 'number' }),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'string' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'string' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    crewMember: bigint('crew_member', { mode: 'number' }),
    project: uuid(),
    city: text(),
    state: text(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    isKey: boolean().default(false),
    contactInfoVisible: boolean('contact_info_visible'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    projectPosition: bigint('project_position', { mode: 'number' }),
  },
  (table) => [
    foreignKey({
      columns: [table.owner],
      foreignColumns: [member.id],
      name: 'call_sheet_member_owner_fkey',
    }),
    foreignKey({
      columns: [table.projectPosition],
      foreignColumns: [projectPosition.id],
      name: 'call_sheet_member_project_position_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.callSheet],
      foreignColumns: [callSheet.id],
      name: 'public_call_sheet_member_call_sheet_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.company],
      foreignColumns: [company.id],
      name: 'public_call_sheet_member_company_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.crewMember],
      foreignColumns: [companyCrewMember.id],
      name: 'public_call_sheet_member_crew_member_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.project],
      foreignColumns: [project.id],
      name: 'public_call_sheet_member_project_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('CRUD call_sheet_member', { as: 'permissive', for: 'all', to: ['authenticated'], using: sql`true` }),
  ],
);
export const distinctCallSheetMember = pgView('distinct_call_sheet_member', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  crewMember: bigint('crew_member', { mode: 'number' }),
  project: uuid(),
}).as(sql`SELECT DISTINCT call_sheet_member.crew_member, call_sheet_member.project FROM call_sheet_member`);
