import { relations } from "drizzle-orm/relations";
import { callSheet, notificationLog, callSheetMember, company, crewingContactAttempt, crewingContactAttemptMessage, location, callSheetLocation, project, companyEntity, usersInAuth, profile, companyUser, companyUserInvite, crewingPosition, companyCrewMember, member, roleRate, entityPointOfContact, projectEntity, file, noteFile, note, projectMember, bulkUpload, crewingPositionCrew, projectContactList, callSheetEntity, companyUserProject, position, projectLocation, crewRuleSet, noteAcknowledge, companyPolicy, projectPosition, rank, companySetting, callSheetPushCall } from "./schema";

export const notificationLogRelations = relations(notificationLog, ({one}) => ({
	callSheet: one(callSheet, {
		fields: [notificationLog.callSheet],
		references: [callSheet.id]
	}),
	callSheetMember: one(callSheetMember, {
		fields: [notificationLog.callSheetMember],
		references: [callSheetMember.id]
	}),
	company: one(company, {
		fields: [notificationLog.company],
		references: [company.id]
	}),
}));

export const callSheetRelations = relations(callSheet, ({one, many}) => ({
	notificationLogs: many(notificationLog),
	callSheetLocations: many(callSheetLocation),
	companyEntities: many(companyEntity),
	company: one(company, {
		fields: [callSheet.company],
		references: [company.id]
	}),
	project: one(project, {
		fields: [callSheet.project],
		references: [project.id]
	}),
	bulkUpload: one(bulkUpload, {
		fields: [callSheet.bulkUpload],
		references: [bulkUpload.id]
	}),
	files: many(file),
	callSheetEntities: many(callSheetEntity),
	notes: many(note),
	projectEntities: many(projectEntity),
	callSheetPushCalls: many(callSheetPushCall),
	callSheetMembers: many(callSheetMember),
}));

export const callSheetMemberRelations = relations(callSheetMember, ({one, many}) => ({
	notificationLogs: many(notificationLog),
	member: one(member, {
		fields: [callSheetMember.owner],
		references: [member.id]
	}),
	projectPosition: one(projectPosition, {
		fields: [callSheetMember.projectPosition],
		references: [projectPosition.id]
	}),
	callSheet: one(callSheet, {
		fields: [callSheetMember.callSheet],
		references: [callSheet.id]
	}),
	company: one(company, {
		fields: [callSheetMember.company],
		references: [company.id]
	}),
	companyCrewMember: one(companyCrewMember, {
		fields: [callSheetMember.crewMember],
		references: [companyCrewMember.id]
	}),
	project: one(project, {
		fields: [callSheetMember.project],
		references: [project.id]
	}),
}));

export const companyRelations = relations(company, ({many}) => ({
	notificationLogs: many(notificationLog),
	companyEntities: many(companyEntity),
	companyUsers: many(companyUser),
	companyUserInvites: many(companyUserInvite),
	companyCrewMembers: many(companyCrewMember),
	locations: many(location),
	callSheets: many(callSheet),
	files: many(file),
	projects: many(project),
	positions: many(position),
	bulkUploads: many(bulkUpload),
	crewRuleSets: many(crewRuleSet),
	companyPolicies: many(companyPolicy),
	ranks: many(rank),
	projectEntities: many(projectEntity),
	companySettings: many(companySetting),
	callSheetMembers: many(callSheetMember),
}));

export const crewingContactAttemptMessageRelations = relations(crewingContactAttemptMessage, ({one}) => ({
	crewingContactAttempt: one(crewingContactAttempt, {
		fields: [crewingContactAttemptMessage.attempt],
		references: [crewingContactAttempt.id]
	}),
}));

export const crewingContactAttemptRelations = relations(crewingContactAttempt, ({one, many}) => ({
	crewingContactAttemptMessages: many(crewingContactAttemptMessage),
	crewingPositionCrew: one(crewingPositionCrew, {
		fields: [crewingContactAttempt.crew],
		references: [crewingPositionCrew.id]
	}),
	companyCrewMember: one(companyCrewMember, {
		fields: [crewingContactAttempt.crewMemberId],
		references: [companyCrewMember.id]
	}),
	crewingPosition: one(crewingPosition, {
		fields: [crewingContactAttempt.position],
		references: [crewingPosition.id]
	}),
}));

export const callSheetLocationRelations = relations(callSheetLocation, ({one}) => ({
	location: one(location, {
		fields: [callSheetLocation.location],
		references: [location.id]
	}),
	callSheet: one(callSheet, {
		fields: [callSheetLocation.callSheet],
		references: [callSheet.id]
	}),
	project: one(project, {
		fields: [callSheetLocation.project],
		references: [project.id]
	}),
}));

