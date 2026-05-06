<script>
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabaseClient';
    import { db } from '$lib/db';

    let { children } = $props();

    async function processSyncQueue() {
        // Only attempt sync if the browser detects an active connection
        if (!navigator.onLine) return;

        try {
            const queue = await db.syncQueue.toArray();
            if (queue.length === 0) return; // Nothing to sync

            console.log(`Starting background sync for ${queue.length} items...`);

            for (const item of queue) {
                let error = null;

                if (item.operation === 'INSERT_STUDENT') {
                    const { error: sbError } = await supabase.from('students').insert([item.payload]);
                    error = sbError;
                } else if (item.operation === 'INSERT_PRESCRIPTION') {
                    const { error: sbError } = await supabase.from('prescriptions').insert([item.payload]);
                    error = sbError;
                }

                // If successful (or if the record already exists), remove it from the local queue
                if (!error || error.code === '23505') { // 23505 is PostgreSQL unique violation (already synced)
                    await db.syncQueue.delete(item.id);
                    console.log(`Successfully synced and cleared item ${item.id}`);
                } else {
                    console.error(`Failed to sync item ${item.id}:`, error);
                }
            }
        } catch (err) {
            console.error("Critical error in Sync Engine:", err);
        }
    }

    onMount(() => {
        // Attempt sync on initial app load
        processSyncQueue();

        // Listen for the browser's native 'online' event
        window.addEventListener('online', processSyncQueue);

        return () => {
            window.removeEventListener('online', processSyncQueue);
        };
    });
</script>

{@render children()}
