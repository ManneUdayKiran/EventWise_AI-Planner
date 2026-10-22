/**
 * Domain entity types for EventWise AI
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export type EventType =
  | "wedding"
  | "birthday"
  | "community"
  | "corporate"
  | "conference"
  | "anniversary"
  | "concert"
  | "party"
  | "hackathon"
  | "gala"
  | "other"
  | (string & {});
export type EventStatus = "draft" | "planning" | "ready" | "completed" | "archived";


export interface EventSummaryStats {
  budget_allocated: number;
  budget_spent: number;
  budget_remaining: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  task_progress_percentage: number;
  total_vendors: number;
  booked_vendors: number;
}

export interface Event {
  id: string;
  user_id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  location: string;
  expected_guest_count: number;
  total_budget: number;
  currency: string;
  theme?: string;
  preferences?: string;
  special_requirements?: string;
  status: EventStatus;
  stats?: EventSummaryStats;
  created_at: string;
  updated_at: string;
}

export type BudgetCategory =
  | "venue"
  | "catering"
  | "photography"
  | "decoration"
  | "entertainment"
  | "invitations"
  | "transportation"
  | "equipment_rental"
  | "miscellaneous";

export interface BudgetItem {
  id: string;
  event_id: string;
  user_id: string;
  category: BudgetCategory;
  item_name: string;
  estimated_amount: number;
  actual_amount: number;
  notes?: string;
  status: "planned" | "committed" | "paid";
  created_at: string;
  updated_at: string;
}

export interface BudgetSummary {
  total_budget: number;
  currency: string;
  total_estimated: number;
  total_actual: number;
  remaining_budget: number;
  cost_per_guest: number;
  utilization_percentage: number;
  is_overspent: boolean;
  overspent_amount: number;
  items_by_category: Record<string, { estimated: number; actual: number; count: number }>;
  items: BudgetItem[];
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed";

export interface Task {
  id: string;
  event_id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  is_overdue?: boolean;
  created_at: string;
  updated_at: string;
}

export type VendorCategory =
  | "venue"
  | "catering"
  | "photography"
  | "decoration"
  | "entertainment"
  | "invitations"
  | "transportation"
  | "equipment_rental";

export type BookingStatus = "not_started" | "contacted" | "quoted" | "booked" | "cancelled";
export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

export interface VendorItem {
  id: string;
  event_id: string;
  user_id: string;
  category: VendorCategory;
  item_name: string;
  quotation_amount: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  notes?: string;
  contact_info?: string;
  created_at: string;
  updated_at: string;
}

export interface AIBudgetItemProposal {
  category: BudgetCategory;
  item_name: string;
  estimated_amount: number;
  notes?: string;
}

export interface AITaskProposal {
  title: string;
  category: string;
  days_before_event: number;
  priority: TaskPriority;
  description?: string;
}

export interface AIVendorCategoryProposal {
  category: VendorCategory;
  item_name: string;
  suggested_scope: string;
  estimated_budget?: number;
}

export interface AIPlanProposal {
  event_id: string;
  summary: string;
  theme_and_decor: string[];
  food_recommendations: string[];
  entertainment_suggestions: string[];
  budget_allocations: AIBudgetItemProposal[];
  planning_tasks: AITaskProposal[];
  vendor_categories: AIVendorCategoryProposal[];
  personalized_recommendations: string[];
  provider_used: string;
  is_fallback: boolean;
  total_proposed_budget: number;
  created_at?: string;
}

export interface AIApplyPlanResponse {
  event_id: string;
  budget_items_created: number;
  tasks_created: number;
  vendors_created: number;
  message: string;
}

export interface BudgetAdjustmentDiff {
  category: BudgetCategory;
  action: "decrease" | "increase" | "reallocate" | "set";
  target_category?: BudgetCategory;
  amount: number;
  delta: number;
  reason?: string;
}

export interface TaskAdditionDiff {
  title: string;
  category: string;
  due_date: string;
  priority: TaskPriority;
  description?: string;
}

export interface VendorAdditionDiff {
  category: VendorCategory;
  item_name: string;
  suggested_scope: string;
  target_quote: number;
}

export interface EventUpdateDiff {
  expected_guest_count?: number;
  total_budget?: number;
  theme?: string;
}

export interface ProposedChanges {
  budget_adjustments: BudgetAdjustmentDiff[];
  task_additions: TaskAdditionDiff[];
  vendor_additions: VendorAdditionDiff[];
  event_updates?: EventUpdateDiff;
}

export interface AssistantResponse {
  proposal_id?: string;
  reply: string;
  proposed_changes?: ProposedChanges;
  requires_confirmation: boolean;
  provider_used: string;
  is_fallback: boolean;
  created_at?: string;
}

export interface AssistantConfirmResponse {
  proposal_id: string;
  applied: boolean;
  message: string;
  budget_items_affected: number;
  tasks_created: number;
  vendors_created: number;
  event_updated: boolean;
}

export interface AssistantMessageLog {
  id: string;
  event_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  proposal_id?: string;
  created_at: string;
}

