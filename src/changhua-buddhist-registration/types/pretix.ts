// Pretix API 相關型別定義

export interface PretixEvent {
  slug: string;
  name: {
    [locale: string]: string;
  };
  live: boolean;
  testmode: boolean;
  currency: string;
  date_from: string | null;
  date_to: string | null;
  date_admission: string | null;
  is_public: boolean;
  presale_start: string | null;
  presale_end: string | null;
  location: {
    [locale: string]: string;
  } | null;
  geo_lat: number | null;
  geo_lon: number | null;
  plugins: string[];
  has_subevents: boolean;
  meta_data: Record<string, any>;
  seating_plan: number | null;
  seat_category_mapping: Record<string, any>;
}

export interface PretixItem {
  id: number;
  name: {
    [locale: string]: string;
  };
  internal_name: string | null;
  default_price: string;
  category: number | null;
  active: boolean;
  description: {
    [locale: string]: string;
  } | null;
  free_price: boolean;
  tax_rule: number | null;
  admission: boolean;
  position: number;
  picture: string | null;
  available_from: string | null;
  available_until: string | null;
  require_voucher: boolean;
  hide_without_voucher: boolean;
  allow_cancel: boolean;
  min_per_order: number | null;
  max_per_order: number | null;
  checkin_attention: boolean;
  has_variations: boolean;
  variations: PretixItemVariation[];
  addons: PretixItemAddon[];
  bundles: PretixItemBundle[];
  meta_data: Record<string, any>;
  sales_channels: string[];
  issue_giftcard: boolean;
}

export interface PretixItemVariation {
  id: number;
  value: {
    [locale: string]: string;
  };
  active: boolean;
  description: {
    [locale: string]: string;
  } | null;
  position: number;
  default_price: string | null;
  price: string;
  original_price: string | null;
  available_from: string | null;
  available_until: string | null;
  hide_without_voucher: boolean;
  checkin_attention: boolean;
  require_approval: boolean;
  sales_channels: string[];
  meta_data: Record<string, any>;
}

export interface PretixItemAddon {
  addon_category: number;
  min_count: number;
  max_count: number;
  position: number;
  multi_allowed: boolean;
  price_included: boolean;
}

export interface PretixItemBundle {
  bundled_item: number;
  bundled_variation: number | null;
  count: number;
  designated_price: string;
}

export interface PretixQuota {
  id: number;
  name: string;
  size: number | null;
  items: number[];
  variations: number[];
  subevent: number | null;
  close_when_sold_out: boolean;
  closed: boolean;
  available: boolean;
  available_number: number | null;
  total_size: number | null;
  pending_orders: number;
  blocked: number;
  reserved: number;
  cart_positions: number;
  waiting_list: number;
}

export interface PretixOrder {
  code: string;
  status: 'n' | 'p' | 'e' | 'c' | 'r'; // new, pending, expired, cancelled, refunded
  testmode: boolean;
  secret: string;
  email: string | null;
  phone: string | null;
  locale: string;
  datetime: string;
  expires: string | null;
  last_modified: string;
  total: string;
  comment: string;
  checkin_attention: boolean;
  require_approval: boolean;
  sales_channel: string;
  positions: PretixOrderPosition[];
  fees: PretixOrderFee[];
  payments: PretixPayment[];
  refunds: PretixRefund[];
  invoice_address: PretixInvoiceAddress;
  meta_data: Record<string, any>;
  valid_if_pending: boolean;
}

export interface PretixOrderPosition {
  id: number;
  order: string;
  positionid: number;
  item: number;
  variation: number | null;
  price: string;
  attendee_name: string | null;
  attendee_name_parts: Record<string, string>;
  attendee_email: string | null;
  company: string | null;
  street: string | null;
  zipcode: string | null;
  city: string | null;
  country: string | null;
  state: string | null;
  voucher: number | null;
  tax_rate: string;
  tax_value: string;
  secret: string;
  addon_to: number | null;
  subevent: number | null;
  checkins: PretixCheckin[];
  answers: PretixQuestionAnswer[];
  downloads: PretixTicketDownload[];
  seat: PretixSeat | null;
  blocked: string[] | null;
  valid_from: string | null;
  valid_until: string | null;
  meta_data: Record<string, any>;
}

export interface PretixOrderFee {
  fee_type: string;
  value: string;
  description: string;
  internal_type: string;
  tax_rate: string;
  tax_value: string;
}

export interface PretixPayment {
  local_id: number;
  state: string;
  amount: string;
  created: string;
  payment_date: string | null;
  provider: string;
  payment_url: string | null;
  details: Record<string, any>;
}

