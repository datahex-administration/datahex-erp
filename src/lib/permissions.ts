export const MODULES = {
  COMPANIES: "companies",
  USERS: "users",
  EMPLOYEES: "employees",
  SALARY: "salary",
  LEAVES: "leaves",
  PROJECTS: "projects",
  CLIENTS: "clients",
  INVOICES: "invoices",
  EXPENSES: "expenses",
  SUBSCRIPTIONS: "subscriptions",
  MESSAGES: "messages",
  REPORTS: "reports",
  ATTENDANCE: "attendance",
  BUGS: "bugs",
  SETTINGS: "settings",
} as const;

export const ACTIONS = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  APPROVE: "approve",
  EXPORT: "export",
} as const;

export type Module = (typeof MODULES)[keyof typeof MODULES];
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

export function perm(module: Module, action: Action): string {
  return `${module}:${action}`;
}

// Predefined role permission sets
export const ROLE_PERMISSIONS = {
  super_admin: ["*"],
  manager: [
    perm(MODULES.EMPLOYEES, ACTIONS.READ),
    perm(MODULES.EMPLOYEES, ACTIONS.CREATE),
    perm(MODULES.EMPLOYEES, ACTIONS.UPDATE),
    perm(MODULES.SALARY, ACTIONS.READ),
    perm(MODULES.SALARY, ACTIONS.CREATE),
    perm(MODULES.SALARY, ACTIONS.APPROVE),
    perm(MODULES.LEAVES, ACTIONS.READ),
    perm(MODULES.LEAVES, ACTIONS.APPROVE),
    perm(MODULES.PROJECTS, ACTIONS.READ),
    perm(MODULES.PROJECTS, ACTIONS.CREATE),
    perm(MODULES.PROJECTS, ACTIONS.UPDATE),
    perm(MODULES.CLIENTS, ACTIONS.READ),
    perm(MODULES.CLIENTS, ACTIONS.CREATE),
    perm(MODULES.CLIENTS, ACTIONS.UPDATE),
    perm(MODULES.INVOICES, ACTIONS.READ),
    perm(MODULES.INVOICES, ACTIONS.CREATE),
    perm(MODULES.INVOICES, ACTIONS.UPDATE),
    perm(MODULES.EXPENSES, ACTIONS.READ),
    perm(MODULES.EXPENSES, ACTIONS.CREATE),
    perm(MODULES.EXPENSES, ACTIONS.APPROVE),
    perm(MODULES.SUBSCRIPTIONS, ACTIONS.READ),
    perm(MODULES.SUBSCRIPTIONS, ACTIONS.CREATE),
    perm(MODULES.SUBSCRIPTIONS, ACTIONS.UPDATE),
    perm(MODULES.MESSAGES, ACTIONS.READ),
    perm(MODULES.MESSAGES, ACTIONS.CREATE),
    perm(MODULES.REPORTS, ACTIONS.READ),
    perm(MODULES.REPORTS, ACTIONS.CREATE),
    perm(MODULES.REPORTS, ACTIONS.EXPORT),
    perm(MODULES.ATTENDANCE, ACTIONS.READ),
    perm(MODULES.ATTENDANCE, ACTIONS.CREATE),
    perm(MODULES.BUGS, ACTIONS.READ),
    perm(MODULES.BUGS, ACTIONS.CREATE),
    perm(MODULES.BUGS, ACTIONS.UPDATE),
    perm(MODULES.BUGS, ACTIONS.DELETE),
    perm(MODULES.USERS, ACTIONS.READ),
    perm(MODULES.USERS, ACTIONS.CREATE),
    perm(MODULES.USERS, ACTIONS.UPDATE),
    perm(MODULES.SETTINGS, ACTIONS.READ),
  ],
  staff: [
    perm(MODULES.EMPLOYEES, ACTIONS.READ),
    perm(MODULES.LEAVES, ACTIONS.READ),
    perm(MODULES.LEAVES, ACTIONS.CREATE),
    perm(MODULES.PROJECTS, ACTIONS.READ),
    perm(MODULES.MESSAGES, ACTIONS.READ),
    perm(MODULES.MESSAGES, ACTIONS.CREATE),
    perm(MODULES.REPORTS, ACTIONS.READ),
    perm(MODULES.REPORTS, ACTIONS.CREATE),
    perm(MODULES.ATTENDANCE, ACTIONS.READ),
    perm(MODULES.ATTENDANCE, ACTIONS.CREATE),
    perm(MODULES.BUGS, ACTIONS.READ),
    perm(MODULES.BUGS, ACTIONS.CREATE),
    perm(MODULES.BUGS, ACTIONS.UPDATE),
  ],
  customer_success: [
    perm(MODULES.EMPLOYEES, ACTIONS.READ),
    perm(MODULES.LEAVES, ACTIONS.READ),
    perm(MODULES.LEAVES, ACTIONS.CREATE),
    perm(MODULES.PROJECTS, ACTIONS.READ),
    perm(MODULES.MESSAGES, ACTIONS.READ),
    perm(MODULES.MESSAGES, ACTIONS.CREATE),
    perm(MODULES.REPORTS, ACTIONS.READ),
    perm(MODULES.REPORTS, ACTIONS.CREATE),
    perm(MODULES.ATTENDANCE, ACTIONS.READ),
    perm(MODULES.ATTENDANCE, ACTIONS.CREATE),
    perm(MODULES.BUGS, ACTIONS.READ),
    perm(MODULES.BUGS, ACTIONS.CREATE),
    perm(MODULES.BUGS, ACTIONS.UPDATE),
  ],
} as const;

export type RoleName = keyof typeof ROLE_PERMISSIONS;

export function getRolePermissions(role: RoleName): string[] {
  return [...ROLE_PERMISSIONS[role]];
}

export const ALL_PERMISSIONS: string[] = Object.values(MODULES).flatMap(
  (mod) => Object.values(ACTIONS).map((act) => perm(mod as Module, act as Action))
);
