import type {
  AddressInput,
  AdminCreateStoreInput,
  AdminOrderListResponse,
  AdminOrderSummary,
  AdminStats,
  AdminStoreListResponse,
  AdminStoreSummary,
  AdminUpdateStoreInput,
  AdminUpdateUserInput,
  AdminUserListResponse,
  AdminUserSummary,
  ChatHistoryResponse,
  ChatResponse,
  ChatTurn,
  CategoryStoreAvailability,
  CreateOrderInput,
  CreateProductInput,
  UpdateProductInput,
  DeliveryOrderSummary,
  MerchantOrderSummary,
  MerchantStore,
  Order,
  OrderSummary,
  Product,
  ProductCategory,
  ProductSearchResponse,
  Store,
  UserAddress,
  UserProfile,
} from "@/lib/types";
import type { UserCoordinates } from "@/lib/location";
import { getApiBaseUrl } from "@/lib/api-url";

function authHeaders(accessToken?: string): HeadersInit {
  if (!accessToken) {
    return {};
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function withUserCoords(path: string, coords?: UserCoordinates): string {
  const url = new URL(path, getApiBaseUrl());
  
  if (coords) {
    url.searchParams.set("user_lat", coords.lat.toString());
    url.searchParams.set("user_lng", coords.lng.toString());
  }
  return url.toString();
}

export async function fetchStores(coords?: UserCoordinates): Promise<Store[]> {
  const response = await fetch(withUserCoords("/api/v1/stores", coords), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stores (${response.status})`);
  }

  return response.json();
}

export async function fetchStore(
  storeId: string,
  coords?: UserCoordinates,
): Promise<Store> {
  const response = await fetch(
    withUserCoords(`/api/v1/stores/${storeId}`, coords),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch store (${response.status})`);
  }

  return response.json();
}

export async function fetchStoreProducts(storeId: string): Promise<Product[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/stores/${storeId}/products`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch products (${response.status})`);
  }

  return response.json();
}

export async function searchProducts(
  query: string,
  coords?: UserCoordinates,
  options?: { limit?: number; offset?: number; signal?: AbortSignal },
): Promise<ProductSearchResponse> {
  const url = new URL("/api/v1/products/search", getApiBaseUrl());
  url.searchParams.set("q", query.trim());
  if (coords) {
    url.searchParams.set("user_lat", coords.lat.toString());
    url.searchParams.set("user_lng", coords.lng.toString());
  }
  if (options?.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  if (options?.offset !== undefined) {
    url.searchParams.set("offset", String(options.offset));
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to search products (${response.status})`);
  }

  return response.json();
}

export async function fetchStoresForCategory(
  category: ProductCategory,
  coords?: UserCoordinates,
): Promise<CategoryStoreAvailability[]> {
  const response = await fetch(
    withUserCoords(
      `/api/v1/categories/${encodeURIComponent(category)}/stores`,
      coords,
    ),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch stores for category (${response.status})`);
  }

  return response.json();
}

export async function syncUserProfile(
  accessToken: string,
): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(accessToken),
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to sync profile (${response.status})`);
  }

  return response.json();
}

/** Load profile after sign-in; POST sync first, GET fallback if sync fails transiently. */
export async function loadUserProfile(
  accessToken: string,
): Promise<UserProfile> {
  try {
    return await syncUserProfile(accessToken);
  } catch {
    return fetchUserProfile(accessToken);
  }
}

export async function fetchUserProfile(
  accessToken: string,
): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile (${response.status})`);
  }

  return response.json();
}

export async function updateUserProfile(
  accessToken: string,
  payload: { full_name: string },
): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to update profile (${response.status})`);
  }

  return response.json();
}

export async function fetchAddresses(
  accessToken: string,
): Promise<UserAddress[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/addresses`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch addresses (${response.status})`);
  }

  return response.json();
}

export async function createAddress(
  accessToken: string,
  payload: AddressInput,
): Promise<UserAddress> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to create address (${response.status})`);
  }

  return response.json();
}
export async function updateAddress(
  accessToken: string,
  addressId: string,
  payload: Partial<AddressInput>,
): Promise<UserAddress> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/addresses/${addressId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(accessToken),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to update address (${response.status})`);
  }

  return response.json();
}
export async function deleteAddress(
  accessToken: string,
  addressId: string,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/addresses/${addressId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete address (${response.status})`);
  }
}

