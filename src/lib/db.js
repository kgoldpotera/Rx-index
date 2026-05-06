import Dexie from 'dexie';

export const db = new Dexie('RxIndexLocalDB');

// Define the local schema. We use the Supabase UUIDs ('id') as the primary keys.
db.version(1).stores({
  students: 'id, reg_no, first_name, last_name', // Indexes for fast searching
  prescriptions: 'id, student_id, status',
  syncQueue: '++id, operation, payload, timestamp' // For future offline writes
});
