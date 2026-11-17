// ชนิดข้อมูลที่ส่งระหว่าง API <-> หน้าเว็บ (วันที่เป็น ISO string เสมอ)
// ชื่อฟิลด์เป็น snake_case ตรงกับ Firestore ทั้งหมด

export type Role = "admin" | "student";
export type SubmissionStatus = "submitted";

export interface UserDto {
  line_user_id: string;
  display_name: string;
  picture_url: string;
  role: Role;
  room_id: string;
  total_points: number;
  created_at: string;
}

/** ข้อมูลห้องที่เปิดเผยให้นักเรียนเห็นได้ (ไม่มี room_secret_code) */
export interface RoomPublicDto {
  room_id: string;
  room_name: string;
}

/** ข้อมูลห้องแบบเต็ม ส่งให้เฉพาะหัวหน้าห้องของห้องนั้น */
export interface RoomAdminDto extends RoomPublicDto {
  room_secret_code: string;
  admin_line_user_id: string;
  created_at: string;
}

export interface TaskDto {
  task_id: string;
  room_id: string;
  subject: string;
  description: string;
  image_url: string;
  due_date: string;
  points: number;
  notify_at: string | null;
  notified: boolean;
  created_by: string;
  created_at: string;
}

export interface SubmissionDto {
  task_id: string;
  line_user_id: string;
  room_id: string;
  status: SubmissionStatus;
  earned_points: number;
  submitted_at: string;
}

export interface LineIdentity {
  line_user_id: string;
  display_name: string;
  picture_url: string;
}

export interface MeResponse {
  identity: LineIdentity;
  user: UserDto | null;
  room: RoomPublicDto | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// ---------- รูปแบบคำตอบของแต่ละ API ----------

export interface RoomAdminResponse {
  room: RoomAdminDto;
  join_url: string;
  invite_text: string;
}

export interface RegisterResponse extends RoomAdminResponse {
  push_sent: boolean;
}

export interface AdminTaskDto extends TaskDto {
  submitted_count: number;
}

export interface AdminTasksResponse {
  tasks: AdminTaskDto[];
  member_count: number;
}

export interface MemberSubmissionDto {
  line_user_id: string;
  display_name: string;
  picture_url: string;
  role: Role;
  submitted: boolean;
  submitted_at: string | null;
}

export interface TaskSubmissionsResponse {
  task_id: string;
  members: MemberSubmissionDto[];
}

export interface StudentTaskDto extends TaskDto {
  submitted: boolean;
  submitted_at: string | null;
}

export interface StudentTasksResponse {
  tasks: StudentTaskDto[];
  total_points: number;
}

export interface SubmitResponse {
  submission: SubmissionDto;
  earned_points: number;
  total_points: number;
}

export interface LeaderboardEntryDto {
  rank: number;
  line_user_id: string;
  display_name: string;
  picture_url: string;
  total_points: number;
  is_me: boolean;
}

export interface LeaderboardResponse {
  room_name: string;
  entries: LeaderboardEntryDto[];
}

export interface ChatMessageDto {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  remaining_today: number;
}