export async function authFetch(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...authHeaders(accessToken),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function createOrder(
  accessToken: string,
  payload: CreateOrderInput,
): Promise<Order> {
  const response = await authFetch("/api/v1/orders", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string | { msg?: string }[] }
      | null;
    const detail = body?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail[0]?.msg ?? `Failed to place order (${response.status})`
          : `Failed to place order (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

export async function fetchOrders(
  accessToken: string,
): Promise<OrderSummary[]> {
  const response = await authFetch("/api/v1/orders", accessToken);

  if (!response.ok) {
    throw new Error(`Failed to fetch orders (${response.status})`);
  }

  return response.json();
}

export async function fetchOrder(
  accessToken: string,
  orderId: string,
): Promise<Order> {
  const response = await authFetch(`/api/v1/orders/${orderId}`, accessToken);

  if (!response.ok) {
    throw new Error(`Failed to fetch order (${response.status})`);
  }

  return response.json();
}

export async function cancelOrder(
  accessToken: string,
  orderId: string,
): Promise<Order> {
  const response = await authFetch(
    `/api/v1/orders/${orderId}/cancel`,
    accessToken,
    { method: "POST" },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(body?.detail ?? `Failed to cancel order (${response.status})`);
  }

  return response.json();
}

async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { detail?: string }
    | null;
  return body?.detail ?? `${fallback} (${response.status})`;
}

export async function fetchAdminStats(accessToken: string): Promise<AdminStats> {
  const response = await authFetch("/api/v1/admin/stats", accessToken);

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch admin stats"));
  }

  return response.json();
}

export function buildAdminListPath(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export async function fetchAdminOrders(
  accessToken: string,
  options?: {
    q?: string;
    filter?: string;
    limit?: number;
    offset?: number;
  },
): Promise<AdminOrderListResponse> {
  const response = await authFetch(
    buildAdminListPath("/api/v1/admin/orders", {
      q: options?.q,
      filter: options?.filter,
      limit: options?.limit,
      offset: options?.offset,
    }),
    accessToken,
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch admin orders"));
  }

  return response.json();
}

export async function fetchAdminStores(
  accessToken: string,
  options?: {
    q?: string;
    limit?: number;
    offset?: number;
  },
): Promise<AdminStoreListResponse> {
  const response = await authFetch(
    buildAdminListPath("/api/v1/admin/stores", {
      q: options?.q,
      limit: options?.limit,
      offset: options?.offset,
    }),
    accessToken,
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch admin stores"));
  }

  return response.json();
}

export async function fetchAdminUsers(
  accessToken: string,
  options?: {
    q?: string;
    role?: string;
    limit?: number;
    offset?: number;
  },
): Promise<AdminUserListResponse> {
  const response = await authFetch(
    buildAdminListPath("/api/v1/admin/users", {
      q: options?.q,
      role: options?.role,
      limit: options?.limit,
      offset: options?.offset,
    }),
    accessToken,
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch admin users"));
  }

  return response.json();
}

export async function createAdminStore(
  accessToken: string,
  payload: AdminCreateStoreInput,
): Promise<AdminStoreSummary> {
  const response = await authFetch("/api/v1/admin/stores", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create store"));
  }

  return response.json();
}

export async function updateAdminStore(
  accessToken: string,
  storeId: string,
  payload: AdminUpdateStoreInput,
): Promise<AdminStoreSummary> {
  const response = await authFetch(
    `/api/v1/admin/stores/${storeId}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update store"));
  }

  return response.json();
}

