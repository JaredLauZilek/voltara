// Public API for the customers feature.
// Other features must import only from this barrel — never reach into internals.
export { CustomersScreen } from './CustomersScreen';
export { CustomerPicker } from './CustomerPicker';
export { useCustomers, useCustomersWithStats } from './hooks';
export type { Customer, CustomerWithStats } from './types';