export const locationRelations = relations(location, ({one, many}) => ({
	callSheetLocations: many(callSheetLocation),
	company: one(company, {
		fields: [location.company],
		references: [company.id]
	}),
	projectLocations: many(projectLocation),
}));

export const projectRelations = relations(project, ({one, many}) => ({
	callSheetLocations: many(callSheetLocation),
	companyEntities: many(companyEntity),
	companyUserInvites: many(companyUserInvite),
	crewingPositions: many(crewingPosition),
	entityPointOfContacts: many(entityPointOfContact),
	projectMembers: many(projectMember),
	callSheets: many(callSheet),
	projectContactLists: many(projectContactList),
	files: many(file),
	notes: many(note),
	company: one(company, {
		fields: [project.company],
		references: [company.id]
	}),
	companyUserProjects: many(companyUserProject),
	projectLocations: many(projectLocation),
	projectPositions: many(projectPosition),
	projectEntities: many(projectEntity),
	callSheetMembers: many(callSheetMember),
}));

export const companyEntityRelations = relations(companyEntity, ({one, many}) => ({
	callSheet: one(callSheet, {
		fields: [companyEntity.callSheet],
		references: [callSheet.id]
	}),
	company: one(company, {
		fields: [companyEntity.company],
		references: [company.id]
	}),
	project: one(project, {
		fields: [companyEntity.project],
		references: [project.id]
	}),
	entityPointOfContacts: many(entityPointOfContact),
}));

export const profileRelations = relations(profile, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [profile.id],
		references: [usersInAuth.id]
	}),
	companyUsers: many(companyUser),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	profiles: many(profile),
	companyUsers: many(companyUser),
}));

