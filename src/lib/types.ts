/** Shapes returned by the Laravel API (routes/spa.php). Dates are ISO 8601. */

import type { AnswerSnapshot, Answers, BookingFile } from "@/features/booking-form/schema";

export type ProjectStatusValue = "draft" | "selection" | "editing" | "completed" | "expired";
export type StageValue = "selection" | "editing" | "delivery" | "download";
export type DeliverySizeValue = "original" | "large" | "web";
export type StepState = "done" | "current" | "upcoming";

export interface Status {
  value: ProjectStatusValue;
  label: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  brand_name: string | null;
  email_verified_at: string | null;
  must_verify_email: boolean;
}

export interface Paginated {
  current_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface Options {
  app_name: string;
  categories: { id: number; name: string }[];
  steps: Record<string, string>;
  statuses: Status[];
  stages: { value: StageValue; label: string; description: string; default_days: number }[];
  timeline_presets: number[];
  timeline_max_days: number;
  delivery_sizes: DeliverySize[];
  service_account_email: string | null;
}

export interface DeliverySize {
  value: DeliverySizeValue;
  label: string;
  description: string;
  max_dimension: number | null;
}

// --- Clients & categories --------------------------------------------------

/** The client a project belongs to, as embedded in project payloads. */
export interface ClientRef {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  whatsapp_url: string | null;
  projects_count: number;
  /** Y-m-d */
  last_shoot_date: string | null;
  created_at: string;
}

/** A row of `GET /clients/all`, for pickers. */
export type ClientOption = ClientRef;

export interface ClientList {
  data: Client[];
  meta: Paginated & { per_page: number };
}

export interface ClientShow {
  client: Client;
  projects: ProjectSummary[];
}

export interface Category {
  id: number;
  name: string;
  projects_count: number;
  /** Down payment asked on this category's booking form, 0–100. */
  deposit_percent: number;
  /** Questions on its booking form (sections not counted). */
  fields_count: number;
}

// --- Projects ---------------------------------------------------------------

export interface ProjectSummary {
  id: number;
  title: string;
  client: ClientRef | null;
  client_name: string | null;
  category_id: number | null;
  category: string | null;
  shoot_date: string | null;
  /** "HH:MM" */
  shoot_time: string | null;
  location: string | null;
  is_paid: boolean;
  /** Share received so far, 0–100; anything between is a down payment. */
  paid_percent: number;
  /** False for a booking whose Drive folder isn't connected yet. */
  has_photos_folder: boolean;
  status: Status;
  photos_count: number;
  cached_photos_count: number;
  last_synced_at: string | null;
  cover_url: string | null;
  /** The client's gallery link. */
  share_url: string;
}

export interface ProjectList {
  data: ProjectSummary[];
  meta: Paginated & { per_page: number };
  status_counts: Record<ProjectStatusValue, number>;
  total_count: number;
  is_syncing: boolean;
}

export interface TimelineEntry {
  stage: StageValue;
  label: string;
  description: string;
  days: number;
  state: StepState;
  starts_at: string;
  due_at: string;
  ends_at: string;
  completed_at: string | null;
  is_overdue: boolean;
  days_left: number;
}

export interface ProjectDetail {
  id: number;
  title: string;
  client: ClientRef | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  whatsapp_url: string | null;
  shoot_date: string | null;
  /** "HH:MM" */
  shoot_time: string | null;
  location: string | null;
  notes: string | null;
  category_id: number | null;
  category: string | null;
  status: Status;
  has_photos_folder: boolean;
  can_move_to_editing: boolean;
  drive_folder_link: string | null;
  delivery_folder_id: string | null;
  delivery_folder_link: string | null;
  cover_photo_id: number | null;
  share_url: string;
  has_password: boolean;
  share_expires_at: string | null;
  share_expired: boolean;
  max_selectable_photos: number | null;
  allow_comments: boolean;
  allow_download: boolean;
  is_paid: boolean;
  /** Share received so far, 0–100; anything between is a down payment. */
  paid_percent: number;
  paid_at: string | null;
  selection_submitted_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  last_viewed_at: string | null;
  counts: { photos: number; selections: number; finals: number };
  current_stage: TimelineEntry | null;
  /** The booking request this project was created from, if any. */
  booking_request?: { id: number } | null;
}

export interface PhotoDetails {
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  owner: string | null;
  modified_at: string | null;
  created_at: string | null;
}

export interface OwnerPhoto {
  id: number;
  filename: string;
  is_selected: boolean;
  is_cover: boolean;
  comments_count: number;
  thumbnail_url: string | null;
  details?: PhotoDetails;
}

export interface PhotoTab {
  data: OwnerPhoto[];
  meta: Paginated;
  filter: "all" | "selected" | "commented";
  counts: { all: number; selected: number; commented: number };
  pending: number;
  syncing: boolean;
  should_poll: boolean;
  last_synced_at: string | null;
}

export interface Comment {
  id: number;
  author_type: "client" | "photographer";
  is_client: boolean;
  body: string;
  created_at: string;
}

export interface PhotoRef {
  id: number;
  filename: string;
  thumbnail_url: string | null;
}

export interface SelectionsTab {
  selections: { id: number; selected_at: string | null; photo: PhotoRef; comments: Comment[] }[];
  other_comments: { photo: PhotoRef; comments: Comment[] }[];
  comment_count: number;
}

export interface DeliveryExport {
  id: number;
  size: DeliverySizeValue;
  size_label: string;
  status: "pending" | "processing" | "ready" | "failed";
  in_progress: boolean;
  is_usable: boolean;
  total: number;
  processed: number;
  progress_percent: number;
  file_size: number | null;
  notify_email: string | null;
  error: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface DeliveryTab {
  preview: PhotoRef[];
  total: number;
  pending: number;
  syncing: boolean;
  exports: DeliveryExport[];
  can_complete: boolean;
}

export interface TimelineTab {
  entries: TimelineEntry[];
  durations: Record<StageValue, number>;
  open_stages: StageValue[];
}

export interface FolderPreview {
  folder_id: string;
  name: string;
  photo_count: number;
  link: string;
  preview: { drive_file_id: string; filename: string; url: string }[];
}

export interface FeedItem {
  id: number;
  event: string;
  count: number;
  at: string;
  client_name: string;
  meta: Record<string, unknown>;
  tab: string | null;
  project: { id: number; title: string };
  photos: { id: number; filename: string; thumbnail_url: string }[];
}

export interface ActivityFeed {
  days: { date: string; items: FeedItem[] }[];
  has_more: boolean;
  has_projects: boolean;
  limit: number;
  page_size: number;
  today: string;
}

/** One page of the client or "you & system" feed (`/dashboard?scope=…&page=…`). */
export interface ActivityPage {
  days: { date: string; items: FeedItem[] }[];
  has_more: boolean;
  has_projects: boolean;
  scope: "clients" | "you";
  page: number;
  per_page: number;
  today: string;
}

// --- Client gallery -------------------------------------------------------

export interface ProgressStep {
  title: string;
  description: string;
  state: StepState;
  at: string | null;
  due: string | null;
}

export interface GalleryLocked {
  title: string;
  brand_name: string;
  unlocked: false;
}

export interface GalleryInfo {
  title: string;
  brand_name: string;
  unlocked: true;
  client_name: string | null;
  client_email: string | null;
  status: Status;
  is_delivery: boolean;
  max_selectable_photos: number | null;
  allow_comments: boolean;
  allow_download: boolean;
  selection_submitted_at: string | null;
  is_selection_locked: boolean;
  /** Legacy payment lock; payment no longer gates the gallery, so it may be absent. */
  is_delivery_locked?: boolean;
  can_download: boolean;
  total_count: number;
  selected_count: number;
  progress: ProgressStep[];
  comment_max_length: number;
}

export type Gallery = GalleryLocked | GalleryInfo;

export interface GalleryDenied {
  reason: "expired" | "no_link" | "invalid_link" | "locked";
  heading: string;
  message: string;
  brand_name: string | null;
}

export interface GalleryPhoto {
  id: number;
  filename: string;
  is_selected: boolean;
  comments_count: number;
  grid_url: string | null;
}

export interface GalleryPhotoPage {
  data: GalleryPhoto[];
  has_more: boolean;
  next_offset: number;
  scoped_count: number;
}

export interface GalleryPhotoDetail extends GalleryPhoto {
  full_url: string | null;
  comments: Comment[];
  position: number;
  scoped_count: number;
  previous_id: number | null;
  next_id: number | null;
}

export interface GalleryReview {
  selected: GalleryPhoto[];
  max: number | null;
  over_limit: boolean;
  locked: boolean;
  submitted: boolean;
}

export interface GallerySubmitted {
  submitted: boolean;
  submitted_at: string | null;
  count: number;
  preview: GalleryPhoto[];
  progress: ProgressStep[];
}

export interface GalleryDelivery {
  size: DeliverySizeValue;
  finals: { id: number; filename: string; grid_url: string; full_url: string; download_url: string | null }[];
  total_finals: number;
  /** Legacy payment lock; may be absent. */
  locked?: boolean;
  can_download: boolean;
  export: DeliveryExport | null;
  export_download_url: string | null;
  progress: ProgressStep[];
}

// --- Studio overview ------------------------------------------------------

export interface ProjectRef {
  id: number;
  title: string;
  client_name: string | null;
  status: Status;
  cover_url: string | null;
}

export interface Overview {
  today: string;
  kpis: {
    active: number;
    awaiting_selection: number;
    to_review: number;
    editing: number;
    delivered_30d: number;
    overdue: number;
    unpaid: number;
    photos: number;
    selections: number;
    projects: number;
  };
  pipeline: (Status & { count: number })[];
  attention: {
    kind: "review" | "overdue" | "unpaid" | "expired_link" | "empty";
    priority: number;
    label: string;
    tab: string;
    at: string | null;
    project: ProjectRef;
  }[];
  deadlines: (TimelineEntry & { project: ProjectRef })[];
  recent_projects: (ProjectRef & {
    shoot_date: string | null;
    photos_count: number;
    selections_count: number;
    finals_count: number;
    max_selectable_photos: number | null;
    stage: string | null;
    updated_at: string;
  })[];
  projects: OverviewProject[];
  engagement: {
    days: { date: string; opened: number; favorited: number; commented: number; submitted: number }[];
    totals: { opened: number; favorited: number; commented: number; submitted: number };
  };
  /** Up to 5 pending requests, soonest shoot first. */
  booking_requests: { pending: number; items: BookingRequest[] };
}

export interface OverviewProject extends ProjectRef {
  client?: ClientRef | null;
  category_id?: number | null;
  category: string | null;
  shoot_date: string | null;
  shoot_time?: string | null;
  location?: string | null;
  has_photos_folder?: boolean;
  photos_count: number;
  selections_count: number;
  finals_count: number;
  max_selectable_photos: number | null;
  selection_submitted_at: string | null;
  is_paid: boolean;
  /** Share received so far, 0–100; anything between is a down payment. */
  paid_percent: number;
  paid_at: string | null;
  share_expired: boolean;
  stage: TimelineEntry | null;
  updated_at: string;
}

// --- Booking requests -------------------------------------------------------

export type BookingRequestStatus = "pending" | "accepted" | "declined";

/** A request from the public booking form, as the photographer sees it (`GET /booking-requests`). */
export interface BookingRequest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  category_id: number | null;
  category: string | null;
  /** Y-m-d */
  shoot_date: string;
  /** "HH:MM" */
  shoot_time: string | null;
  location: string;
  notes: string | null;
  status: BookingRequestStatus;
  status_label: "Waiting for approval" | "Approved" | "Declined";
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  /** An existing client whose email matches, if any. */
  client: { id: number; name: string } | null;
  /** Set once accepted. */
  project: { id: number; title: string } | null;
  reviewed_at: string | null;
  /** Raw answers to the category's custom questions. */
  answers?: Answers;
  /** The answers as shown, frozen at submit time. */
  answer_snapshot?: AnswerSnapshot[];
  /** Uploads; urls need the photographer's session. */
  files?: BookingFile[];
  /** The first file of the form's payment-proof question. */
  payment_proof?: BookingFile | null;
  /** The category's down payment, null without a category. */
  deposit_percent?: number | null;
  /** Overview items carry this flag (the list sends `payment_proof`). */
  has_payment_proof?: boolean;
}

export interface BookingRequestList {
  data: BookingRequest[];
  meta: Paginated & { per_page: number };
  counts: Record<BookingRequestStatus, number>;
}

export interface BookingLink {
  /** The public form's absolute URL, /book/{token}. */
  url: string;
  token: string;
}

// --- Schedule ---------------------------------------------------------------

/** A pending booking request on the calendar (`GET /schedule` → requests). */
export interface ScheduleRequest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  /** Y-m-d */
  date: string;
  /** HH:MM */
  time: string | null;
  location: string;
  category: string | null;
  notes: string | null;
  created_at: string;
  /** A down-payment proof was uploaded. */
  has_payment_proof?: boolean;
}

export interface ScheduleEvent {
  /** The project id. */
  id: number;
  title: string;
  /** Y-m-d */
  date: string;
  /** HH:MM */
  time: string | null;
  location: string | null;
  notes: string | null;
  client: { id: number; name: string; phone: string | null } | null;
  category: string | null;
  status: { value: ProjectStatusValue; label: string };
  is_paid: boolean;
  /** Share received so far, 0–100; anything between is a down payment. */
  paid_percent: number;
  has_photos_folder: boolean;
  cover_url: string | null;
}

export interface Schedule {
  from: string;
  to: string;
  today: string;
  /** Ordered by date, time (nulls last), title. */
  events: ScheduleEvent[];
  /** Pending booking requests in range, ordered by date, time (nulls last), name. */
  requests: ScheduleRequest[];
}

export interface ScheduleBoard {
  columns: {
    key: "booked" | "selection" | "editing" | "completed";
    label: string;
    count: number;
    items: ScheduleEvent[];
  }[];
}
