import { apiClient } from "./api";
import {
  Event,
  BudgetSummary,
  BudgetItem,
  Task,
  VendorItem,
  EventType,
  EventStatus,
  BudgetCategory,
  TaskPriority,
  TaskStatus,
  VendorCategory,
  BookingStatus,
  PaymentStatus,
  AIPlanProposal,
  AIApplyPlanResponse,
  AssistantResponse,
  AssistantConfirmResponse,
  AssistantMessageLog,
} from "../types";

export interface CreateEventPayload {
  name: string;
  event_type: EventType;
  event_date: string;
  location: string;
  expected_guest_count: number;
  total_budget: number;
  currency?: string;
  theme?: string;
  preferences?: string;
  special_requirements?: string;
}

export interface UpdateEventPayload {
  name?: string;
  event_type?: EventType;
  event_date?: string;
  location?: string;
  expected_guest_count?: number;
  total_budget?: number;
  currency?: string;
  theme?: string;
  preferences?: string;
  special_requirements?: string;
  status?: EventStatus;
}

export interface CreateBudgetItemPayload {
  category: BudgetCategory;
  item_name: string;
  estimated_amount?: number;
  actual_amount?: number;
  notes?: string;
  status?: "planned" | "committed" | "paid";
}

export interface UpdateBudgetItemPayload {
  category?: BudgetCategory;
  item_name?: string;
  estimated_amount?: number;
  actual_amount?: number;
  notes?: string;
  status?: "planned" | "committed" | "paid";
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  category?: string;
  due_date: string;
  priority?: TaskPriority;
  dependencies?: string[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  category?: string;
  due_date?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dependencies?: string[];
}

export interface CreateVendorPayload {
  category: VendorCategory;
  item_name: string;
  quotation_amount?: number;
  booking_status?: BookingStatus;
  payment_status?: PaymentStatus;
  notes?: string;
  contact_info?: string;
}

export interface UpdateVendorPayload {
  category?: VendorCategory;
  item_name?: string;
  quotation_amount?: number;
  booking_status?: BookingStatus;
  payment_status?: PaymentStatus;
  notes?: string;
  contact_info?: string;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  completed: number;
  overdue: number;
  completion_percentage: number;
}

export interface VendorListResponse {
  items: VendorItem[];
  total_count: number;
  booked_count: number;
  total_quotations: number;
  categories: Record<string, number>;
}

export const eventService = {
  // Event operations
  async getEvents(): Promise<Event[]> {
    const res = await apiClient.get<Event[]>("/events");
    return res.data;
  },

  async getEvent(eventId: string): Promise<Event> {
    const res = await apiClient.get<Event>(`/events/${eventId}`);
    return res.data;
  },

  async createEvent(payload: CreateEventPayload): Promise<Event> {
    const res = await apiClient.post<Event>("/events", payload);
    return res.data;
  },

  async updateEvent(eventId: string, payload: UpdateEventPayload): Promise<Event> {
    const res = await apiClient.put<Event>(`/events/${eventId}`, payload);
    return res.data;
  },

  async deleteEvent(eventId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}`);
  },

  // Budget operations
  async getBudgetSummary(eventId: string): Promise<BudgetSummary> {
    const res = await apiClient.get<BudgetSummary>(`/events/${eventId}/budget`);
    return res.data;
  },

  async addBudgetItem(eventId: string, payload: CreateBudgetItemPayload): Promise<BudgetItem> {
    const res = await apiClient.post<BudgetItem>(`/events/${eventId}/budget`, payload);
    return res.data;
  },

  async updateBudgetItem(
    eventId: string,
    itemId: string,
    payload: UpdateBudgetItemPayload
  ): Promise<BudgetItem> {
    const res = await apiClient.put<BudgetItem>(`/events/${eventId}/budget/${itemId}`, payload);
    return res.data;
  },

  async deleteBudgetItem(eventId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}/budget/${itemId}`);
  },

  // Task operations
  async getTasks(eventId: string): Promise<TaskListResponse> {
    const res = await apiClient.get<TaskListResponse>(`/events/${eventId}/tasks`);
    return res.data;
  },

  async createTask(eventId: string, payload: CreateTaskPayload): Promise<Task> {
    const res = await apiClient.post<Task>(`/events/${eventId}/tasks`, payload);
    return res.data;
  },

  async updateTask(eventId: string, taskId: string, payload: UpdateTaskPayload): Promise<Task> {
    const res = await apiClient.put<Task>(`/events/${eventId}/tasks/${taskId}`, payload);
    return res.data;
  },

  async deleteTask(eventId: string, taskId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}/tasks/${taskId}`);
  },

  async rescheduleTimeline(
    eventId: string,
    newDate: string,
    preserveCompleted: boolean = true
  ): Promise<TaskListResponse> {
    const res = await apiClient.post<TaskListResponse>(`/events/${eventId}/tasks/reschedule`, {
      new_event_date: newDate,
      preserve_completed: preserveCompleted,
    });
    return res.data;
  },

  // Vendor operations
  async getVendors(eventId: string): Promise<VendorListResponse> {
    const res = await apiClient.get<VendorListResponse>(`/events/${eventId}/vendors`);
    return res.data;
  },

  async addVendor(eventId: string, payload: CreateVendorPayload): Promise<VendorItem> {
    const res = await apiClient.post<VendorItem>(`/events/${eventId}/vendors`, payload);
    return res.data;
  },

  async updateVendor(
    eventId: string,
    itemId: string,
    payload: UpdateVendorPayload
  ): Promise<VendorItem> {
    const res = await apiClient.put<VendorItem>(`/events/${eventId}/vendors/${itemId}`, payload);
    return res.data;
  },

  async deleteVendor(eventId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/events/${eventId}/vendors/${itemId}`);
  },

  // AI Planning operations
  async generatePlan(
    eventId: string,
    payload?: { focus_areas?: string[]; force_fallback?: boolean }
  ): Promise<AIPlanProposal> {
    const res = await apiClient.post<AIPlanProposal>(
      `/events/${eventId}/generate-plan`,
      payload || {}
    );
    return res.data;
  },

  async applyPlan(
    eventId: string,
    proposal: AIPlanProposal,
    replaceExisting: boolean = false
  ): Promise<AIApplyPlanResponse> {
    const res = await apiClient.post<AIApplyPlanResponse>(
      `/events/${eventId}/apply-plan`,
      {
        proposal,
        replace_existing: replaceExisting,
      }
    );
    return res.data;
  },

  // Conversational Assistant operations
  async sendAssistantMessage(
    eventId: string,
    prompt: string,
    forceFallback: boolean = false
  ): Promise<AssistantResponse> {
    const res = await apiClient.post<AssistantResponse>(
      `/events/${eventId}/assistant`,
      {
        prompt,
        force_fallback: forceFallback,
      }
    );
    return res.data;
  },

  async confirmAssistantProposal(
    eventId: string,
    proposalId: string,
    confirmed: boolean = true
  ): Promise<AssistantConfirmResponse> {
    const res = await apiClient.post<AssistantConfirmResponse>(
      `/events/${eventId}/assistant/${proposalId}/confirm`,
      {
        confirmed,
      }
    );
    return res.data;
  },

  async getAssistantHistory(eventId: string, limit: number = 50): Promise<AssistantMessageLog[]> {
    const res = await apiClient.get<AssistantMessageLog[]>(
      `/events/${eventId}/assistant/history`,
      {
        params: { limit },
      }
    );
    return res.data;
  },
};

