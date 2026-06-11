import { supabase } from '@/lib/supabase'
import type { ActivityAction, EntityType } from '@/types/database'

export async function logActivity(
  entityType: EntityType,
  entityId: string,
  action: ActivityAction,
  snapshot?: Record<string, unknown>
) {
  await supabase.rpc('log_activity', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action: action,
    p_snapshot: snapshot ?? null,
  })
}
