import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'restaurant-assets'
const FOLDER = 'images'

Deno.serve(async (req) => {
  // 1. Setup Supabase Client using Environment Secrets
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  console.log("Janitor: Starting daily storage audit...")

  try {
    // 2. List all files in the 'images' folder (Up to 1000 files)
    const { data: storageFiles, error: listError } = await supabase
      .storage
      .from(BUCKET)
      .list(FOLDER, { limit: 1000 })

    if (listError) throw listError
    if (!storageFiles || storageFiles.length === 0) {
      return new Response("Janitor: No files found in storage. Cleaning skipped.")
    }

    // 3. Get all active image URLs from your Menu Items and Restaurant Info
    const { data: menuItems } = await supabase.from('menu_items').select('image_url')
    const { data: restaurant } = await supabase.from('restaurant').select('logo_url').single()

    // Combine all URLs into one searchable string
    const activeUrls = [
      ...(menuItems?.map(i => i.image_url) || []),
      restaurant?.logo_url
    ].filter(Boolean).join(' ')

    // 4. Identify Orphans
    // We check if the filename (e.g., "test-123.webp") exists anywhere in the active URL string
    const orphans = storageFiles
      .filter(file => {
        // Skip system files or empty placeholders
        if (!file.name || file.name === '.emptyFolderPlaceholder') return false;
        
        // If the filename is NOT found in any active database URL, it's an orphan
        const isUsed = activeUrls.includes(file.name);
        return !isUsed;
      })
      .map(file => `${FOLDER}/${file.name}`);

    // 5. Execute Deletion
    if (orphans.length > 0) {
      console.log(`Janitor: Found ${orphans.length} orphan files. Deleting now...`)
      
      const { data, error: deleteError } = await supabase
        .storage
        .from(BUCKET)
        .remove(orphans)

      if (deleteError) throw deleteError

      return new Response(`Janitor Success: Deleted ${orphans.length} unused images.`, { status: 200 })
    }

    return new Response("Janitor: Storage is already 100% clean.", { status: 200 })

  } catch (e: any) {
    console.error("Janitor Error:", e.message)
    return new Response(`Janitor Error: ${e.message}`, { status: 500 })
  }
})