export const companyUserRelations = relations(companyUser, ({one, many}) => ({
	company: one(company, {
		fields: [companyUser.company],
		references: [company.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [companyUser.user],
		references: [usersInAuth.id]
	}),
	profile: one(profile, {
		fields: [companyUser.user],
		references: [profile.id]
	}),
	companyUserProjects: many(companyUserProject),
}));

export const companyUserInviteRelations = relations(companyUserInvite, ({one}) => ({
	company: one(company, {
		fields: [companyUserInvite.company],
		references: [company.id]
	}),
	project: one(project, {
		fields: [companyUserInvite.project],
		references: [project.id]
	}),
}));

export const crewingPositionRelations = relations(crewingPosition, ({one, many}) => ({
	project: one(project, {
		fields: [crewingPosition.project],
		references: [project.id]
	}),
	crewingPositionCrews: many(crewingPositionCrew),
	crewingContactAttempts: many(crewingContactAttempt),
}));

export const companyCrewMemberRelations = relations(companyCrewMember, ({one, many}) => ({
	company: one(company, {
		fields: [companyCrewMember.company],
		references: [company.id]
	}),
	member: one(member, {
		fields: [companyCrewMember.owner],
		references: [member.id]
	}),
	roleRates: many(roleRate),
	projectMembers: many(projectMember),
	crewingPositionCrews: many(crewingPositionCrew),
	positions: many(position),
	crewingContactAttempts: many(crewingContactAttempt),
	callSheetMembers: many(callSheetMember),
}));

export const memberRelations = relations(member, ({many}) => ({
	companyCrewMembers: many(companyCrewMember),
	noteAcknowledges: many(noteAcknowledge),
	callSheetMembers: many(callSheetMember),
}));

export const roleRateRelations = relations(roleRate, ({one}) => ({
	companyCrewMember: one(companyCrewMember, {
		fields: [roleRate.crewMember],
		references: [companyCrewMember.id]
	}),
}));

export const entityPointOfContactRelations = relations(entityPointOfContact, ({one}) => ({
	companyEntity: one(companyEntity, {
		fields: [entityPointOfContact.companyEntity],
		references: [companyEntity.id]
	}),
	projectEntity: one(projectEntity, {
		fields: [entityPointOfContact.projectEntity],
		references: [projectEntity.id]
	}),
	project: one(project, {
		fields: [entityPointOfContact.project],
		references: [project.id]
	}),
}));

export const projectEntityRelations = relations(projectEntity, ({one, many}) => ({
	entityPointOfContacts: many(entityPointOfContact),
	callSheet: one(callSheet, {
		fields: [projectEntity.callSheet],
		references: [callSheet.id]
	}),
	company: one(company, {
		fields: [projectEntity.company],
		references: [company.id]
	}),
	project: one(project, {
		fields: [projectEntity.project],
		references: [project.id]
	}),
}));

export const noteFileRelations = relations(noteFile, ({one}) => ({
	file: one(file, {
		fields: [noteFile.file],
		references: [file.id]
	}),
	note: one(note, {
		fields: [noteFile.note],
		references: [note.id]
	}),
}));

export const fileRelations = relations(file, ({one, many}) => ({
	noteFiles: many(noteFile),
	callSheet: one(callSheet, {
		fields: [file.callSheet],
		references: [callSheet.id]
	}),
	company: one(company, {
		fields: [file.company],
		references: [company.id]
	}),
	project: one(project, {
		fields: [file.project],
		references: [project.id]
	}),
}));

export const noteRelations = relations(note, ({one, many}) => ({
	noteFiles: many(noteFile),
	callSheet: one(callSheet, {
		fields: [note.callSheet],
		references: [callSheet.id]
	}),
	project: one(project, {
		fields: [note.project],
		references: [project.id]
	}),
	noteAcknowledges: many(noteAcknowledge),
}));

export const projectMemberRelations = relations(projectMember, ({one, many}) => ({
	companyCrewMember: one(companyCrewMember, {
		fields: [projectMember.crew],
		references: [companyCrewMember.id]
	}),
	project: one(project, {
		fields: [projectMember.project],
		references: [project.id]
	}),
	projectPositions: many(projectPosition),
}));

export const bulkUploadRelations = relations(bulkUpload, ({one, many}) => ({
	callSheets: many(callSheet),
	company: one(company, {
		fields: [bulkUpload.company],
		references: [company.id]
	}),
}));

export const crewingPositionCrewRelations = relations(crewingPositionCrew, ({one, many}) => ({
	companyCrewMember: one(companyCrewMember, {
		fields: [crewingPositionCrew.crew],
		references: [companyCrewMember.id]
	}),
	crewingPosition: one(crewingPosition, {
		fields: [crewingPositionCrew.crewingPosition],
		references: [crewingPosition.id]
	}),
	crewingContactAttempts: many(crewingContactAttempt),
}));

export const projectContactListRelations = relations(projectContactList, ({one}) => ({
	project: one(project, {
		fields: [projectContactList.project],
		references: [project.id]
	}),
}));

export const callSheetEntityRelations = relations(callSheetEntity, ({one}) => ({
	callSheet: one(callSheet, {
		fields: [callSheetEntity.callSheet],
		references: [callSheet.id]
	}),
}));

export const companyUserProjectRelations = relations(companyUserProject, ({one}) => ({
	companyUser: one(companyUser, {
		fields: [companyUserProject.companyUserId],
		references: [companyUser.id]
	}),
	project: one(project, {
		fields: [companyUserProject.project],
		references: [project.id]
	}),
}));

export const positionRelations = relations(position, ({one}) => ({
	company: one(company, {
		fields: [position.company],
		references: [company.id]
	}),
	companyCrewMember: one(companyCrewMember, {
		fields: [position.crew],
		references: [companyCrewMember.id]
	}),
}));

export const projectLocationRelations = relations(projectLocation, ({one}) => ({
	location: one(location, {
		fields: [projectLocation.location],
		references: [location.id]
	}),
	project: one(project, {
		fields: [projectLocation.project],
		references: [project.id]
	}),
}));

export const crewRuleSetRelations = relations(crewRuleSet, ({one}) => ({
	company: one(company, {
		fields: [crewRuleSet.company],
		references: [company.id]
	}),
}));

export const noteAcknowledgeRelations = relations(noteAcknowledge, ({one}) => ({
	member: one(member, {
		fields: [noteAcknowledge.member],
		references: [member.id]
	}),
	note: one(note, {
		fields: [noteAcknowledge.note],
		references: [note.id]
	}),
	companyPolicy: one(companyPolicy, {
		fields: [noteAcknowledge.notice],
		references: [companyPolicy.id]
	}),
}));

export const companyPolicyRelations = relations(companyPolicy, ({one, many}) => ({
	noteAcknowledges: many(noteAcknowledge),
	company: one(company, {
		fields: [companyPolicy.company],
		references: [company.id]
	}),
}));

export const projectPositionRelations = relations(projectPosition, ({one, many}) => ({
	project: one(project, {
		fields: [projectPosition.project],
		references: [project.id]
	}),
	projectMember: one(projectMember, {
		fields: [projectPosition.projectMember],
		references: [projectMember.id]
	}),
	callSheetMembers: many(callSheetMember),
}));

export const rankRelations = relations(rank, ({one}) => ({
	company: one(company, {
		fields: [rank.company],
		references: [company.id]
	}),
}));

export const companySettingRelations = relations(companySetting, ({one}) => ({
	company: one(company, {
		fields: [companySetting.company],
		references: [company.id]
	}),
}));

export const callSheetPushCallRelations = relations(callSheetPushCall, ({one}) => ({
	callSheet: one(callSheet, {
		fields: [callSheetPushCall.callSheet],
		references: [callSheet.id]
	}),
}));