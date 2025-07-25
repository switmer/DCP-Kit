import { Database, Tables } from "./supabase";

// Demonstration of correct supabase-provided generic to use
// REMARK: in theory, all of the rest below could be changed to use this
export type CallSheetType = Tables<"call_sheet">

export type CallSheetMemberType =
  Database["public"]["Tables"]["call_sheet_member"]["Row"];

export type ProjectMemberType =
  Database["public"]["Tables"]["project_member"]["Row"];

export type ProjectPositionType =
  Database["public"]["Tables"]["project_position"]["Row"];

export type CompanyType = Database["public"]["Tables"]["company"]["Row"];

export type CompanyCrewMemberType =
  Database["public"]["Tables"]["company_crew_member"]["Row"];

export type CompanyEntityType =
  Database["public"]["Tables"]["company_entity"]["Row"];

export type ProjectEntityType =
  Database["public"]["Tables"]["project_entity"]["Row"];

export type EntityPointOfContactType =
  Database["public"]["Tables"]["entity_point_of_contact"]["Row"];

export type MemberType = Database["public"]["Tables"]["member"]["Row"];

export type NotificationLogType =
  Database["public"]["Tables"]["notification_log"]["Row"];

export type LocationType = Database["public"]["Tables"]["location"]["Row"];

export type ProjectLocationType =
  Database["public"]["Tables"]["project_location"]["Row"];

export type CallSheetLocationType =
  Database["public"]["Tables"]["call_sheet_location"]["Row"];

export type NoteType = Database["public"]["Tables"]["note"]["Row"];

export type ProjectType = Database["public"]["Tables"]["project"]["Row"];

export type RankType = Database["public"]["Tables"]["rank"]["Row"];

export type RateType = Database["public"]["Tables"]["role_rate"]["Row"];

export type PositionType = Database["public"]["Tables"]["position"]["Row"];

export type CrewingPositionType =
  Database["public"]["Tables"]["crewing_position"]["Row"] & {
    crewing_position_crew?: Database["public"]["Tables"]["crewing_position_crew"]["Row"][];
  };

export type CrewingPositionCrew =
  Database["public"]["Tables"]["crewing_position_crew"]["Row"];

export type CrewingContactAttempt =
  Database["public"]["Tables"]["crewing_contact_attempt"]["Row"];

export type Note = Database["public"]["Tables"]["note"]["Row"];
export type CompanyPolicy =
  Database["public"]["Tables"]["company_policy"]["Row"];

export type PushCall =
  Database["public"]["Tables"]["call_sheet_push_call"]["Row"];

export type FileAttachment = Database["public"]["Tables"]["file"]["Row"];
