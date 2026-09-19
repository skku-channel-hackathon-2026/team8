import { z } from "zod";

export const TUTORIAL_WAM_NAME = "tutorial";

export const TUTORIAL_FUNCTIONS = {
  open: "tutorial.open",
  sendAsBot: "tutorial.sendAsBot",
  writeAsManager: "writeGroupMessageAsManager",
} as const;

export const CommandActionInputSchema = z.object({
  chat: z.object({ type: z.string(), id: z.string() }).optional(),
  trigger: z
    .object({
      type: z.string(),
      attributes: z
        .record(z.string())
        .nullish()
        .transform((attributes) => attributes ?? {}),
    })
    .optional(),
  input: z
    .record(z.unknown())
    .nullish()
    .transform((input) => input ?? {}),
  language: z.string().optional(),
});

export type CommandActionInput = z.infer<typeof CommandActionInputSchema>;

export const SendAsBotInputSchema = z.object({
  targetToken: z.string().min(1),
  rootMessageId: z.string().optional(),
  broadcast: z.boolean().default(false),
});

export type SendAsBotInput = z.infer<typeof SendAsBotInputSchema>;

export const TutorialWamArgsSchema = z.object({
  chatId: z.string(),
  chatType: z.string(),
  chatTitle: z.string(),
  rootMessageId: z.string().optional(),
  broadcast: z.boolean(),
  managerId: z.string(),
  message: z.string(),
  targetToken: z.string().optional(),
  // 타공사 WAM이 서버의 AI 기능을 부를 때 쓰는 서명 토큰
  sessionToken: z.string().optional(),
});

export type TutorialWamArgs = z.infer<typeof TutorialWamArgsSchema>;

export const TutorialWamDataSchema = TutorialWamArgsSchema.extend({
  appId: z.string(),
  channelId: z.string(),
});

export type TutorialWamData = z.infer<typeof TutorialWamDataSchema>;

export type WriteGroupMessageAsManagerInput = {
  channelId: string;
  groupId: string;
  rootMessageId?: string;
  broadcast: boolean;
  dto: {
    plainText: string;
    managerId: string;
  };
};

// ---------------------------------------------------------------------------
// 타공사 API 계약. 서버가 검증하고 WAM이 같은 타입을 쓴다.
// ---------------------------------------------------------------------------

export const CampusSchema = z.enum(["humanities", "natural"]);
export const RoleSchema = z.enum(["fresh", "senior"]);

/** 수업 한 칸. day: 0=월 … 4=금, start/end: 자정부터 흐른 분 */
export const ClassBlockSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  day: z.number().int().min(0).max(4),
  start: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  end: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  place: z.string().max(40).default(""),
});

export type ClassBlock = z.infer<typeof ClassBlockSchema>;

export const SignupInputSchema = z.object({
  nickname: z.string().trim().min(2).max(10),
  department: z.string().trim().min(1).max(40),
  campus: CampusSchema,
  role: RoleSchema,
});

export type SignupInput = z.infer<typeof SignupInputSchema>;

export const TimetableInputSchema = z.object({
  blocks: z.array(ClassBlockSchema).max(60),
});

export const ShowFreeInputSchema = z.object({ value: z.boolean() });

/** 서버가 돌려주는 내 프로필. id는 채널톡 신원에서 파생되며 클라가 못 고른다. */
export const ProfileSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  managerId: z.string(),
  nickname: z.string(),
  department: z.string(),
  campus: CampusSchema,
  role: RoleSchema,
  showFree: z.boolean(),
  tone: z.number().int(),
  leaves: z.number().int(),
  timetable: z.array(ClassBlockSchema),
  createdAt: z.number().int(),
});

export type Profile = z.infer<typeof ProfileSchema>;

/** 다른 학생에게 공개되는 정보. 신원(managerId)과 은행잎은 빼고 보낸다. */
export const PeerSchema = ProfileSchema.omit({
  managerId: true,
  channelId: true,
  leaves: true,
  createdAt: true,
});

export type Peer = z.infer<typeof PeerSchema>;

// ---- 공강 마켓 ----

export const TaskCategorySchema = z.enum(["errand", "queue", "study", "etc"]);
export const TaskStatusSchema = z.enum([
  "open",
  "assigned",
  "reported",
  "completed",
  "cancelled",
]);

export const TaskDraftSchema = z.object({
  title: z.string().trim().min(1).max(60),
  detail: z.string().trim().max(300).default(""),
  place: z.string().trim().max(40).default(""),
  /** 마감 시각. epoch 밀리초 */
  deadline: z.number().int().positive(),
  /** 예상 소요 분 */
  duration: z.number().int().min(5).max(480),
  reward: z.number().int().min(1).max(10_000),
  category: TaskCategorySchema,
});

export type TaskDraft = z.infer<typeof TaskDraftSchema>;

export const TaskSchema = TaskDraftSchema.extend({
  id: z.string(),
  channelId: z.string(),
  requesterId: z.string(),
  workerId: z.string().nullable(),
  status: TaskStatusSchema,
  createdAt: z.number().int(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskIdInputSchema = z.object({ taskId: z.string().min(1) });

/** 은행잎 원장. 추가만 하고 고치지 않는다. */
export const LedgerEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  delta: z.number().int(),
  label: z.string(),
  at: z.number().int(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
