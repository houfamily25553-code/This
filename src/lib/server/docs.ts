import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type {
  Role,
  RoomAdminDto,
  RoomPublicDto,
  SubmissionDto,
  SubmissionStatus,
  TaskDto,
  UserDto,
} from "@/lib/types";

// รูปร่างเอกสารใน Firestore (ตรงตามข้อกำหนดข้อ 1)

export interface RoomDoc {
  room_id: string;
  room_name: string;
  room_secret_code: string;
  admin_line_user_id: string;
  created_at: Timestamp;
}

export interface UserDoc {
  line_user_id: string;
  display_name: string;
  picture_url: string;
  role: Role;
  room_id: string; // "" = ยังไม่ได้อยู่ห้องใด
  total_points: number;
  created_at: Timestamp;
}

export interface TaskDoc {
  task_id: string;
  room_id: string;
  subject: string;
  description: string;
  image_url: string;
  due_date: Timestamp;
  points: number;
  notify_at: Timestamp | null;
  notified: boolean;
  created_by: string;
  created_at: Timestamp;
}

export interface SubmissionDoc {
  task_id: string;
  line_user_id: string;
  room_id: string;
  status: SubmissionStatus;
  earned_points: number;
  submitted_at: Timestamp;
}

export function submissionId(task_id: string, line_user_id: string): string {
  return `${task_id}_${line_user_id}`;
}

const iso = (t: Timestamp) => t.toDate().toISOString();

export function toUserDto(d: UserDoc): UserDto {
  return { ...d, created_at: iso(d.created_at) };
}

export function toRoomPublicDto(d: RoomDoc): RoomPublicDto {
  return { room_id: d.room_id, room_name: d.room_name };
}

export function toRoomAdminDto(d: RoomDoc): RoomAdminDto {
  return { ...d, created_at: iso(d.created_at) };
}

export function toTaskDto(d: TaskDoc): TaskDto {
  return {
    ...d,
    due_date: iso(d.due_date),
    notify_at: d.notify_at ? iso(d.notify_at) : null,
    created_at: iso(d.created_at),
  };
}

export function toSubmissionDto(d: SubmissionDoc): SubmissionDto {
  return { ...d, submitted_at: iso(d.submitted_at) };
}
