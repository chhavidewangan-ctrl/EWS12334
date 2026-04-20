# Refactoring Guide: Feature-Based Architecture

We have refactored the `Employees` module as a blueprint for the rest of the application. This new structure improves scalability, maintainability, and code reuse.

## 🏗️ Architecture Overview

The project is now divided into four distinct layers:

1.  **Routing Layer (`src/app/`)**: Handles only routing and page definition. No business logic.
2.  **Feature Layer (`src/features/`)**: Contains all logic and UI specific to a feature (e.g., Employees).
3.  **UI Component Layer (`src/components/ui/`)**: Reusable, atomic UI elements (Buttons, Inputs, Modals).
4.  **Logic Layer (`src/hooks/` & `src/services/`)**: Custom hooks for state/business logic and services for API communication.

---

## 📊 Before vs. After (Employees Module)

### 🔴 Before (Monolithic)
- `src/app/employees/page.js` (~1000 lines)
- Contained: State management, API calls, Form handling, Table UI, Modals, Styling.
- **Problem**: Extremely difficult to test, high risk of bugs when changing small UI parts, zero code reuse.

### 🟢 After (Modular)
- `src/app/employees/page.js` (5 lines) - Just routes to the feature.
- `src/features/employees/`
    - `EmployeesPage.jsx`: Orchestrates the feature.
    - `EmployeeList.jsx`: Purely for displaying the table.
    - `EmployeeFilters.jsx`: Handles search/filter UI.
- `src/hooks/useEmployees.js`: Manages fetching, filtering, and data mutations.
- **Benefit**: Each part is small (<150 lines), testable, and reusable.

---

## 📂 Final Folder Structure

```text
src/
├── app/                      # Routing Layer
│   └── employees/
│       └── page.js           # Lightweight wrapper
├── components/
│   └── ui/                   # Global Reusable Components
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Modal.jsx
│       └── Badge.jsx
├── features/                 # Modular Features
│   └── employees/
│       ├── EmployeesPage.jsx # Entry Point
│       ├── EmployeeList.jsx  # Table/Grid
│       └── EmployeeFilters.jsx
├── hooks/                    # Reusable Logic
│   └── useEmployees.js       # Business logic hook
└── services/                 # API Layer
    └── api.js                # Core API configuration
```

---

## 🚀 How to Refactor Other Modules

Follow this pattern for **Clients**, **Invoices**, **Payroll**, etc.:

1.  **Extract Components**: Move common patterns (headers, tables) from the `page.js` into atomic components in `src/components/ui/`.
2.  **Create Custom Hook**: Move `useState` and `useEffect` logic from the `page.js` into a hook like `useClients.js`.
3.  **Build Feature Components**: Create a folder in `src/features/[moduleName]` and split the page into `List`, `Form`, `Filters`, etc.
4.  **Simplify Page**: Update `src/app/[moduleName]/page.js` to simply render your new `[ModuleName]Page` component.

> [!TIP]
> This structure makes it very easy to implement the future **Plugin System** because you can now export/import entire feature folders without worrying about routing or global state conflicts.