export async function updateAdminUser(
  accessToken: string,
  userId: string,
  payload: AdminUpdateUserInput,
): Promise<AdminUserSummary> {
  const response = await authFetch(
    `/api/v1/admin/users/${userId}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update user"));
  }

  return response.json();
}

export async function fetchMerchantStores(
  accessToken: string,
): Promise<MerchantStore[]> {
  const response = await authFetch("/api/v1/merchant/stores", accessToken);

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch merchant stores"));
  }

  return response.json();
}

export async function fetchMerchantOrders(
  accessToken: string,
): Promise<MerchantOrderSummary[]> {
  const response = await authFetch("/api/v1/merchant/orders", accessToken);

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to fetch merchant orders"));
  }

  return response.json();
}

export async function updateMerchantOrderStatus(
  accessToken: string,
  orderId: string,
  status: string,
): Promise<Order> {
  const response = await authFetch(
    `/api/v1/merchant/orders/${orderId}/status`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseApiError(response, "Failed to update order status"),
    );
  }

  return response.json();
}

export async function fetchMerchantStoreProducts(
  accessToken: string,
  storeId: string,
): Promise<Product[]> {
  const response = await authFetch(
    `/api/v1/merchant/stores/${storeId}/products`,
    accessToken,
  );

  if (!response.ok) {
    throw new Error(
      await parseApiError(response, "Failed to fetch store products"),
    );
  }

  return response.json();
}

export async function createMerchantProduct(
  accessToken: string,
  storeId: string,
  payload: CreateProductInput,
): Promise<Product> {
  const response = await authFetch(
    `/api/v1/merchant/stores/${storeId}/products`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create product"));
  }

  return response.json();
}

export async function fetchAdminStoreProducts(
  accessToken: string,
  storeId: string,
): Promise<Product[]> {
  const response = await authFetch(
    `/api/v1/admin/stores/${storeId}/products`,
    accessToken,
  );

  if (!response.ok) {
    throw new Error(
      await parseApiError(response, "Failed to fetch store products"),
    );
  }

  return response.json();
}

export async function createAdminProduct(
  accessToken: string,
  storeId: string,
  payload: CreateProductInput,
): Promise<Product> {
  const response = await authFetch(
    `/api/v1/admin/stores/${storeId}/products`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create product"));
  }

  return response.json();
}

export async function updateMerchantProduct(
  accessToken: string,
  storeId: string,
  productId: string,
  payload: UpdateProductInput,
): Promise<Product> {
  const response = await authFetch(
    `/api/v1/merchant/stores/${storeId}/products/${productId}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update product"));
  }

  return response.json();
}

export async function updateAdminProduct(
  accessToken: string,
  storeId: string,
  productId: string,
  payload: UpdateProductInput,
): Promise<Product> {
  const response = await authFetch(
    `/api/v1/admin/stores/${storeId}/products/${productId}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update product"));
  }

  return response.json();
}

export async function fetchDeliveryOrders(
  accessToken: string,
): Promise<DeliveryOrderSummary[]> {
  const response = await authFetch("/api/v1/delivery/orders", accessToken);

  if (!response.ok) {
    throw new Error(
      await parseApiError(response, "Failed to fetch delivery orders"),
    );
  }

  return response.json();
}

export async function acceptDeliveryOrder(
  accessToken: string,
  orderId: string,
): Promise<Order> {
  const response = await authFetch(
    `/api/v1/delivery/orders/${orderId}/accept`,
    accessToken,
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error(
      await parseApiError(response, "Failed to accept delivery"),
    );
  }

  return response.json();
}

export async function markDeliveryOrderDelivered(
  accessToken: string,
  orderId: string,
): Promise<Order> {
  const response = await authFetch(
    `/api/v1/delivery/orders/${orderId}/deliver`,
    accessToken,
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error(
      await parseApiError(response, "Failed to mark order delivered"),
    );
  }

  return response.json();
}

export async function fetchChatHistory(
  accessToken?: string,
): Promise<ChatTurn[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/chat/history`, {
    headers: { ...authHeaders(accessToken) },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load chat history"));
  }
  const body = (await response.json()) as ChatHistoryResponse;
  return body.messages;
}

export async function sendChatMessage(
  message: string,
  history: ChatTurn[],
  coords?: UserCoordinates,
  accessToken?: string,
): Promise<ChatResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(accessToken),
    },
    body: JSON.stringify({
      message,
      history,
      ...(coords ? { user_lat: coords.lat, user_lng: coords.lng } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Chat request failed"));
  }

  return response.json();
}
