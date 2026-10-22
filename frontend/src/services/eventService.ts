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
  EventSummaryStats,
  ProposedChanges,
} from "../types";

const GROQ_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) || "";

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

// ============================================================================
// LocalStorage Persistence Keys
// ============================================================================
const STORAGE_KEYS = {
  EVENTS: "eventwise_events",
  BUDGET_ITEMS: "eventwise_budget_items",
  TASKS: "eventwise_tasks",
  VENDORS: "eventwise_vendors",
  CHAT_PREFIX: "eventwise_chat_",
  STAGED_PROPOSALS: "eventwise_staged_proposals",
};

// ============================================================================
// Initial Seed Data (Only seeded if localStorage is empty)
// ============================================================================
const SEED_EVENT_ID = "evt-seed-wedding-001";
const now = new Date();
const targetDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString();

const SEED_EVENTS: Event[] = [
  {
    id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    name: "Sunset Garden Wedding & Reception",
    event_type: "wedding",
    event_date: targetDate,
    location: "Sapphire Botanical Gardens & Pavilion",
    expected_guest_count: 150,
    total_budget: 25000,
    currency: "USD",
    theme: "Romantic Botanical Sunset & Golden Lanterns",
    preferences: "Acoustic strings, craft mocktails & organic farm-to-table cuisine",
    special_requirements: "Ramp accessibility for garden pavilion",
    status: "planning",
    created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_BUDGET: BudgetItem[] = [
  {
    id: "bgt-1",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "venue",
    item_name: "Botanical Garden Pavilion & Lawn Rental",
    estimated_amount: 7500,
    actual_amount: 7500,
    notes: "Includes electricity and bridal suite",
    status: "paid",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bgt-2",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "catering",
    item_name: "Farm-to-Table Buffet & Open Beverage Bar",
    estimated_amount: 8500,
    actual_amount: 8200,
    notes: "3-course plated option for 150 guests",
    status: "committed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bgt-3",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "photography",
    item_name: "Full-Day Drone & Candid Photography",
    estimated_amount: 3000,
    actual_amount: 2800,
    notes: "Includes 2 photographers and highlight film",
    status: "committed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bgt-4",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "decoration",
    item_name: "Fairy String Lights & Floral Arch Centerpieces",
    estimated_amount: 2500,
    actual_amount: 2400,
    notes: "Warm ambient glow styling",
    status: "planned",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_TASKS: Task[] = [
  {
    id: "tsk-1",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    title: "Lock In Venue Contract & Deposit",
    category: "Venue",
    due_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "urgent",
    status: "completed",
    dependencies: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "tsk-2",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    title: "Finalize Tasting Menu with Catering Chef",
    category: "Catering",
    due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "high",
    status: "in_progress",
    dependencies: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "tsk-3",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    title: "Confirm Photographer Shot List & Timeline",
    category: "Photography",
    due_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "medium",
    status: "pending",
    dependencies: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "tsk-4",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    title: "Send RSVP Invitations & Track Dietary Restrictions",
    category: "Invitations",
    due_date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "high",
    status: "pending",
    dependencies: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_VENDORS: VendorItem[] = [
  {
    id: "vnd-1",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "venue",
    item_name: "Sapphire Botanical Gardens",
    quotation_amount: 7500,
    booking_status: "booked",
    payment_status: "paid",
    notes: "Deposit paid. Contact: Sarah (events@sapphirebotanical.com)",
    contact_info: "events@sapphirebotanical.com | (555) 234-8901",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "vnd-2",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "catering",
    item_name: "Artisan Feast Culinary Co.",
    quotation_amount: 8200,
    booking_status: "booked",
    payment_status: "partially_paid",
    notes: "Tasting confirmed. 50% deposit cleared.",
    contact_info: "chef@artisanfeast.com | (555) 456-7890",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "vnd-3",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "photography",
    item_name: "Lumiere Lens Visuals",
    quotation_amount: 2800,
    booking_status: "quoted",
    payment_status: "unpaid",
    notes: "Reviewing drone permit requirements.",
    contact_info: "hello@lumierelens.com | (555) 789-0123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "vnd-4",
    event_id: SEED_EVENT_ID,
    user_id: "demo-planner-001",
    category: "decoration",
    item_name: "Blossom & Pine Floral Design",
    quotation_amount: 2400,
    booking_status: "contacted",
    payment_status: "unpaid",
    notes: "Waiting for floral mood board proposal.",
    contact_info: "contact@blossompine.com | (555) 890-1234",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================================
// Storage Access Helpers
// ============================================================================
const getStored = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
};

const setStored = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`LocalStorage write failed for key "${key}":`, err);
  }
};

const getEventsFromStorage = (): Event[] => {
  const events = getStored<Event[]>(STORAGE_KEYS.EVENTS, []);
  if (events.length === 0 && !localStorage.getItem("eventwise_initialized")) {
    localStorage.setItem("eventwise_initialized", "true");
    setStored(STORAGE_KEYS.EVENTS, SEED_EVENTS);
    setStored(STORAGE_KEYS.BUDGET_ITEMS, SEED_BUDGET);
    setStored(STORAGE_KEYS.TASKS, SEED_TASKS);
    setStored(STORAGE_KEYS.VENDORS, SEED_VENDORS);
    return SEED_EVENTS;
  }
  return events;
};

const getBudgetItemsFromStorage = (): BudgetItem[] => {
  return getStored<BudgetItem[]>(STORAGE_KEYS.BUDGET_ITEMS, []);
};

const getTasksFromStorage = (): Task[] => {
  return getStored<Task[]>(STORAGE_KEYS.TASKS, []);
};

const getVendorsFromStorage = (): VendorItem[] => {
  return getStored<VendorItem[]>(STORAGE_KEYS.VENDORS, []);
};

const computeEventStats = (eventId: string, totalBudget: number): EventSummaryStats => {
  const budgetItems = getBudgetItemsFromStorage().filter((b) => b.event_id === eventId);
  const tasks = getTasksFromStorage().filter((t) => t.event_id === eventId);
  const vendors = getVendorsFromStorage().filter((v) => v.event_id === eventId);

  const budget_allocated = budgetItems.reduce((acc, b) => acc + (b.estimated_amount || 0), 0);
  const budget_spent = budgetItems.reduce((acc, b) => acc + (b.actual_amount || 0), 0);
  const budget_remaining = totalBudget - budget_spent;

  const total_tasks = tasks.length;
  const completed_tasks = tasks.filter((t) => t.status === "completed").length;
  const currentNow = new Date();
  const overdue_tasks = tasks.filter(
    (t) => t.status !== "completed" && new Date(t.due_date) < currentNow
  ).length;
  const task_progress_percentage =
    total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0;

  const total_vendors = vendors.length;
  const booked_vendors = vendors.filter((v) => v.booking_status === "booked").length;

  return {
    budget_allocated,
    budget_spent,
    budget_remaining,
    total_tasks,
    completed_tasks,
    overdue_tasks,
    task_progress_percentage,
    total_vendors,
    booked_vendors,
  };
};

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

// ============================================================================
// Service Implementation (LocalStorage Backed with Resilient AI Engine)
// ============================================================================
export const eventService = {
  // ==========================================================================
  // EVENT OPERATIONS
  // ==========================================================================
  async getEvents(): Promise<Event[]> {
    const events = getEventsFromStorage();
    return events.map((event) => ({
      ...event,
      stats: computeEventStats(event.id, event.total_budget),
    }));
  },

  async getEvent(eventId: string): Promise<Event> {
    const events = getEventsFromStorage();
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error(`Event with ID "${eventId}" not found.`);
    }
    return {
      ...event,
      stats: computeEventStats(event.id, event.total_budget),
    };
  },

  async createEvent(payload: CreateEventPayload): Promise<Event> {
    const events = getEventsFromStorage();
    const newId = generateId("evt");
    const timestamp = new Date().toISOString();

    const newEvent: Event = {
      id: newId,
      user_id: "demo-planner-001",
      name: payload.name,
      event_type: payload.event_type,
      event_date: payload.event_date,
      location: payload.location,
      expected_guest_count: Number(payload.expected_guest_count) || 0,
      total_budget: Number(payload.total_budget) || 0,
      currency: payload.currency || "USD",
      theme: payload.theme || "",
      preferences: payload.preferences || "",
      special_requirements: payload.special_requirements || "",
      status: "planning",
      created_at: timestamp,
      updated_at: timestamp,
      stats: {
        budget_allocated: 0,
        budget_spent: 0,
        budget_remaining: Number(payload.total_budget) || 0,
        total_tasks: 0,
        completed_tasks: 0,
        overdue_tasks: 0,
        task_progress_percentage: 0,
        total_vendors: 0,
        booked_vendors: 0,
      },
    };

    const updated = [newEvent, ...events];
    setStored(STORAGE_KEYS.EVENTS, updated);
    return newEvent;
  },

  async updateEvent(eventId: string, payload: UpdateEventPayload): Promise<Event> {
    const events = getEventsFromStorage();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) {
      throw new Error(`Event with ID "${eventId}" not found.`);
    }

    const updatedEvent: Event = {
      ...events[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    events[index] = updatedEvent;
    setStored(STORAGE_KEYS.EVENTS, events);

    return {
      ...updatedEvent,
      stats: computeEventStats(updatedEvent.id, updatedEvent.total_budget),
    };
  },

  async deleteEvent(eventId: string): Promise<void> {
    // Delete event
    const events = getEventsFromStorage().filter((e) => e.id !== eventId);
    setStored(STORAGE_KEYS.EVENTS, events);

    // Cascade delete budget, tasks, vendors, and chat history
    const budget = getBudgetItemsFromStorage().filter((b) => b.event_id !== eventId);
    setStored(STORAGE_KEYS.BUDGET_ITEMS, budget);

    const tasks = getTasksFromStorage().filter((t) => t.event_id !== eventId);
    setStored(STORAGE_KEYS.TASKS, tasks);

    const vendors = getVendorsFromStorage().filter((v) => v.event_id !== eventId);
    setStored(STORAGE_KEYS.VENDORS, vendors);

    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT_PREFIX + eventId);
    } catch {
      // Ignore
    }
  },

  // ==========================================================================
  // BUDGET OPERATIONS
  // ==========================================================================
  async getBudgetSummary(eventId: string): Promise<BudgetSummary> {
    const event = await this.getEvent(eventId);
    const items = getBudgetItemsFromStorage().filter((b) => b.event_id === eventId);

    const total_budget = event.total_budget || 0;
    const total_estimated = items.reduce((acc, i) => acc + (Number(i.estimated_amount) || 0), 0);
    const total_actual = items.reduce((acc, i) => acc + (Number(i.actual_amount) || 0), 0);
    const remaining_budget = total_budget - total_actual;
    const cost_per_guest =
      event.expected_guest_count && event.expected_guest_count > 0
        ? Number((total_actual / event.expected_guest_count).toFixed(2))
        : 0;
    const utilization_percentage =
      total_budget > 0 ? Math.min(100, Math.round((total_actual / total_budget) * 100)) : 0;
    const is_overspent = total_actual > total_budget;
    const overspent_amount = is_overspent ? total_actual - total_budget : 0;

    const items_by_category: Record<string, { estimated: number; actual: number; count: number }> =
      {};
    items.forEach((item) => {
      if (!items_by_category[item.category]) {
        items_by_category[item.category] = { estimated: 0, actual: 0, count: 0 };
      }
      items_by_category[item.category].estimated += Number(item.estimated_amount) || 0;
      items_by_category[item.category].actual += Number(item.actual_amount) || 0;
      items_by_category[item.category].count += 1;
    });

    return {
      total_budget,
      currency: event.currency || "USD",
      total_estimated,
      total_actual,
      remaining_budget,
      cost_per_guest,
      utilization_percentage,
      is_overspent,
      overspent_amount,
      items_by_category,
      items,
    };
  },

  async addBudgetItem(eventId: string, payload: CreateBudgetItemPayload): Promise<BudgetItem> {
    const items = getBudgetItemsFromStorage();
    const newId = generateId("bgt");
    const timestamp = new Date().toISOString();

    const newItem: BudgetItem = {
      id: newId,
      event_id: eventId,
      user_id: "demo-planner-001",
      category: payload.category,
      item_name: payload.item_name,
      estimated_amount: Number(payload.estimated_amount) || 0,
      actual_amount: Number(payload.actual_amount) || 0,
      notes: payload.notes || "",
      status: payload.status || "planned",
      created_at: timestamp,
      updated_at: timestamp,
    };

    setStored(STORAGE_KEYS.BUDGET_ITEMS, [...items, newItem]);
    return newItem;
  },

  async updateBudgetItem(
    eventId: string,
    itemId: string,
    payload: UpdateBudgetItemPayload
  ): Promise<BudgetItem> {
    const items = getBudgetItemsFromStorage();
    const index = items.findIndex((i) => i.id === itemId && i.event_id === eventId);
    if (index === -1) {
      throw new Error(`Budget item with ID "${itemId}" not found.`);
    }

    const updated: BudgetItem = {
      ...items[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    items[index] = updated;
    setStored(STORAGE_KEYS.BUDGET_ITEMS, items);
    return updated;
  },

  async deleteBudgetItem(eventId: string, itemId: string): Promise<void> {
    const items = getBudgetItemsFromStorage().filter(
      (i) => !(i.id === itemId && i.event_id === eventId)
    );
    setStored(STORAGE_KEYS.BUDGET_ITEMS, items);
  },

  // ==========================================================================
  // TASK & TIMELINE OPERATIONS
  // ==========================================================================
  async getTasks(eventId: string): Promise<TaskListResponse> {
    const allTasks = getTasksFromStorage().filter((t) => t.event_id === eventId);
    const currentDate = new Date();

    const tasks = allTasks
      .map((t) => ({
        ...t,
        is_overdue: t.status !== "completed" && new Date(t.due_date) < currentDate,
      }))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter((t) => t.is_overdue).length;
    const completion_percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      tasks,
      total,
      completed,
      overdue,
      completion_percentage,
    };
  },

  async createTask(eventId: string, payload: CreateTaskPayload): Promise<Task> {
    const tasks = getTasksFromStorage();
    const newId = generateId("tsk");
    const timestamp = new Date().toISOString();

    const newTask: Task = {
      id: newId,
      event_id: eventId,
      user_id: "demo-planner-001",
      title: payload.title,
      description: payload.description || "",
      category: payload.category || "General",
      due_date: payload.due_date,
      priority: payload.priority || "medium",
      status: "pending",
      dependencies: payload.dependencies || [],
      created_at: timestamp,
      updated_at: timestamp,
    };

    setStored(STORAGE_KEYS.TASKS, [...tasks, newTask]);
    return newTask;
  },

  async updateTask(eventId: string, taskId: string, payload: UpdateTaskPayload): Promise<Task> {
    const tasks = getTasksFromStorage();
    const index = tasks.findIndex((t) => t.id === taskId && t.event_id === eventId);
    if (index === -1) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }

    const updated: Task = {
      ...tasks[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    tasks[index] = updated;
    setStored(STORAGE_KEYS.TASKS, tasks);
    return updated;
  },

  async deleteTask(eventId: string, taskId: string): Promise<void> {
    const tasks = getTasksFromStorage().filter(
      (t) => !(t.id === taskId && t.event_id === eventId)
    );
    setStored(STORAGE_KEYS.TASKS, tasks);
  },

  async rescheduleTimeline(
    eventId: string,
    newDate: string,
    preserveCompleted: boolean = true
  ): Promise<TaskListResponse> {
    const event = await this.getEvent(eventId);
    const oldEventTime = new Date(event.event_date).getTime();
    const newEventTime = new Date(newDate).getTime();
    const shiftDelta = newEventTime - oldEventTime;

    const allTasks = getTasksFromStorage();
    const updated = allTasks.map((t) => {
      if (t.event_id !== eventId) return t;
      if (preserveCompleted && t.status === "completed") return t;

      const originalDue = new Date(t.due_date).getTime();
      const newDue = new Date(originalDue + shiftDelta).toISOString();
      return {
        ...t,
        due_date: newDue,
        updated_at: new Date().toISOString(),
      };
    });

    setStored(STORAGE_KEYS.TASKS, updated);
    await this.updateEvent(eventId, { event_date: newDate });
    return this.getTasks(eventId);
  },

  // ==========================================================================
  // VENDOR OPERATIONS
  // ==========================================================================
  async getVendors(eventId: string): Promise<VendorListResponse> {
    const items = getVendorsFromStorage().filter((v) => v.event_id === eventId);
    const total_count = items.length;
    const booked_count = items.filter((v) => v.booking_status === "booked").length;
    const total_quotations = items.reduce(
      (acc, v) => acc + (Number(v.quotation_amount) || 0),
      0
    );
    const categories: Record<string, number> = {};
    items.forEach((v) => {
      categories[v.category] = (categories[v.category] || 0) + 1;
    });

    return {
      items,
      total_count,
      booked_count,
      total_quotations,
      categories,
    };
  },

  async addVendor(eventId: string, payload: CreateVendorPayload): Promise<VendorItem> {
    const items = getVendorsFromStorage();
    const newId = generateId("vnd");
    const timestamp = new Date().toISOString();

    const newVendor: VendorItem = {
      id: newId,
      event_id: eventId,
      user_id: "demo-planner-001",
      category: payload.category,
      item_name: payload.item_name,
      quotation_amount: Number(payload.quotation_amount) || 0,
      booking_status: payload.booking_status || "not_started",
      payment_status: payload.payment_status || "unpaid",
      notes: payload.notes || "",
      contact_info: payload.contact_info || "",
      created_at: timestamp,
      updated_at: timestamp,
    };

    setStored(STORAGE_KEYS.VENDORS, [...items, newVendor]);
    return newVendor;
  },

  async updateVendor(
    eventId: string,
    itemId: string,
    payload: UpdateVendorPayload
  ): Promise<VendorItem> {
    const items = getVendorsFromStorage();
    const index = items.findIndex((v) => v.id === itemId && v.event_id === eventId);
    if (index === -1) {
      throw new Error(`Vendor item with ID "${itemId}" not found.`);
    }

    const updated: VendorItem = {
      ...items[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    items[index] = updated;
    setStored(STORAGE_KEYS.VENDORS, items);
    return updated;
  },

  async deleteVendor(eventId: string, itemId: string): Promise<void> {
    const items = getVendorsFromStorage().filter(
      (v) => !(v.id === itemId && v.event_id === eventId)
    );
    setStored(STORAGE_KEYS.VENDORS, items);
  },

  // ==========================================================================
  // AI PLANNING BLUEPRINT OPERATIONS
  // ==========================================================================
  async generatePlan(
    eventId: string,
    payload?: { focus_areas?: string[]; force_fallback?: boolean }
  ): Promise<AIPlanProposal> {
    const event = await this.getEvent(eventId);
    const budget = event.total_budget || 10000;
    const guests = event.expected_guest_count || 50;
    const focus = payload?.focus_areas || [];
    const eventType = event.event_type || "wedding";

    // 1. Live AI Blueprint Generation via Backend or Direct Groq Cloud
    if (!payload?.force_fallback) {
      // 1a. Try calling backend deployed on Render
      try {
        const res = await apiClient.post<AIPlanProposal>(
          `/events/${eventId}/generate-plan`,
          {
            event_context: {
              id: event.id,
              name: event.name,
              event_type: event.event_type,
              event_date: event.event_date,
              location: event.location,
              expected_guest_count: event.expected_guest_count,
              total_budget: event.total_budget,
              currency: event.currency || "USD",
              theme: event.theme,
              preferences: event.preferences,
              special_requirements: event.special_requirements,
            },
            focus_areas: focus,
            force_fallback: false,
          },
          { timeout: 12000 }
        );
        if (res.data && res.data.budget_allocations && res.data.budget_allocations.length > 0) {
          return res.data;
        }
      } catch {
        // Backend sleeping or offline, proceed directly to Groq Cloud API
      }

      // 1b. Direct Groq Cloud GenAI (High-speed LLM directly in client)
      try {
        const groqPrompt = `Generate a comprehensive, realistic event plan for:
Event Name: ${event.name}
Event Type: ${event.event_type}
Date: ${event.event_date}
Location: ${event.location}
Expected Guests: ${event.expected_guest_count}
Total Budget: $${event.total_budget} ${event.currency || "USD"}
Theme/Style: ${event.theme || "Modern and elegant"}
Focus Areas: ${focus.join(", ") || "General comprehensive planning"}

Return a JSON object with:
- "summary": string
- "theme_and_decor": array of strings
- "food_recommendations": array of strings
- "entertainment_suggestions": array of strings
- "budget_allocations": array of objects with "category" (venue, catering, photography, decoration, entertainment, invitations, transportation, equipment_rental, miscellaneous), "item_name", "estimated_amount", "notes"
- "planning_tasks": array of objects with "title", "category", "days_before_event" (integer), "priority" (low, medium, high, urgent), "description"
- "vendor_categories": array of objects with "category", "item_name", "suggested_scope", "estimated_budget"
- "personalized_recommendations": array of strings`;

        const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert event planner. Generate a structured event plan. You MUST respond ONLY with a valid JSON object matching the requested schema. No code fences or extra text.",
              },
              { role: "user", content: groqPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 3000,
          }),
        });

        if (groqResp.ok) {
          const groqData = await groqResp.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            let clean = content.trim();
            if (clean.startsWith("```json")) clean = clean.slice(7);
            if (clean.endsWith("```")) clean = clean.slice(0, -3);
            const parsed = JSON.parse(clean);
            if (parsed.budget_allocations && Array.isArray(parsed.budget_allocations) && parsed.budget_allocations.length > 0) {
              const validBudgetCats = new Set([
                "venue", "catering", "photography", "decoration", "entertainment",
                "invitations", "transportation", "equipment_rental", "miscellaneous"
              ]);
              const allocations = parsed.budget_allocations.map((b: any) => ({
                category: validBudgetCats.has(String(b.category).toLowerCase())
                  ? String(b.category).toLowerCase()
                  : "miscellaneous",
                item_name: String(b.item_name || "Service"),
                estimated_amount: Number(b.estimated_amount) || 0,
                notes: b.notes ? String(b.notes) : undefined,
              }));

              const validPriorities = new Set(["low", "medium", "high", "urgent"]);
              const tasks = (parsed.planning_tasks || []).map((t: any) => ({
                title: String(t.title || "Task milestone"),
                category: String(t.category || "General"),
                days_before_event: Math.max(0, Math.min(730, Number(t.days_before_event) || 14)),
                priority: validPriorities.has(String(t.priority).toLowerCase())
                  ? String(t.priority).toLowerCase()
                  : "medium",
                description: t.description ? String(t.description) : undefined,
              }));

              const vendors = (parsed.vendor_categories || []).map((v: any) => ({
                category: validBudgetCats.has(String(v.category).toLowerCase())
                  ? String(v.category).toLowerCase()
                  : "venue",
                item_name: String(v.item_name || "Vendor Requirement"),
                suggested_scope: String(v.suggested_scope || "Standard scope"),
                estimated_budget: Number(v.estimated_budget) || 0,
              }));

              const totalAlloc = allocations.reduce((acc: number, b: any) => acc + b.estimated_amount, 0);

              return {
                event_id: eventId,
                summary: parsed.summary || `Personalized event blueprint for "${event.name}"`,
                theme_and_decor: parsed.theme_and_decor || [],
                food_recommendations: parsed.food_recommendations || [],
                entertainment_suggestions: parsed.entertainment_suggestions || [],
                budget_allocations: allocations,
                planning_tasks: tasks,
                vendor_categories: vendors,
                personalized_recommendations: parsed.personalized_recommendations || [],
                provider_used: "groq (openai/gpt-oss-20b)",
                is_fallback: false,
                total_proposed_budget: totalAlloc > 0 ? totalAlloc : budget,
                created_at: new Date().toISOString(),
              };
            }
          }
        }
      } catch (groqErr) {
        console.warn("Direct Groq call exception:", groqErr);
      }
    }

    // 2. Client-Side Heuristic Fallback
    await new Promise((resolve) => setTimeout(resolve, 350));
    const summary = `Tailored blueprint for "${event.name}" (${eventType.toUpperCase()}) with ${guests} guests and $${budget.toLocaleString()} planned budget. Combines mathematical allocation with cohesive ambiance styling.`;

    // 1. Theme and Decor suggestions
    let themeAndDecor: string[] = [
      "Curated warm ambient string lighting and architectural accent uplighting",
      "Cohesive botanical greenery runners with personalized welcome signage",
      "Interactive photo memory wall and curated guestbook alcove",
    ];
    if (eventType === "corporate" || eventType === "conference") {
      themeAndDecor = [
        "Modern executive branding with sleek LED digital signage and branded podium wrap",
        "Minimalist aesthetic featuring monochromatic table arrangements and dynamic stage lighting",
        "Interactive networking lounge with digital badge scanners and sponsor feature displays",
      ];
    } else if (eventType === "birthday" || eventType === "anniversary") {
      themeAndDecor = [
        "Festive celebratory arch with custom metallic balloons and warm fairy lights",
        "Personalized milestone photo timeline spanning key memories and achievements",
        "Thematic centerpiece arrangements with customized dessert and favor display table",
      ];
    }

    // 2. Culinary recommendations
    let foodRecommendations: string[] = [
      "Artisan appetizer station featuring local cheeses and seasonal bites",
      "Dual-entree plated dinner or upscale interactive chef-attended stations",
      "Signature mocktail and craft cocktail pairings with late-night sweet bites",
    ];
    if (eventType === "corporate") {
      foodRecommendations = [
        "Executive breakfast buffet with artisanal coffee bar and cold-pressed juices",
        "Gourmet box lunches with dietary-labeled healthy bowls and wraps",
        "Evening post-keynote networking reception with passed hors d'oeuvres and wine pairing",
      ];
    }

    // 3. Entertainment suggestions
    let entertainmentSuggestions: string[] = [
      "Live acoustic duo for arrivals followed by dynamic high-energy playlist",
      "Professional MC coordination for seamless transition announcements",
      "Interactive guest trivia and celebratory toast sequence",
    ];
    if (eventType === "corporate" || eventType === "conference") {
      entertainmentSuggestions = [
        "Industry keynote speaker opening followed by moderated panel sessions",
        "Live interactive audience Q&A polling via mobile event app",
        "Cocktail hour jazz trio for relaxed professional networking",
      ];
    }

    // 4. Budget Allocations (calculated to sum up exactly to total budget)
    let allocations: { category: BudgetCategory; name: string; pct: number; notes: string }[] = [];
    if (eventType === "corporate" || eventType === "conference") {
      allocations = [
        { category: "venue", name: "Conference Center & Executive Hall", pct: 0.35, notes: "Main auditorium and breakout rooms" },
        { category: "catering", name: "Executive Catering & Coffee Stations", pct: 0.25, notes: "Breakfast, lunch, and all-day refreshments" },
        { category: "equipment_rental", name: "Audio/Visual, Stage & Live Streaming AV", pct: 0.20, notes: "Projectors, microphones, and streaming gear" },
        { category: "entertainment", name: "Keynote Honorarium & Emcee", pct: 0.10, notes: "Speaker coordination and moderation" },
        { category: "decoration", name: "Branded Signage, Badges & Collateral", pct: 0.10, notes: "Banners, delegate badges, and programs" },
      ];
    } else if (eventType === "birthday" || eventType === "social") {
      allocations = [
        { category: "venue", name: "Event Lounge / Private Party Space", pct: 0.25, notes: "Venue rental fee and setup" },
        { category: "catering", name: "Catering, Custom Cake & Beverage Bar", pct: 0.35, notes: "Buffet dining, celebratory cake, and drinks" },
        { category: "entertainment", name: "DJ Performance & Party Lighting", pct: 0.15, notes: "Music, sound equipment, and party effects" },
        { category: "decoration", name: "Thematic Balloon Arch & Table Decor", pct: 0.15, notes: "Backdrop, photo area, and centerpieces" },
        { category: "photography", name: "Event Photographer & Digital Gallery", pct: 0.10, notes: "3-hour candid and group coverage" },
      ];
    } else {
      allocations = [
        { category: "venue", name: "Primary Event Space & Facility Fee", pct: 0.30, notes: "Prime venue reservation and basic amenities" },
        { category: "catering", name: "Catering, Service Staff & Bar Package", pct: 0.35, notes: "Food & beverage service for all guests" },
        { category: "photography", name: "Full Event Photography & High-Res Gallery", pct: 0.15, notes: "Full coverage and edited deliverables" },
        { category: "decoration", name: "Thematic Floral Arrangements & Centerpieces", pct: 0.10, notes: "Aesthetics, lighting, and tablescapes" },
        { category: "entertainment", name: "Sound System & DJ/Music Performance", pct: 0.10, notes: "Guest experience, dance, and announcements" },
      ];
    }

    if (focus.some((f) => f.toLowerCase().includes("cater"))) {
      allocations.forEach((a) => {
        if (a.category === "catering") a.pct += 0.05;
        else if (a.category === "venue") a.pct -= 0.05;
      });
    }

    let allocatedTotal = 0;
    const budgetAllocations = allocations.map((alloc, idx) => {
      let amount = Math.round(budget * alloc.pct);
      if (idx === allocations.length - 1) {
        amount = Math.max(0, budget - allocatedTotal);
      } else {
        allocatedTotal += amount;
      }
      return {
        category: alloc.category,
        item_name: alloc.name,
        estimated_amount: amount,
        notes: alloc.notes,
      };
    });

    // 5. Planning Tasks (scheduled relative to event date)
    const eventTime = new Date(event.event_date).getTime();
    const isFutureEvent = eventTime > Date.now();
    const daysUntilEvent = isFutureEvent
      ? Math.max(1, Math.round((eventTime - Date.now()) / (24 * 60 * 60 * 1000)))
      : 30;

    const planningTasks = [
      {
        title: "Finalize & Sign Venue Contract",
        category: "Venue",
        days_before_event: Math.min(daysUntilEvent, 60),
        priority: "urgent" as TaskPriority,
        description: "Lock in event date, setup windows, and vendor access agreements.",
      },
      {
        title: "Chef Tasting & Final Menu Selection",
        category: "Catering",
        days_before_event: Math.min(daysUntilEvent, 45),
        priority: "high" as TaskPriority,
        description: "Confirm dietary options, service timeline, and bar selections.",
      },
      {
        title: "Select Photographer & Review Shot List",
        category: "Photography",
        days_before_event: Math.min(daysUntilEvent, 30),
        priority: "medium" as TaskPriority,
        description: "Define must-capture moments and schedule key portraits.",
      },
      {
        title: "Send Formal Invitations & Track RSVPs",
        category: "Invitations",
        days_before_event: Math.min(daysUntilEvent, 21),
        priority: "high" as TaskPriority,
        description: "Collect final attendee counts and special requirements.",
      },
      {
        title: "Confirm Music Playlist & Master of Ceremonies",
        category: "Entertainment",
        days_before_event: Math.min(daysUntilEvent, 14),
        priority: "medium" as TaskPriority,
        description: "Establish walk-in, key milestone, and dance playlist tracks.",
      },
      {
        title: "Final Walkthrough & Vendor Coordination",
        category: "Coordination",
        days_before_event: Math.min(daysUntilEvent, 3),
        priority: "urgent" as TaskPriority,
        description: "Review load-in schedules and venue floorplan layout.",
      },
    ];

    // 6. Vendor Categories
    const vendorCategories = allocations.map((alloc) => ({
      category: (alloc.category as VendorCategory) || "venue",
      item_name: alloc.name,
      suggested_scope: alloc.notes,
      estimated_budget: Math.round(budget * alloc.pct),
    }));

    return {
      event_id: eventId,
      summary,
      theme_and_decor: themeAndDecor,
      food_recommendations: foodRecommendations,
      entertainment_suggestions: entertainmentSuggestions,
      budget_allocations: budgetAllocations,
      planning_tasks: planningTasks,
      vendor_categories: vendorCategories,
      personalized_recommendations: [
        `With ${guests} guests, plan approximately $${Math.round(budget / (guests || 1))} per guest to balance comfort and hospitality.`,
        "Designate a dedicated point-of-contact so you can enjoy your event without handling vendor deliveries.",
        "Request vendor certificates of insurance and backup equipment lists at least two weeks prior to the event date.",
      ],
      provider_used: "EventWise AI Client Engine",
      is_fallback: true,
      total_proposed_budget: budget,
      created_at: new Date().toISOString(),
    };
  },

  async applyPlan(
    eventId: string,
    proposal: AIPlanProposal,
    replaceExisting: boolean = false
  ): Promise<AIApplyPlanResponse> {
    const event = await this.getEvent(eventId);
    const eventTime = new Date(event.event_date).getTime();

    // 1. Budget items
    let currentBudget = getBudgetItemsFromStorage();
    if (replaceExisting) {
      currentBudget = currentBudget.filter((b) => b.event_id !== eventId);
    }
    const newBudgetItems: BudgetItem[] = proposal.budget_allocations.map((alloc) => ({
      id: generateId("bgt"),
      event_id: eventId,
      user_id: "demo-planner-001",
      category: alloc.category,
      item_name: alloc.item_name,
      estimated_amount: alloc.estimated_amount,
      actual_amount: 0,
      notes: alloc.notes || "Generated from AI Blueprint",
      status: "planned",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    setStored(STORAGE_KEYS.BUDGET_ITEMS, [...currentBudget, ...newBudgetItems]);

    // 2. Planning tasks
    let currentTasks = getTasksFromStorage();
    if (replaceExisting) {
      currentTasks = currentTasks.filter((t) => t.event_id !== eventId);
    }
    const newTasks: Task[] = proposal.planning_tasks.map((taskProp) => {
      const dueTime = eventTime - taskProp.days_before_event * 24 * 60 * 60 * 1000;
      return {
        id: generateId("tsk"),
        event_id: eventId,
        user_id: "demo-planner-001",
        title: taskProp.title,
        category: taskProp.category,
        due_date: new Date(dueTime).toISOString(),
        priority: taskProp.priority,
        status: "pending",
        dependencies: [],
        description: taskProp.description || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    setStored(STORAGE_KEYS.TASKS, [...currentTasks, ...newTasks]);

    // 3. Vendor checklist items
    let currentVendors = getVendorsFromStorage();
    if (replaceExisting) {
      currentVendors = currentVendors.filter((v) => v.event_id !== eventId);
    }
    const newVendors: VendorItem[] = proposal.vendor_categories.map((vndProp) => ({
      id: generateId("vnd"),
      event_id: eventId,
      user_id: "demo-planner-001",
      category: vndProp.category,
      item_name: vndProp.item_name,
      quotation_amount: vndProp.estimated_budget || 0,
      booking_status: "not_started",
      payment_status: "unpaid",
      notes: vndProp.suggested_scope,
      contact_info: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    setStored(STORAGE_KEYS.VENDORS, [...currentVendors, ...newVendors]);

    // 4. Update event theme if proposed
    if (proposal.theme_and_decor && proposal.theme_and_decor.length > 0 && !event.theme) {
      await this.updateEvent(eventId, { theme: proposal.theme_and_decor[0] });
    }

    return {
      event_id: eventId,
      budget_items_created: newBudgetItems.length,
      tasks_created: newTasks.length,
      vendors_created: newVendors.length,
      message: "AI Blueprint successfully committed to local storage!",
    };
  },

  // ==========================================================================
  // CONVERSATIONAL ASSISTANT OPERATIONS
  // ==========================================================================
  async sendAssistantMessage(
    eventId: string,
    prompt: string,
    _forceFallback: boolean = false
  ): Promise<AssistantResponse> {
    // Artificial smooth processing simulation for optimal UX feedback
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Resolve event and budget details safely
    let event: Event;
    try {
      event = await this.getEvent(eventId);
    } catch {
      event = {
        id: eventId,
        user_id: "demo-planner-001",
        name: "My Event",
        event_type: "wedding",
        event_date: "2026-12-31T00:00:00.000Z",
        location: "Main Venue",
        total_budget: 10000,
        expected_guest_count: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    let budgetSummary: BudgetSummary;
    try {
      budgetSummary = await this.getBudgetSummary(eventId);
    } catch {
      budgetSummary = {
        total_budget: event.total_budget || 10000,
        currency: event.currency || "USD",
        total_estimated: 0,
        total_actual: 0,
        remaining_budget: event.total_budget || 10000,
        cost_per_guest: 0,
        utilization_percentage: 0,
        is_overspent: false,
        overspent_amount: 0,
        items_by_category: {},
        items: [],
      };
    }

    const chatKey = STORAGE_KEYS.CHAT_PREFIX + eventId;
    const history = getStored<AssistantMessageLog[]>(chatKey, []);

    // 1. Log user message
    const userMsg: AssistantMessageLog = {
      id: generateId("msg"),
      event_id: eventId,
      user_id: "demo-planner-001",
      role: "user",
      content: prompt,
      created_at: new Date().toISOString(),
    };
    history.push(userMsg);

    // 2. Live Groq Assistant via Backend or Direct Groq Cloud
    if (!_forceFallback) {
      // 2a. Try Backend
      try {
        const res = await apiClient.post<AssistantResponse>(
          `/events/${eventId}/assistant`,
          {
            prompt,
            event_context: event,
            budget_items: budgetSummary.items,
            tasks: getTasksFromStorage().filter((t) => t.event_id === eventId),
            vendors: getVendorsFromStorage().filter((v) => v.event_id === eventId),
            force_fallback: false,
          },
          { timeout: 12000 }
        );
        if (res.data && res.data.reply) {
          if (res.data.proposal_id && res.data.proposed_changes) {
            const stagedProposals = getStored<Record<string, { proposal: ProposedChanges; eventId: string }>>(
              STORAGE_KEYS.STAGED_PROPOSALS,
              {}
            );
            stagedProposals[res.data.proposal_id] = { proposal: res.data.proposed_changes, eventId };
            setStored(STORAGE_KEYS.STAGED_PROPOSALS, stagedProposals);
          }
          const assistantMsg: AssistantMessageLog = {
            id: generateId("msg"),
            event_id: eventId,
            user_id: "demo-planner-001",
            role: "assistant",
            content: res.data.reply,
            proposal_id: res.data.proposal_id,
            created_at: new Date().toISOString(),
          };
          history.push(assistantMsg);
          setStored(chatKey, history);
          return res.data;
        }
      } catch {
        // Backend unavailable, fall back to direct Groq Cloud call
      }

      // 2b. Direct Groq Assistant
      try {
        const systemPrompt = `You are EventWise AI, an expert event planner assistant.
Help the user plan or modify their event.
If they ask for changes (budget changes, new tasks, vendor updates, guest count), return a valid JSON object with 'reply' and 'proposed_changes' and 'requires_confirmation': true.
If they are asking for ideas, suggestions, or general advice, return 'proposed_changes': null and 'requires_confirmation': false.
Categories for budget: venue, catering, photography, decoration, entertainment, invitations, transportation, equipment_rental, miscellaneous.

JSON schema:
{
  "reply": "Conversational explanation",
  "requires_confirmation": true/false,
  "proposed_changes": {
    "budget_adjustments": [{"category": "catering", "action": "increase", "amount": 500, "delta": 500, "reason": "reason"}],
    "task_additions": [{"title": "Task name", "category": "Coordination", "due_date": "2026-11-01T00:00:00Z", "priority": "high", "description": "details"}],
    "vendor_additions": [{"category": "photography", "item_name": "Photographer", "suggested_scope": "scope", "target_quote": 1200}],
    "event_updates": {"expected_guest_count": null, "total_budget": null, "theme": null}
  }
}`;

        const userPrompt = `Event: ${event?.name || "Event"} (${event?.event_type || "General"})
Total Budget: $${event?.total_budget ?? 10000}
Guests: ${event?.expected_guest_count ?? 50}
User Message: ${prompt}`;

        const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 1500,
          }),
        });

        if (groqResp.ok) {
          const data = await groqResp.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            let clean = content.trim();
            if (clean.startsWith("```json")) clean = clean.slice(7);
            if (clean.endsWith("```")) clean = clean.slice(0, -3);
            const parsed = JSON.parse(clean);
            const proposalId = parsed.requires_confirmation ? generateId("prop") : undefined;
            if (proposalId && parsed.proposed_changes) {
              const staged = getStored<Record<string, { proposal: ProposedChanges; eventId: string }>>(
                STORAGE_KEYS.STAGED_PROPOSALS,
                {}
              );
              staged[proposalId] = { proposal: parsed.proposed_changes, eventId };
              setStored(STORAGE_KEYS.STAGED_PROPOSALS, staged);
            }
            const assistantMsg: AssistantMessageLog = {
              id: generateId("msg"),
              event_id: eventId,
              user_id: "demo-planner-001",
              role: "assistant",
              content: parsed.reply,
              proposal_id: proposalId,
              created_at: new Date().toISOString(),
            };
            history.push(assistantMsg);
            setStored(chatKey, history);
            return {
              proposal_id: proposalId,
              reply: parsed.reply,
              proposed_changes: parsed.proposed_changes || undefined,
              requires_confirmation: Boolean(parsed.requires_confirmation),
              provider_used: "groq (openai/gpt-oss-20b)",
              is_fallback: false,
              created_at: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.warn("Direct Groq assistant error:", err);
      }
    }

    // 3. Client-Side Heuristic Fallback
    const lower = prompt.toLowerCase();

    let reply = "";
    let proposed_changes: ProposedChanges | undefined;
    let requires_confirmation = false;
    const proposal_id = generateId("prop");

    if (lower.includes("budget") || lower.includes("spend") || lower.includes("cost")) {
      reply = `You have planned $${(event?.total_budget ?? 10000).toLocaleString()} with $${(budgetSummary?.total_actual ?? 0).toLocaleString()} recorded in actual expenses ($${(budgetSummary?.remaining_budget ?? 10000).toLocaleString()} remaining). Would you like me to stage a budget reallocation across categories?`;
      if (lower.includes("increase") || lower.includes("decrease") || lower.includes("add")) {
        proposed_changes = {
          budget_adjustments: [
            {
              category: "catering",
              action: "increase",
              amount: 500,
              delta: 500,
              reason: "Adjustment requested in conversation",
            },
          ],
          task_additions: [],
          vendor_additions: [],
        };
        requires_confirmation = true;
        reply =
          "I have prepared a staged proposal to adjust your catering budget by $500. Click 'Confirm & Apply' below to commit these changes to your plan.";
      }
    } else if (lower.includes("task") || lower.includes("timeline") || lower.includes("deadline")) {
      proposed_changes = {
        budget_adjustments: [],
        task_additions: [
          {
            title: `Review: ${prompt.slice(0, 40)}`,
            category: "Coordination",
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: "high",
            description: "Generated from Copilot conversation request.",
          },
        ],
        vendor_additions: [],
      };
      requires_confirmation = true;
      reply =
        "I have staged a new milestone task based on your request. Please review the details below and confirm to add it to your timeline.";
    } else {
      reply = `I am your EventWise Copilot for **${event?.name || "your event"}**. I can help you reallocate budget items, add milestone tasks, track vendor quotes, or reschedule deadlines. What would you like to adjust?`;
    }

    if (proposed_changes && proposal_id) {
      const stagedProposals = getStored<Record<string, { proposal: ProposedChanges; eventId: string }>>(
        STORAGE_KEYS.STAGED_PROPOSALS,
        {}
      );
      stagedProposals[proposal_id] = { proposal: proposed_changes, eventId };
      setStored(STORAGE_KEYS.STAGED_PROPOSALS, stagedProposals);
    }

    const assistantMsg: AssistantMessageLog = {
      id: generateId("msg"),
      event_id: eventId,
      user_id: "demo-planner-001",
      role: "assistant",
      content: reply,
      proposal_id: requires_confirmation ? proposal_id : undefined,
      created_at: new Date().toISOString(),
    };
    history.push(assistantMsg);
    setStored(chatKey, history);

    return {
      proposal_id: requires_confirmation ? proposal_id : undefined,
      reply,
      proposed_changes,
      requires_confirmation,
      provider_used: "deterministic-copilot",
      is_fallback: true,
      created_at: new Date().toISOString(),
    };
  },

  async confirmAssistantProposal(
    eventId: string,
    proposalId: string,
    confirmed: boolean = true
  ): Promise<AssistantConfirmResponse> {
    const stagedProposals = getStored<
      Record<string, { proposal: ProposedChanges; eventId: string }>
    >(STORAGE_KEYS.STAGED_PROPOSALS, {});
    const staged = stagedProposals[proposalId];

    if (!confirmed || !staged) {
      if (stagedProposals[proposalId]) {
        delete stagedProposals[proposalId];
        setStored(STORAGE_KEYS.STAGED_PROPOSALS, stagedProposals);
      }
      return {
        proposal_id: proposalId,
        applied: false,
        message: "Proposal was dismissed.",
        budget_items_affected: 0,
        tasks_created: 0,
        vendors_created: 0,
        event_updated: false,
      };
    }

    const { proposal } = staged;
    let budgetAffected = 0;
    let tasksCreated = 0;
    let vendorsCreated = 0;

    // 1. Apply budget adjustments
    if (proposal.budget_adjustments && proposal.budget_adjustments.length > 0) {
      const budgetItems = getBudgetItemsFromStorage();
      proposal.budget_adjustments.forEach((adj) => {
        const existing = budgetItems.find(
          (b) => b.event_id === eventId && b.category === adj.category
        );
        if (existing) {
          existing.estimated_amount = Math.max(0, existing.estimated_amount + adj.delta);
          existing.updated_at = new Date().toISOString();
          budgetAffected++;
        } else {
          budgetItems.push({
            id: generateId("bgt"),
            event_id: eventId,
            user_id: "demo-planner-001",
            category: adj.category,
            item_name: `${adj.category.toUpperCase()} Reallocation`,
            estimated_amount: Math.max(0, adj.amount),
            actual_amount: 0,
            status: "planned",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          budgetAffected++;
        }
      });
      setStored(STORAGE_KEYS.BUDGET_ITEMS, budgetItems);
    }

    // 2. Apply task additions
    if (proposal.task_additions && proposal.task_additions.length > 0) {
      const currentTasks = getTasksFromStorage();
      proposal.task_additions.forEach((t) => {
        currentTasks.push({
          id: generateId("tsk"),
          event_id: eventId,
          user_id: "demo-planner-001",
          title: t.title,
          category: t.category,
          due_date: t.due_date,
          priority: t.priority,
          status: "pending",
          dependencies: [],
          description: t.description || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        tasksCreated++;
      });
      setStored(STORAGE_KEYS.TASKS, currentTasks);
    }

    // 3. Apply vendor additions
    if (proposal.vendor_additions && proposal.vendor_additions.length > 0) {
      const currentVendors = getVendorsFromStorage();
      proposal.vendor_additions.forEach((v) => {
        currentVendors.push({
          id: generateId("vnd"),
          event_id: eventId,
          user_id: "demo-planner-001",
          category: v.category,
          item_name: v.item_name,
          quotation_amount: v.target_quote,
          booking_status: "not_started",
          payment_status: "unpaid",
          notes: v.suggested_scope,
          contact_info: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        vendorsCreated++;
      });
      setStored(STORAGE_KEYS.VENDORS, currentVendors);
    }

    // 4. Remove from staged
    delete stagedProposals[proposalId];
    setStored(STORAGE_KEYS.STAGED_PROPOSALS, stagedProposals);

    return {
      proposal_id: proposalId,
      applied: true,
      message: "Proposed modifications successfully confirmed and saved to localStorage!",
      budget_items_affected: budgetAffected,
      tasks_created: tasksCreated,
      vendors_created: vendorsCreated,
      event_updated: false,
    };
  },

  async getAssistantHistory(eventId: string, _limit: number = 50): Promise<AssistantMessageLog[]> {
    const chatKey = STORAGE_KEYS.CHAT_PREFIX + eventId;
    return getStored<AssistantMessageLog[]>(chatKey, []);
  },
};
