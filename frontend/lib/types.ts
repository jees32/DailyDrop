export interface Location {
  lat: number;
  lng: number;
}

export interface Store {
  id: string;
  merchant_id: string;
  store_name: string;
  town: string | null;
  location: Location;
  is_active: boolean;
  created_at: string;
  distance_km: number;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: string;
  stock_count: number;
  category: string;
  image_url: string;
  created_at: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  stock_count: number;
  category: ProductCategory;
  description?: string;
  image_url?: string;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  stock_count?: number;
  category?: ProductCategory;
  description?: string;
  image_url?: string;
}

export interface ProductSearchHit extends Product {
  store_name: string;
  store_town: string | null;
  store_is_active: boolean;
  distance_km: number;
}

export interface ProductSearchResponse {
  items: ProductSearchHit[];
  total: number;
  limit: number;
  offset: number;
  query: string;
}

export type ProductCategory =
  | "Grocery"
  | "Vegetables"
  | "Fruits"
  | "Fish"
  | "Meat"
  | "Other Household Items"
  | "Pharmacy & Wellness";

export interface CategoryItem {
  id: ProductCategory | "all";
  name: string;
  image: string;
}

export interface CategoryStoreAvailability {
  id: string;
  store_name: string;
  town: string | null;
  distance_km: number;
  is_active: boolean;
  product_count: number;
}

export interface UserProfile {
  id: string;
  email: string | null;
  phone_number: string | null;
  full_name: string | null;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  address_count: number;
  has_default_address: boolean;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string | null;
  contact_phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  pincode: string | null;
  location: {
    lat: number;
    lng: number;
  };
  is_default: boolean;
  created_at: string;
}

export interface AddressInput {
  label?: string;
  recipient_name?: string | null;
  contact_phone?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  pincode?: string | null;
  location: {
    lat: number;
    lng: number;
  };
  is_default?: boolean;
}

export type PaymentMethod = "mock_card" | "mock_upi" | "mock_cod";

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Order {
  id: string;
  store_id: string;
  store_name: string | null;
  status: string;
  subtotal: string | null;
  tax_amount: string | null;
  delivery_fee: string | null;
  total_amount: string;
  payment_method: string | null;
  payment_status: string;
  delivery_address: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderSummary {
  id: string;
  store_id: string;
  store_name: string | null;
  status: string;
  total_amount: string;
  payment_method: string | null;
  item_count: number;
  created_at: string;
}

export interface CreateOrderInput {
  store_id: string;
  items: { product_id: string; quantity: number }[];
  payment_method: PaymentMethod;
  card?: {
    card_number: string;
    card_name?: string;
    expiry?: string;
  };
  upi?: {
    upi_id: string;
  };
  address_id?: string;
}

export interface AdminStats {
  total_orders: number;
  active_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_users: number;
  total_stores: number;
}

export interface AdminListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  query: string;
}

export interface AdminOrderSummary {
  id: string;
  store_id: string;
  store_name: string | null;
  consumer_id: string;
  consumer_email: string | null;
  consumer_name: string | null;
  status: string;
  total_amount: string;
  payment_method: string | null;
  item_count: number;
  created_at: string;
}

export interface AdminOrderListResponse extends AdminListResponse<AdminOrderSummary> {
  filter: string;
}

export interface AdminStoreSummary {
  id: string;
  store_name: string;
  town: string | null;
  is_active: boolean;
  merchant_id: string;
  merchant_email: string | null;
  merchant_name: string | null;
  product_count: number;
  created_at: string;
}

export type AdminStoreListResponse = AdminListResponse<AdminStoreSummary>;

export interface AdminUserSummary {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  store_count: number;
  created_at: string;
}

export interface AdminUserListResponse extends AdminListResponse<AdminUserSummary> {
  role: string | null;
}

export interface AdminCreateStoreInput {
  store_name: string;
  town_id: string;
  merchant_id: string;
  is_active?: boolean;
}

export interface AdminUpdateStoreInput {
  store_name?: string;
  town_id?: string;
  merchant_id?: string;
  is_active?: boolean;
}

export interface AdminUpdateUserInput {
  role?: string;
  is_active?: boolean;
}

export interface MerchantStore {
  id: string;
  store_name: string;
  town: string | null;
  is_active: boolean;
}

export interface MerchantOrderSummary {
  id: string;
  store_id: string;
  store_name: string | null;
  consumer_id: string;
  consumer_email: string | null;
  consumer_name: string | null;
  status: string;
  total_amount: string;
  payment_method: string | null;
  item_count: number;
  delivery_address: string;
  created_at: string;
}

export interface DeliveryOrderSummary {
  id: string;
  store_id: string;
  store_name: string | null;
  consumer_id: string;
  consumer_email: string | null;
  consumer_name: string | null;
  status: string;
  total_amount: string;
  payment_method: string | null;
  item_count: number;
  delivery_address: string;
  delivery_partner_id: string | null;
  created_at: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  model: string;
}

export interface ChatHistoryResponse {
  messages: ChatTurn[];
}
