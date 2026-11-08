/** Shapes returned by the Laravel API (routes/spa.php). Dates are ISO 8601. */

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
  categories: string[];
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

export interface ProjectSummary {
  id: number;
  title: string;
  client_name: string | null;
  category: string | null;
  shoot_date: string | null;
  status: Status;
  photos_count: number;
  cached_photos_count: number;
  last_synced_at: string | null;
  cover_url: string | null;
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
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  whatsapp_url: string | null;
  shoot_date: string | null;
  category: string | null;
  status: Status;
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
  requires_payment: boolean;
  paid_at: string | null;
  selection_submitted_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  last_viewed_at: string | null;
  counts: { photos: number; selections: number; finals: number };
  current_stage: TimelineEntry | null;
}

export interface OwnerPhoto {
  id: number;
  filename: string;
  is_selected: boolean;
  is_cover: boolean;
  comments_count: number;
  thumbnail_url: string | null;
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
  requires_payment: boolean;
  selection_submitted_at: string | null;
  is_selection_locked: boolean;
  is_delivery_locked: boolean;
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
  locked: boolean;
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
}

export interface OverviewProject extends ProjectRef {
  category: string | null;
  shoot_date: string | null;
  photos_count: number;
  selections_count: number;
  finals_count: number;
  max_selectable_photos: number | null;
  selection_submitted_at: string | null;
  requires_payment: boolean;
  paid_at: string | null;
  share_expired: boolean;
  stage: TimelineEntry | null;
  updated_at: string;
}
