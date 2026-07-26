import { requireSocialContext } from '~/server/utils/social-context'

/**
 * Lists the approval workflows available to the current tenant: the shared
 * system templates plus any org/tenant-specific workflows, each with its stages.
 */
export default defineEventHandler(async (event) => {
  const context = await requireSocialContext(event, 'marketing.social.read')
  const client = context.client

  const { data: systemWorkflows } = await client
    .from('social_approval_workflows')
    .select('*')
    .eq('is_system', true)
    .eq('is_active', true)

  const { data: tenantWorkflows } = await client
    .from('social_approval_workflows')
    .select('*')
    .eq('tenant_id', context.tenantId)
    .eq('is_active', true)

  let orgWorkflows: any[] = []
  if (context.workspace.organization?.id) {
    const { data } = await client
      .from('social_approval_workflows')
      .select('*')
      .eq('organization_id', context.workspace.organization.id)
      .is('tenant_id', null)
      .eq('is_active', true)
    orgWorkflows = data || []
  }

  const merged = new Map<string, any>()
  for (const workflow of [...(systemWorkflows || []), ...orgWorkflows, ...(tenantWorkflows || [])])
    merged.set(String(workflow.id), workflow)

  const workflowIds = [...merged.keys()]
  const stagesByWorkflow = new Map<string, any[]>()
  if (workflowIds.length) {
    const { data: stages } = await client
      .from('social_approval_workflow_stages')
      .select('*')
      .in('workflow_id', workflowIds)
      .order('position', { ascending: true })
    for (const stage of stages || []) {
      const key = String(stage.workflow_id)
      if (!stagesByWorkflow.has(key))
        stagesByWorkflow.set(key, [])
      stagesByWorkflow.get(key)!.push(stage)
    }
  }

  const { data: settings } = await client
    .from('social_approval_settings')
    .select('tenant_id, requires_internal_review, default_workflow_id, allow_no_approval_workflow')
    .eq('tenant_id', context.tenantId)
    .maybeSingle()

  const data = [...merged.values()].map(workflow => ({
    ...workflow,
    stages: (stagesByWorkflow.get(String(workflow.id)) || [])
      .slice()
      .sort((a, b) => Number(a.position) - Number(b.position)),
  }))

  return { data, settings: settings || null }
})