export interface PretixRefund {
  local_id: number;
  state: string;
  source: string;
  amount: string;
  payment: number;
  created: string;
  execution_date: string | null;
  provider: string;
  info: Record<string, any>;
}

export interface PretixInvoiceAddress {
  is_business: boolean;
  company: string;
  name: string;
  name_parts: Record<string, string>;
  street: string;
  zipcode: string;
  city: string;
  country: string;
  state: string;
  vat_id: string;
  vat_id_validated: boolean;
  internal_reference: string;
}

export interface PretixCheckin {
  id: number;
  list: number;
  datetime: string;
  type: string;
  gate: string | null;
  device: number | null;
  auto_checked_in: boolean;
}

export interface PretixQuestionAnswer {
  question: number;
  answer: string;
  question_identifier: string;
  options: number[];
  option_identifiers: string[];
}

export interface PretixTicketDownload {
  output: string;
  url: string;
}

export interface PretixSeat {
  id: string;
  name: string;
  zone_name: string;
  row_name: string;
  seat_number: string;
  seat_guid: string;
}

// 建立訂單的請求資料結構
export interface PretixOrderRequest {
  email?: string;
  phone?: string;
  locale?: string;
  sales_channel?: string;
  positions: PretixOrderPositionRequest[];
  fees?: PretixOrderFeeRequest[];
  payment_provider?: string;
  invoice_address?: Partial<PretixInvoiceAddress>;
  meta_data?: Record<string, any>;
  comment?: string;
  testmode?: boolean;
}

export interface PretixOrderPositionRequest {
  item: number;
  variation?: number | null;
  price?: string;
  attendee_name?: string;
  attendee_name_parts?: Record<string, string>;
  attendee_email?: string;
  company?: string;
  street?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  state?: string;
  answers?: PretixQuestionAnswerRequest[];
  addon_to?: number | null;
  subevent?: number | null;
  seat?: string | null;
  meta_data?: Record<string, any>;
}

export interface PretixOrderFeeRequest {
  fee_type: string;
  value: string;
  description?: string;
}

export interface PretixQuestionAnswerRequest {
  question: number;
  answer: string;
  options?: number[];
}

// 錯誤回應結構
export interface PretixErrorResponse {
  detail?: string;
  non_field_errors?: string[];
  [field: string]: any;
}

// API 回應的通用結構
export interface PretixListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 活動統計資訊
export interface PretixEventStats {
  orders_count: number;
  paid_orders_count: number;
  pending_orders_count: number;
  total_revenue: string;
  positions_count: number;
  checkins_count: number;
}

// 配額可用性資訊
export interface PretixQuotaAvailability {
  available: boolean;
  available_number: number | null;
  total_size: number | null;
  pending_orders: number;
  blocked: number;
  reserved: number;
  cart_positions: number;
  waiting_list: number;
}

// 本地化的活動資料結構（用於前端顯示）
export interface LocalizedEvent {
  slug: string;
  name: string;
  description?: string;
  location?: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  dateAdmission: Date | null;
  presaleStart: Date | null;
  presaleEnd: Date | null;
  isLive: boolean;
  isPublic: boolean;
  currency: string;
  items: LocalizedItem[];
  quotas: PretixQuota[];
  availableSeats?: number;
  totalSeats?: number;
}

export interface LocalizedItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  isActive: boolean;
  isAvailable: boolean;
  maxPerOrder?: number;
  minPerOrder?: number;
  variations: LocalizedItemVariation[];
}

export interface LocalizedItemVariation {
  id: number;
  name: string;
  description?: string;
  price: number;
  isActive: boolean;
  isAvailable: boolean;
}

// 報名相關的資料結構
export interface RegistrationData {
  eventSlug: string;
  identity: 'monk' | 'volunteer';
  personalInfo: {
    name: string;
    phone: string;
    email?: string;
    emergencyContact?: string; // 志工專用
    templeName?: string;       // 法師專用
    specialRequirements?: string;
  };
  transport?: {
    required: boolean;
    locationId?: string;
    pickupTime?: string;
  };
  lineUserId: string;
  metadata?: Record<string, any>;
}

// Pretix 訂單建立的輔助函數用到的型別
export interface OrderCreationResult {
  success: boolean;
  order?: PretixOrder;
  error?: string;
  errorCode?: string;
}

export interface EventAvailabilityInfo {
  eventSlug: string;
  isAvailable: boolean;
  availableItems: {
    itemId: number;
    name: string;
    available: boolean;
    availableCount?: number;
  }[];
  message?: string;
}